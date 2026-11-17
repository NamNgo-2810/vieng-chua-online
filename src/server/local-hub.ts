/**
 * The local temple server (SERVER ONLY): shared state for "local" backend mode,
 * when friends play through this machine's IP instead of Firebase.
 *
 * It is authoritative — every action is checked with the same rules the game
 * uses (permissions, ritual spots, area unlocks, chat filter and gap, merit
 * cooldowns/cap), so a friend's browser cannot fake merit or skip a gate.
 * Pure apart from the injected clock, id source and `save` callback, so it is
 * unit-tested without a server (tests/local-hub.test.ts).
 *
 * Identity: each browser keeps a private `secret`; its merit is stored under a
 * hash of it. Each visit gets a public sessionId (shown to others) and a
 * private token (proves which visit an action belongs to).
 */

import { createHash, randomUUID } from "node:crypto";
import type { Player, Direction } from "@/lib/types";
import type { RoleId } from "@/config/roles";
import { isRoleId } from "@/config/roles";
import { isActivityId, type ActivityId } from "@/config/activities";
import { canPerform, DEFAULT_ACTIVITY } from "@/config/permissions";
import { resolveAppearance } from "@/config/appearances";
import { AREAS, ENTRY, areaOf, isAreaId, type AreaId } from "@/config/areas";
import { isPurified, purityFlagFor } from "@/config/purity";
import { CLOUD } from "@/config/journey";
import { landingFor } from "@/config/areas";
import { walkMapFor } from "@/game/placement";
import { spotsIn } from "@/config/ritual-spots";
import { MERIT } from "@/config/merit";
import { MILESTONES } from "@/config/milestones";
import { nearestSpot, activityAllowedAt, findSpawn } from "@/game/placement";
import { validateDisplayName, DISPLAY_NAME_MAX } from "@/lib/validation";
import { decideAward, normalizeMerit, type MeritState, type AwardExtras } from "@/lib/merit-core";
import { prepareOutgoing, type ChatMessage } from "@/lib/chat-core";
import { CHAT } from "@/config/chat";
import { TEMPLE } from "@/game/world";
import { isEmoteId, EMOTE_TIMING } from "@/config/emotes";
import { NOTE_KINDS, NOTES, type NoteKind } from "@/config/notes";
import { addNote, emptyNotes, isNoteKind, prepareNote, type Note, type NotesByKind } from "@/lib/notes-core";

/** What the hub saves between runs (data/temple.json). Players are not saved. */
export interface SavedState {
  templeMerit: number;
  merit: Record<string, MeritState>;
  chat: ChatMessage[];
  /** Guestbook and wish-tree notes (kept forever, last NOTES.keep per kind). */
  notes?: NotesByKind;
}

/** Something that can receive server events (one per open browser stream). */
export interface Client {
  sessionId: string;
  send(event: string, data: unknown): void;
}

interface Session {
  sessionId: string;
  token: string;
  meritKey: string;
  secretHash: string;
  player: Player | null;
  lastChatAt: number | null;
  lastNoteAt: Partial<Record<NoteKind, number>>;
  lastEmoteAt: number | null;
}

export interface HubOptions {
  now?: () => number;
  newId?: () => string;
  save?: (s: SavedState) => void;
  initial?: Partial<SavedState>;
  /** How long a visitor with no open stream stays before being removed. */
  graceMs?: number;
  /**
   * A visit ended without the browser saying goodbye: its stream was lost
   * ("lost") or a newer tab took over ("takenOver"). The browser records its own
   * LEAVE when it leaves on purpose, so that case is not reported here.
   */
  onVisitEnd?: (player: Player, reason: "lost" | "takenOver") => void;
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 24);

export class LocalHub {
  private now: () => number;
  private newId: () => string;
  private save: (s: SavedState) => void;
  private graceMs: number;
  private onVisitEnd: NonNullable<HubOptions["onVisitEnd"]>;
  private sessions = new Map<string, Session>();
  private clients = new Set<Client>();
  private removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private templeMerit: number;
  private merit: Record<string, MeritState>;
  private chat: ChatMessage[];
  private notes: NotesByKind = emptyNotes();
  private playersDirty = false;
  private playersTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: HubOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.newId = opts.newId ?? randomUUID;
    this.save = opts.save ?? (() => {});
    this.graceMs = opts.graceMs ?? 8000;
    this.onVisitEnd = opts.onVisitEnd ?? (() => {});
    this.templeMerit = Math.max(0, Number(opts.initial?.templeMerit) || 0);
    this.merit = Object.fromEntries(Object.entries(opts.initial?.merit ?? {}).map(([k, v]) => [k, normalizeMerit(v)]));
    this.chat = Array.isArray(opts.initial?.chat) ? opts.initial!.chat.slice(-CHAT.historySize) : [];
    for (const kind of NOTE_KINDS) {
      for (const n of opts.initial?.notes?.[kind] ?? []) if (isNoteKind(n?.kind)) this.notes = addNote(this.notes, n);
    }
  }

  // ---------------------------------------------------------------- sessions

  /** Start a visit for a browser secret. Returns its public id and private token. */
  hello(secret: unknown): Result<{ sessionId: string; token: string }> {
    if (typeof secret !== "string" || secret.length < 16 || secret.length > 200) return fail("bad secret");
    const secretHash = hash(secret);
    // One visit per browser: a new tab takes over from the old one.
    for (const s of this.sessions.values()) {
      if (s.secretHash === secretHash) {
        this.sendTo(s.sessionId, "takenOver", {});
        this.removeSession(s.sessionId, "takenOver");
      }
    }
    const session: Session = {
      sessionId: this.newId(),
      token: this.newId(),
      meritKey: hash(`merit:${secret}`),
      secretHash,
      player: null,
      lastChatAt: null,
      lastNoteAt: {},
      lastEmoteAt: null,
    };
    this.sessions.set(session.sessionId, session);
    return { ok: true, sessionId: session.sessionId, token: session.token };
  }

  private auth(sessionId: unknown, token: unknown): Session | null {
    if (typeof sessionId !== "string" || typeof token !== "string") return null;
    const s = this.sessions.get(sessionId);
    return s && s.token === token ? s : null;
  }

  /** Enter the temple: validated name, role and look; placed at the spawn. */
  join(sessionId: unknown, token: unknown, body: { displayName?: unknown; role?: unknown; appearance?: unknown }): Result<{ player: Player }> {
    const s = this.auth(sessionId, token);
    if (!s) return fail("unauthorized");
    if (!isRoleId(body.role)) return fail("bad role");
    const name = validateDisplayName(String(body.displayName ?? ""));
    if (!name.ok) return fail(name.error);
    if (name.value.length > DISPLAY_NAME_MAX) return fail("name too long");
    const now = this.now();
    // Visitors arrive at the Tam quan (config/areas.ts ENTRY).
    const spawn = findSpawn(Math.random, ENTRY.spawn, walkMapFor(ENTRY.area));
    s.player = {
      sessionId: s.sessionId,
      displayName: name.value,
      role: body.role as RoleId,
      appearance: resolveAppearance(body.role as RoleId, typeof body.appearance === "string" ? body.appearance : null),
      currentActivity: DEFAULT_ACTIVITY,
      activityStartedAt: now,
      area: ENTRY.area,
      positionX: spawn.x,
      positionY: spawn.y,
      direction: "down",
      joinedAt: now,
      lastActiveAt: now,
      isOnline: true,
    };
    this.playersChanged();
    return { ok: true, player: { ...s.player } };
  }

  /** Update position (client-driven movement; finite numbers inside the world). */
  move(sessionId: unknown, token: unknown, body: { x?: unknown; y?: unknown; dir?: unknown }): Result {
    const s = this.auth(sessionId, token);
    if (!s?.player) return fail("unauthorized");
    const pos = readPosition(body);
    if (!pos) return fail("bad position");
    Object.assign(s.player, { positionX: pos.x, positionY: pos.y, direction: pos.dir, lastActiveAt: this.now() });
    this.playersChanged();
    return { ok: true };
  }

  /** Change activity at a position: role permission + the spot that offers it. */
  activity(sessionId: unknown, token: unknown, body: { activity?: unknown; x?: unknown; y?: unknown; dir?: unknown }): Result {
    const s = this.auth(sessionId, token);
    if (!s?.player) return fail("unauthorized");
    if (!isActivityId(body.activity)) return fail("bad activity");
    const activity = body.activity as ActivityId;
    const pos = readPosition(body) ?? { x: s.player.positionX, y: s.player.positionY, dir: s.player.direction };
    if (!canPerform(s.player.role, activity)) return fail("not allowed for role");
    const spot = nearestSpot(pos.x, pos.y, spotsIn(areaOf(s.player)));
    if (!activityAllowedAt(activity, spot)) return fail("not at a place for this ritual");
    const now = this.now();
    const flag = purityFlagFor(activity);
    if (flag) s.player[flag] = true;
    Object.assign(s.player, {
      currentActivity: activity,
      activityStartedAt: now,
      positionX: pos.x,
      positionY: pos.y,
      direction: pos.dir,
      lastActiveAt: now,
    });
    this.playersChanged();
    return { ok: true };
  }

  /** Walk through a gate into another area (refused while the area is locked). */
  area(sessionId: unknown, token: unknown, body: { area?: unknown; fly?: unknown }): Result<{ x: number; y: number; dir: Direction }> {
    const s = this.auth(sessionId, token);
    if (!s?.player) return fail("unauthorized");
    if (!isAreaId(body.area)) return fail("bad area");
    const to = body.area as AreaId;
    const def = AREAS[to];
    if (def.unlock) {
      const threshold = MILESTONES.find((m) => m.id === def.unlock)?.threshold ?? Infinity;
      if (this.templeMerit < threshold) return fail("area locked");
    }
    if (def.requiresPurity && !isPurified(s.player)) return fail("not purified");
    // By gate from a neighbouring area, or by cân đẩu vân to any open one.
    let arrive;
    if (body.fly === true) {
      if ((this.merit[s.meritKey]?.total ?? 0) < CLOUD.minMerit) return fail("cloud locked");
      if (areaOf(s.player) === to) return fail("already here");
      arrive = landingFor(to);
    } else {
      const gate = AREAS[areaOf(s.player)].gates.find((g) => g.to === to);
      if (!gate) return fail("no gate");
      arrive = gate.arrive;
    }
    const now = this.now();
    Object.assign(s.player, {
      area: to,
      positionX: arrive.x,
      positionY: arrive.y,
      direction: arrive.facing,
      currentActivity: "WALKING",
      activityStartedAt: now,
      lastActiveAt: now,
    });
    this.playersChanged();
    return { ok: true, x: arrive.x, y: arrive.y, dir: arrive.facing };
  }

  /** Public chat: cleaned, masked, length-checked, one per CHAT.minGapMs. */
  sendChat(sessionId: unknown, token: unknown, body: { text?: unknown }): Result<{ message: ChatMessage }> {
    const s = this.auth(sessionId, token);
    if (!s?.player) return fail("unauthorized");
    const now = this.now();
    const prepared = prepareOutgoing(String(body.text ?? ""), s.lastChatAt, now);
    if (!prepared.ok) return fail(prepared.error);
    s.lastChatAt = now;
    const message: ChatMessage = { id: this.newId(), sessionId: s.sessionId, displayName: s.player.displayName, text: prepared.text, createdAt: now };
    this.chat = [...this.chat, message].slice(-CHAT.historySize);
    this.broadcast("chat", message);
    this.persist();
    return { ok: true, message };
  }

  /**
   * Award merit for the ritual the player is doing — decided here, not by the
   * browser: the ritual must be held MERIT.ritualMs at a spot offering it.
   */
  award(sessionId: unknown, token: unknown, body: { activity?: unknown }): Result<{ amount: number; bonus: number; extras: AwardExtras; merit: MeritState }> {
    const s = this.auth(sessionId, token);
    if (!s?.player) return fail("unauthorized");
    const p = s.player;
    if (!isActivityId(body.activity) || p.currentActivity !== body.activity) return fail("not doing that ritual");
    const now = this.now();
    if (now - (p.activityStartedAt ?? now) < MERIT.ritualMs) return fail("ritual not held long enough");
    const spot = nearestSpot(p.positionX, p.positionY, spotsIn(areaOf(p)));
    if (!activityAllowedAt(p.currentActivity, spot)) return fail("not at the ritual's place");
    // Đồng tu: others in the same area doing the same ritual right now.
    const companions = [...this.sessions.values()].filter(
      (o) => o.sessionId !== s.sessionId && o.player && areaOf(o.player) === areaOf(p) && o.player.currentActivity === p.currentActivity
    ).length;
    const decision = decideAward(this.merit[s.meritKey] ?? normalizeMerit(null), p.currentActivity, now, MERIT, { companions });
    if (!decision.ok) return fail(decision.reason);
    this.merit[s.meritKey] = decision.next;
    this.templeMerit += decision.amount;
    this.sendTo(s.sessionId, "merit", decision.next);
    this.broadcast("temple", this.templeMerit);
    this.persist();
    return { ok: true, amount: decision.amount, bonus: decision.bonus, extras: decision.extras, merit: decision.next };
  }

  /** Add a guestbook or wish note (cleaned, masked, one per kind per NOTES.minGapMs). */
  note(sessionId: unknown, token: unknown, body: { kind?: unknown; text?: unknown }): Result<{ note: Note }> {
    const s = this.auth(sessionId, token);
    if (!s?.player) return fail("unauthorized");
    if (!isNoteKind(body.kind)) return fail("bad kind");
    const kind = body.kind as NoteKind;
    const now = this.now();
    const prepared = prepareNote(String(body.text ?? ""), s.lastNoteAt[kind] ?? null, now, NOTES);
    if (!prepared.ok) return fail(prepared.error);
    s.lastNoteAt[kind] = now;
    const note: Note = { id: this.newId(), kind, sessionId: s.sessionId, displayName: s.player.displayName, text: prepared.text, createdAt: now };
    this.notes = addNote(this.notes, note);
    this.broadcast("note", note);
    this.persist();
    return { ok: true, note };
  }

  /** A greeting (chắp tay, vái, vẫy tay) shown to everyone nearby. */
  emote(sessionId: unknown, token: unknown, body: { emote?: unknown }): Result {
    const s = this.auth(sessionId, token);
    if (!s?.player) return fail("unauthorized");
    if (!isEmoteId(body.emote)) return fail("bad emote");
    const now = this.now();
    if (s.lastEmoteAt !== null && now - s.lastEmoteAt < EMOTE_TIMING.minGapMs) return fail("too soon");
    s.lastEmoteAt = now;
    Object.assign(s.player, { emote: body.emote, emoteAt: now, lastActiveAt: now });
    this.playersChanged();
    return { ok: true };
  }

  /** Leave on purpose: removed at once. */
  leave(sessionId: unknown, token: unknown): Result {
    const s = this.auth(sessionId, token);
    if (!s) return fail("unauthorized");
    this.removeSession(s.sessionId);
    return { ok: true };
  }

  // ----------------------------------------------------------------- streams

  /**
   * A browser opened its event stream: send the current temple, then live
   * updates. Returns false (and sends nothing) for an unknown visit.
   */
  connect(sessionId: unknown, token: unknown, client: Client): boolean {
    const s = this.auth(sessionId, token);
    if (!s) return false;
    const pending = this.removalTimers.get(s.sessionId);
    if (pending) clearTimeout(pending);
    this.removalTimers.delete(s.sessionId);
    this.clients.add(client);
    client.send("players", this.publicPlayers());
    client.send("chatHistory", this.chat);
    client.send("temple", this.templeMerit);
    client.send("merit", this.merit[s.meritKey] ?? normalizeMerit(null));
    client.send("notesHistory", [...this.notes.guestbook, ...this.notes.wish]);
    return true;
  }

  /** A stream closed: if the visit has no stream left, remove it after a grace period (reconnects cancel it). */
  disconnect(client: Client) {
    this.clients.delete(client);
    const id = client.sessionId;
    if ([...this.clients].some((c) => c.sessionId === id)) return;
    if (!this.sessions.has(id)) return;
    const t = setTimeout(() => {
      this.removalTimers.delete(id);
      if (![...this.clients].some((c) => c.sessionId === id)) this.removeSession(id, "lost");
    }, this.graceMs);
    this.removalTimers.set(id, t);
  }

  /** Online players as everyone sees them. */
  publicPlayers(): Record<string, Player> {
    const out: Record<string, Player> = {};
    for (const s of this.sessions.values()) if (s.player) out[s.sessionId] = { ...s.player };
    return out;
  }

  get temple(): number {
    return this.templeMerit;
  }

  // ---------------------------------------------------------------- internals

  private removeSession(id: string, unannounced?: "lost" | "takenOver") {
    const had = this.sessions.get(id)?.player;
    if (had && unannounced) this.onVisitEnd({ ...had }, unannounced);
    this.sessions.delete(id);
    const t = this.removalTimers.get(id);
    if (t) clearTimeout(t);
    this.removalTimers.delete(id);
    if (had) this.playersChanged();
  }

  /** Coalesce player broadcasts to at most ~12 per second. */
  private playersChanged() {
    this.playersDirty = true;
    if (this.playersTimer) return;
    this.playersTimer = setTimeout(() => {
      this.playersTimer = null;
      if (!this.playersDirty) return;
      this.playersDirty = false;
      this.broadcast("players", this.publicPlayers());
    }, 80);
  }

  private broadcast(event: string, data: unknown) {
    for (const c of this.clients) c.send(event, data);
  }

  private sendTo(sessionId: string, event: string, data: unknown) {
    for (const c of this.clients) if (c.sessionId === sessionId) c.send(event, data);
  }

  private persist() {
    this.save({ templeMerit: this.templeMerit, merit: this.merit, chat: this.chat, notes: this.notes });
  }
}

/** Read a position from a request body: finite numbers inside the world, a known direction. */
function readPosition(body: { x?: unknown; y?: unknown; dir?: unknown }): { x: number; y: number; dir: Direction } | null {
  const x = Number(body.x);
  const y = Number(body.y);
  const dir = body.dir;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > TEMPLE.width || y > TEMPLE.height) return null;
  if (dir !== "up" && dir !== "down" && dir !== "left" && dir !== "right") return null;
  return { x: Math.round(x), y: Math.round(y), dir };
}
