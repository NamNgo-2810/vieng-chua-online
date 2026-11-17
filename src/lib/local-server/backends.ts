"use client";

/**
 * Presence, chat and merit backends for local mode, over one LocalLink.
 * Same interfaces as the Firebase and offline backends, so the store does not
 * care which one it has. The server (src/server/local-hub.ts) checks every action.
 */

import type { Player, Direction } from "@/lib/types";
import type { ActivityId } from "@/config/activities";
import type { AreaId } from "@/config/areas";
import { resolveAppearance } from "@/config/appearances";
import { playerSchema } from "@/lib/validation";
import { parseIncoming, type ChatMessage } from "@/lib/chat-core";
import { normalizeMerit } from "@/lib/merit-core";
import type { IPresence, JoinOptions, PresenceCallbacks } from "@/lib/presence-types";
import type { ChatCallbacks, IChat } from "@/lib/chat-types";
import type { IMerit, MeritCallbacks } from "@/lib/merit-types";
import type { EmoteId } from "@/config/emotes";
import { purityFlagFor } from "@/config/purity";
import type { NoteKind } from "@/config/notes";
import { NOTE_KINDS } from "@/config/notes";
import { parseNote, type Note } from "@/lib/notes-core";
import type { INotes, NotesCallbacks } from "@/lib/notes-types";
import type { LocalLink } from "./link";

const POSITION_SYNC_MS = 120; // same pace as the Firebase backend

export class LocalServerPresence implements IPresence {
  private local: Player | null = null;
  private pendingPos: { x: number; y: number; dir: Direction } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private unsubs: (() => void)[] = [];
  private onPageHide = () => this.link.beaconLeave();
  /** True during an area change: moves from the old area are ignored. */
  private changingArea = false;

  constructor(private link: LocalLink, private cbs: PresenceCallbacks) {}

  async authenticate(): Promise<string> {
    this.cbs.onConnection("authenticating");
    try {
      return await this.link.hello();
    } catch (err) {
      this.cbs.onConnection("error", "Không kết nối được máy chủ trong mạng nội bộ.");
      throw err;
    }
  }

  async join(opts: JoinOptions): Promise<void> {
    const r = await this.link.post<{ player: Player }>("join", {
      displayName: opts.displayName,
      role: opts.role,
      appearance: resolveAppearance(opts.role, opts.appearance),
    });
    this.local = { ...r.player };
    this.unsubs.push(
      this.link.on("players", (data) => {
        const raw = (data ?? {}) as Record<string, unknown>;
        const players: Record<string, Player> = {};
        for (const [id, node] of Object.entries(raw)) {
          const parsed = playerSchema.safeParse(node);
          if (parsed.success) players[id] = parsed.data;
        }
        // Our own position/activity are ours to drive: keep the local copy.
        if (this.local && players[this.local.sessionId]) players[this.local.sessionId] = { ...this.local };
        this.cbs.onPlayers(players);
      }),
      this.link.on("takenOver", () => this.cbs.onTakenOver()),
      this.link.on("gone", () => this.cbs.onConnection("error", "Phiên đã hết hạn. Hãy tải lại trang.")),
      this.link.onStatus((s) => this.cbs.onConnection(s))
    );
    this.link.open();
    this.timer = setInterval(() => this.flush(), POSITION_SYNC_MS);
    // Closing or leaving the tab removes us at once for everyone else.
    if (typeof window !== "undefined") window.addEventListener("pagehide", this.onPageHide);
  }

  private flush() {
    const p = this.pendingPos;
    if (!p) return;
    this.pendingPos = null;
    void this.link.tryPost("move", { x: p.x, y: p.y, dir: p.dir });
  }

  async changeActivity(activity: ActivityId): Promise<boolean> {
    if (!this.local) return false;
    const pos = this.pendingPos ?? { x: this.local.positionX, y: this.local.positionY, dir: this.local.direction };
    this.pendingPos = null;
    const ok = await this.link.tryPost("activity", { activity, x: pos.x, y: pos.y, dir: pos.dir });
    if (!ok) return false;
    Object.assign(this.local, { currentActivity: activity, activityStartedAt: Date.now() });
    const flag = purityFlagFor(activity);
    if (flag) this.local[flag] = true;
    return true;
  }

  /** The server picks the arrival point (the gate's), so the suggested x/y/dir are not sent. */
  async changeArea(area: AreaId, _x: number, _y: number, _dir: Direction, fly = false): Promise<boolean> {
    if (!this.local) return false;
    // Moves made while the change is in flight belong to the old area; sending
    // them afterwards would place us at old coordinates in the new area.
    this.changingArea = true;
    this.pendingPos = null;
    try {
      const r = await this.link.post<{ x: number; y: number; dir: Direction }>("area", { area, ...(fly ? { fly: true } : {}) });
      Object.assign(this.local, { area, positionX: r.x, positionY: r.y, direction: r.dir, currentActivity: "WALKING", activityStartedAt: Date.now() });
      return true;
    } catch {
      return false;
    } finally {
      this.pendingPos = null;
      this.changingArea = false;
    }
  }

  async emote(emote: EmoteId): Promise<boolean> {
    if (!this.local) return false;
    const ok = await this.link.tryPost("emote", { emote });
    if (ok) Object.assign(this.local, { emote, emoteAt: Date.now() });
    return ok;
  }

  move(x: number, y: number, dir: Direction): void {
    if (!this.local || this.changingArea) return;
    this.pendingPos = { x, y, dir };
    Object.assign(this.local, { positionX: x, positionY: y, direction: dir });
  }

  getSessionId(): string | null {
    return this.link.sessionId;
  }

  getLocal(): Player | null {
    return this.local ? { ...this.local } : null;
  }

  async leave(): Promise<void> {
    await this.link.tryPost("leave");
    this.dispose();
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof window !== "undefined") window.removeEventListener("pagehide", this.onPageHide);
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.link.close();
    this.local = null;
  }
}

export class LocalServerChat implements IChat {
  private unsubs: (() => void)[] = [];
  constructor(private link: LocalLink, private cbs: ChatCallbacks) {}

  start(): void {
    const take = (m: unknown) => {
      const node = m as Partial<ChatMessage>;
      const msg = typeof node?.id === "string" ? parseIncoming(node.id, node) : null;
      if (msg) this.cbs.onMessage(msg);
    };
    this.unsubs.push(
      this.link.on("chatHistory", (list) => (Array.isArray(list) ? list.forEach(take) : undefined)),
      this.link.on("chat", take)
    );
  }

  async send(_sessionId: string, _displayName: string, text: string): Promise<boolean> {
    return this.link.tryPost("chat", { text });
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}

export class LocalServerMerit implements IMerit {
  private unsubs: (() => void)[] = [];
  constructor(private link: LocalLink, private cbs: MeritCallbacks) {}

  start(): void {
    this.unsubs.push(
      this.link.on("merit", (m) => this.cbs.onMerit(normalizeMerit(m))),
      this.link.on("temple", (t) => this.cbs.onTemple(typeof t === "number" ? t : 0))
    );
  }

  /** The server decides the award itself; the browser's own decision is only a hint. */
  async award(_uid: string, activity: ActivityId): Promise<boolean> {
    return this.link.tryPost("award", { activity });
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}

export class LocalServerNotes implements INotes {
  private unsubs: (() => void)[] = [];
  constructor(private link: LocalLink, private cbs: NotesCallbacks) {}

  start(): void {
    const take = (n: unknown) => {
      const node = n as Partial<Note>;
      if (typeof node?.id !== "string" || !NOTE_KINDS.includes(node.kind as NoteKind)) return;
      const note = parseNote(node.id, node.kind as NoteKind, node);
      if (note) this.cbs.onNote(note);
    };
    this.unsubs.push(
      this.link.on("notesHistory", (list) => (Array.isArray(list) ? list.forEach(take) : undefined)),
      this.link.on("note", take)
    );
  }

  async add(kind: NoteKind, _sessionId: string, _displayName: string, text: string): Promise<boolean> {
    return this.link.tryPost("note", { kind, text });
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}
