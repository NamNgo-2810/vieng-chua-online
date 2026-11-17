"use client";

/**
 * Global client store (Zustand). The single bridge between Firebase, the React
 * UI, and the Phaser scene. UI/game read from here and call its actions; only
 * this store talks to the PresenceManager.
 */

import { create } from "zustand";
import type { Player, ConnectionState, AudioState, Direction } from "@/lib/types";
import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";
import type { AppearanceId } from "@/config/appearances";
import { PresenceManager } from "@/lib/firebase/presence";
import { LocalPresence } from "@/lib/local-presence";
import type { IPresence } from "@/lib/presence-types";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { backendMode, type BackendMode } from "@/config/backend";
import { LocalLink } from "@/lib/local-server/link";
import { LocalServerPresence, LocalServerChat, LocalServerMerit } from "@/lib/local-server/backends";
import { recordEvent } from "@/lib/history-client";

import { findSpawn, nearestSpot, activityAllowedAt } from "@/game/placement";
import type { SpotId } from "@/config/ritual-spots";
import { FirebaseChat } from "@/lib/firebase/chat";
import { LocalChat } from "@/lib/local-chat";
import type { IChat } from "@/lib/chat-types";
import { appendHistory, prepareOutgoing, type ChatMessage } from "@/lib/chat-core";
import { FirebaseMerit } from "@/lib/firebase/merit";
import { LocalMerit } from "@/lib/local-merit";
import type { IMerit } from "@/lib/merit-types";
import { decideAward, emptyMerit, type MeritState, type AwardExtras } from "@/lib/merit-core";
import { MERIT } from "@/config/merit";
import { newlyUnlocked, isUnlocked } from "@/lib/milestones-core";
import { AREAS, ENTRY, areaOf, landingFor, type AreaId } from "@/config/areas";
import { CLOUD, CLOUD_TEXT } from "@/config/journey";
import { isPurified, purityFlagFor, PURITY_TEXT } from "@/config/purity";
import { walkMapFor } from "@/game/placement";
import { spotsIn } from "@/config/ritual-spots";
import { LocalServerNotes } from "@/lib/local-server/backends";
import { FirebaseNotes } from "@/lib/firebase/notes";
import { LocalNotes } from "@/lib/local-notes";
import type { INotes } from "@/lib/notes-types";
import { addNote, emptyNotes, prepareNote, type Note, type NotesByKind } from "@/lib/notes-core";
import { NOTE_ACTIVITY, type NoteKind } from "@/config/notes";
import { SUTRA_VERSES, FORTUNES, pick } from "@/config/verses";
import { EMOTE_TIMING, type EmoteId } from "@/config/emotes";
import type { MilestoneId } from "@/config/milestones";

interface GameStore {
  // state
  entered: boolean;
  localSessionId: string | null;
  localPlayer: Player | null;
  players: Record<string, Player>;
  connection: ConnectionState;
  audio: AudioState;
  takenOver: boolean;
  configured: boolean;
  /** firebase | local (this machine's server, JSON/CSV) | offline (demo). */
  mode: BackendMode;
  /** True only in the single-player offline demo. */
  offline: boolean;
  /** Bumps whenever the local player's activity changes (drives UI feedback). */
  activityPulse: number;
  /** Ritual spot the local player is standing in reach of (set by the scene). */
  nearbySpotId: SpotId | null;
  /**
   * A position the scene must move the local character to (starting a ritual
   * places them at the spot). `seq` changes on every snap so repeats register.
   */
  localSnap: { x: number; y: number; dir: Direction; seq: number } | null;
  /** Recent public chat, oldest first (capped at CHAT.historySize). */
  chat: ChatMessage[];
  /** When the local player last sent a chat message (client-side gap check). */
  lastChatAt: number | null;
  /** The local player's merit record. */
  merit: MeritState;
  /** The whole temple's shared merit. */
  templeMerit: number;
  /** Last award, for the floating "+N công đức" (seq changes per award). */
  meritPulse: { amount: number; bonus: number; extras: AwardExtras; seq: number } | null;
  /** Why the last finished ritual earned nothing (shown softly in the dock). */
  meritNote: string | null;
  /** True once the temple total has loaded (unlocks before that are not "new"). */
  templeLoaded: boolean;
  /** Last milestone unlocked while this player was in the temple (toast). */
  milestonePulse: { id: MilestoneId; seq: number } | null;
  /** Guestbook and wish-tree notes. */
  notes: NotesByKind;
  /** When this player last added a note of each kind (client-side gap check). */
  lastNoteAt: Partial<Record<NoteKind, number>>;
  /** The note writing box that is open, if any (opened by its ritual). */
  composer: NoteKind | null;
  /** A verse revealed by reading a sutra or drawing a fortune stick. */
  reveal: { kind: "sutra" | "fortune"; title: string; text: string; source?: string; seq: number } | null;
  /** When this player last greeted (client-side gap check). */
  lastEmoteAt: number | null;
  /** A short message for the player (e.g. why a door would not open). */
  notice: { text: string; seq: number } | null;

  // derived
  onlineCount: () => number;

  // actions
  enterTemple: (displayName: string, role: RoleId, appearance?: AppearanceId) => Promise<void>;
  changeActivity: (activity: ActivityId) => Promise<void>;
  move: (x: number, y: number, dir: Direction) => void;
  setNearbySpot: (id: SpotId | null) => void;
  /**
   * Walk through a gate into `area`. Refused (resolves false) while the area's
   * milestone is still locked.
   */
  /** Walk through a gate into a neighbouring area (or, with `fly`, land there by cloud). */
  enterArea: (area: AreaId, fly?: boolean) => Promise<boolean>;
  /** Fly by cân đẩu vân to any open area (needs CLOUD.minMerit personal merit). */
  flyTo: (area: AreaId) => Promise<boolean>;
  /** The last cloud flight (the new scene shows the landing cloud). */
  flight: { at: number; seq: number } | null;
  /** Add a guestbook/wish note. Resolves to null on success, or an error to show. */
  addNote: (kind: NoteKind, raw: string) => Promise<string | null>;
  openComposer: (kind: NoteKind | null) => void;
  closeReveal: () => void;
  /** Send a greeting (chắp tay, vái, vẫy tay). */
  greet: (emote: EmoteId) => Promise<void>;
  /** Send a chat message. Resolves to null on success, or an error to show. */
  sendChat: (raw: string) => Promise<string | null>;
  leave: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  markAudioStarted: () => void;
}

let presence: IPresence | null = null;
let chat: IChat | null = null;
let merit: IMerit | null = null;
let notesBackend: INotes | null = null;
/** Pending "ritual held long enough" check, and which ritual session it belongs to. */
let ritualTimer: ReturnType<typeof setTimeout> | null = null;
let ritualSession = 0;
/** True while an area change is in flight (the scene asks every frame in a gate). */
let areaChanging = false;

/**
 * Offline testing aid: `?debugTemple=N` starts the offline temple total at N,
 * so milestone decor can be seen without hours of play. Ignored online.
 */
function debugTempleBonus(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(new URLSearchParams(window.location.search).get("debugTemple"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Messages for rituals that finished without merit. */
const MERIT_NOTES = {
  cooldown: "Nghi lễ này vừa được ghi công đức — hãy thử nghi lễ khác.",
  "too-soon": "Chậm lại một chút, rồi công đức sẽ đến.",
  "daily-cap": "Hôm nay bạn đã đủ 108 công đức. Hẹn gặp lại ngày mai!",
} as const;

/**
 * Start the merit clock for a ritual: if the player is still in this same
 * ritual after MERIT.ritualMs (+ a small margin for server clock skew), try to
 * award it. Any activity change starts a new session and cancels the old one.
 */
function startRitualClock(
  activity: ActivityId,
  getState: () => GameStore,
  setState: (p: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void
) {
  if (ritualTimer) clearTimeout(ritualTimer);
  ritualTimer = null;
  const session = ++ritualSession;
  if ((MERIT.values[activity] ?? 0) <= 0) return;
  ritualTimer = setTimeout(async () => {
    ritualTimer = null;
    const me = presence?.getLocal();
    if (session !== ritualSession || !me || me.currentActivity !== activity || !merit) return;
    // Đồng tu: others in the same area doing the same ritual right now.
    const companions = Object.values(getState().players).filter(
      (p) => p.sessionId !== me.sessionId && areaOf(p) === areaOf(me) && p.currentActivity === activity
    ).length;
    const decision = decideAward(getState().merit, activity, Date.now(), MERIT, { companions });
    if (!decision.ok) {
      if (decision.reason !== "no-merit") setState({ meritNote: MERIT_NOTES[decision.reason] });
      return;
    }
    const ok = await merit.award(me.sessionId, activity, decision);
    if (!ok) return;
    setState((s) => ({
      merit: decision.next,
      meritNote: null,
      meritPulse: { amount: decision.amount, bonus: decision.bonus, extras: decision.extras, seq: (s.meritPulse?.seq ?? 0) + 1 },
    }));
  }, MERIT.ritualMs + 400);
}

export const useGameStore = create<GameStore>((setState, getState) => ({
  entered: false,
  localSessionId: null,
  localPlayer: null,
  players: {},
  connection: { status: "idle" },
  audio: { muted: false, sfxEnabled: true, musicVolume: 0.5, sfxVolume: 0.7, started: false },
  takenOver: false,
  configured: isFirebaseConfigured(),
  mode: backendMode(isFirebaseConfigured()),
  offline: false,
  activityPulse: 0,
  nearbySpotId: null,
  localSnap: null,
  chat: [],
  lastChatAt: null,
  merit: emptyMerit(),
  templeMerit: 0,
  meritPulse: null,
  meritNote: null,
  templeLoaded: false,
  milestonePulse: null,
  notes: emptyNotes(),
  lastNoteAt: {},
  composer: null,
  reveal: null,
  lastEmoteAt: null,
  notice: null,
  flight: null,

  onlineCount: () =>
    Object.values(getState().players).filter((p) => p.isOnline).length,

  enterTemple: async (displayName, role, appearance) => {
    const callbacks = {
      onConnection: (status: ConnectionState["status"], error?: string) =>
        setState({ connection: { status, error } }),
      onPlayers: (players: Record<string, Player>) => {
        setState((s) => {
          const localSessionId = s.localSessionId;
          const localPlayer = localSessionId
            ? players[localSessionId] ?? s.localPlayer
            : s.localPlayer;
          return { players, localPlayer };
        });
      },
      onTakenOver: () => setState({ takenOver: true }),
    };

    // Pick the backend (config/backend.ts): Firebase when configured, else this
    // machine's local server (friends join via its IP); "offline" is the demo.
    const mode = backendMode(isFirebaseConfigured());
    const offline = mode === "offline";
    const link = mode === "local" ? new LocalLink() : null;
    presence = link
      ? new LocalServerPresence(link, callbacks)
      : offline
        ? new LocalPresence(callbacks)
        : new PresenceManager(callbacks);
    setState({ offline, mode });

    // Visitors arrive at the Tam quan (front gate), where they leave their
    // sandals and wash before going in (config/purity.ts).
    const { x: spawnX, y: spawnY } = findSpawn(Math.random, ENTRY.spawn, walkMapFor(ENTRY.area));

    const sid = await presence.authenticate();
    await presence.join({ displayName, role, appearance, spawnX, spawnY, area: ENTRY.area });

    // Public chat (same backend choice as presence).
    const onMessage = (msg: ChatMessage) => setState((s) => ({ chat: appendHistory(s.chat, msg) }));
    chat = link ? new LocalServerChat(link, { onMessage }) : offline ? new LocalChat({ onMessage }) : new FirebaseChat({ onMessage });
    chat.start();

    // Merit (same backend choice). Its own record arrives via onMerit.
    const meritCbs = {
      onMerit: (m: MeritState) => setState({ merit: m }),
      onTemple: (total: number) =>
        setState((s) => {
          // Celebrate milestones crossed while here, not the ones already open on arrival.
          const crossed = s.templeLoaded ? newlyUnlocked(s.templeMerit, total) : [];
          const last = crossed[crossed.length - 1];
          return {
            templeMerit: total,
            templeLoaded: true,
            ...(last ? { milestonePulse: { id: last.id, seq: (s.milestonePulse?.seq ?? 0) + 1 } } : {}),
          };
        }),
    };
    merit = link
      ? new LocalServerMerit(link, meritCbs)
      : offline
        ? new LocalMerit(meritCbs, undefined, debugTempleBonus())
        : new FirebaseMerit(meritCbs);
    merit.start(sid);

    // Guestbook and wishes (same backend choice).
    const onNote = (n: Note) => setState((s) => ({ notes: addNote(s.notes, n) }));
    notesBackend = link ? new LocalServerNotes(link, { onNote }) : offline ? new LocalNotes({ onNote }) : new FirebaseNotes({ onNote });
    notesBackend.start();

    const local = presence.getLocal();
    setState((s) => ({ notice: { text: PURITY_TEXT.welcome, seq: (s.notice?.seq ?? 0) + 1 } }));
    setState({
      entered: true,
      localSessionId: sid,
      localPlayer: local,
    });

    if (local && !offline) {
      recordEvent("JOIN", {
        sessionId: sid,
        displayName: local.displayName,
        role: local.role,
        activity: local.currentActivity,
      });
    }

    // Safety-net LEAVE on tab close (online only).
    if (typeof window !== "undefined" && !offline) {
      window.addEventListener("beforeunload", () => {
        const l = presence?.getLocal();
        if (l) {
          recordEvent("LEAVE", {
            sessionId: l.sessionId,
            displayName: l.displayName,
            role: l.role,
            activity: l.currentActivity,
          });
        }
      });
    }
  },

  changeActivity: async (activity) => {
    if (!presence) return;
    // Rituals happen at their place: refuse one the player is not in reach of.
    const me = presence.getLocal();
    if (!me) return;
    const spot = nearestSpot(me.positionX, me.positionY, spotsIn(areaOf(me)));
    if (!activityAllowedAt(activity, spot)) return;
    if (spot && activity !== "WALKING") {
      presence.move(spot.standX, spot.standY, spot.facing);
      setState((s) => ({
        localSnap: { x: spot.standX, y: spot.standY, dir: spot.facing, seq: (s.localSnap?.seq ?? 0) + 1 },
      }));
    }
    const ok = await presence.changeActivity(activity);
    if (!ok) return;
    const local = presence.getLocal();
    setState((s) => ({ localPlayer: local, activityPulse: s.activityPulse + 1, meritNote: null }));
    startRitualClock(activity, getState, setState);
    // Purification: once both are done, say the halls are open.
    if (purityFlagFor(activity) && local && isPurified(local)) {
      setState((s) => ({ notice: { text: PURITY_TEXT.done, seq: (s.notice?.seq ?? 0) + 1 } }));
    }
    // Rituals with something to read or write.
    if (activity in NOTE_ACTIVITY) setState({ composer: NOTE_ACTIVITY[activity as keyof typeof NOTE_ACTIVITY] });
    if (activity === "READ_SUTRA") {
      const v = pick(SUTRA_VERSES);
      setState((s) => ({ reveal: { kind: "sutra", title: "Lời dạy hôm nay", text: v.text, source: v.source, seq: (s.reveal?.seq ?? 0) + 1 } }));
    }
    if (activity === "DRAW_FORTUNE") {
      const f = pick(FORTUNES);
      setState((s) => ({ reveal: { kind: "fortune", title: `Quẻ ${f.level}`, text: f.text, seq: (s.reveal?.seq ?? 0) + 1 } }));
    }
    if (local && !getState().offline) {
      recordEvent("ACTIVITY_CHANGE", {
        sessionId: local.sessionId,
        displayName: local.displayName,
        role: local.role,
        activity,
      });
    }
  },

  move: (x, y, dir) => {
    presence?.move(x, y, dir);
  },

  flyTo: async (area) => {
    if (getState().merit.total < CLOUD.minMerit) {
      setState((s) => ({ notice: { text: CLOUD_TEXT.locked(CLOUD.minMerit), seq: (s.notice?.seq ?? 0) + 1 } }));
      return false;
    }
    const ok = await getState().enterArea(area, true);
    if (ok) setState((s) => ({ flight: { at: Date.now(), seq: (s.flight?.seq ?? 0) + 1 } }));
    return ok;
  },

  enterArea: async (area, fly = false) => {
    const me = presence?.getLocal();
    if (!presence || !me || areaOf(me) === area) return false;
    const def = AREAS[area];
    if (def.unlock && !isUnlocked(def.unlock, getState().templeMerit)) return false;
    if (def.requiresPurity && !isPurified(me)) {
      // Say why the door stays shut, but not every frame while standing in it.
      const last = getState().notice;
      if (last?.text !== PURITY_TEXT.needed) setState((s) => ({ notice: { text: PURITY_TEXT.needed, seq: (s.notice?.seq ?? 0) + 1 } }));
      return false;
    }
    // Arrive where the gate from the current area leads (or where the cloud lands).
    const arrive = fly ? landingFor(area) : AREAS[areaOf(me)].gates.find((g) => g.to === area)?.arrive;
    if (!arrive) return false;
    const { x, y, facing } = arrive;
    if (areaChanging) return false;
    areaChanging = true;
    let ok = false;
    try {
      ok = await presence.changeArea(area, x, y, facing, fly);
    } finally {
      areaChanging = false;
    }
    if (!ok) return false;
    startRitualClock("WALKING", getState, setState); // cancels any ritual in progress
    setState((s) => ({
      localPlayer: presence?.getLocal() ?? s.localPlayer,
      nearbySpotId: null,
      localSnap: { x, y, dir: facing, seq: (s.localSnap?.seq ?? 0) + 1 },
    }));
    return true;
  },

  addNote: async (kind, raw) => {
    const me = presence?.getLocal();
    if (!notesBackend || !me) return "Chưa vào chùa.";
    const now = Date.now();
    const prepared = prepareNote(raw, getState().lastNoteAt[kind] ?? null, now);
    if (!prepared.ok) return prepared.error;
    const ok = await notesBackend.add(kind, me.sessionId, me.displayName, prepared.text);
    if (!ok) return "Chưa ghi được. Thử lại sau giây lát.";
    setState((s) => ({ lastNoteAt: { ...s.lastNoteAt, [kind]: now }, composer: null }));
    return null;
  },

  openComposer: (kind) => setState({ composer: kind }),
  closeReveal: () => setState({ reveal: null }),

  greet: async (emote) => {
    const now = Date.now();
    const last = getState().lastEmoteAt;
    if (!presence || (last !== null && now - last < EMOTE_TIMING.minGapMs)) return;
    setState({ lastEmoteAt: now });
    if (await presence.emote(emote)) setState({ localPlayer: presence.getLocal() });
  },

  sendChat: async (raw) => {
    const me = presence?.getLocal();
    if (!chat || !me) return "Chưa vào chùa.";
    const now = Date.now();
    const prepared = prepareOutgoing(raw, getState().lastChatAt, now);
    if (!prepared.ok) return prepared.error;
    setState({ lastChatAt: now });
    const ok = await chat.send(me.sessionId, me.displayName, prepared.text);
    return ok ? null : "Không gửi được tin nhắn. Thử lại sau giây lát.";
  },

  setNearbySpot: (id) => {
    if (getState().nearbySpotId !== id) setState({ nearbySpotId: id });
  },

  leave: async () => {
    const local = presence?.getLocal();
    if (local && !getState().offline) {
      recordEvent("LEAVE", {
        sessionId: local.sessionId,
        displayName: local.displayName,
        role: local.role,
        activity: local.currentActivity,
      });
    }
    await presence?.leave();
    presence?.dispose();
    presence = null;
    chat?.dispose();
    chat = null;
    merit?.dispose();
    merit = null;
    notesBackend?.dispose();
    notesBackend = null;
    if (ritualTimer) clearTimeout(ritualTimer);
    ritualTimer = null;
    ritualSession++;
    setState({
      entered: false,
      localPlayer: null,
      players: {},
      connection: { status: "idle" },
      offline: false,
      nearbySpotId: null,
      localSnap: null,
      chat: [],
      lastChatAt: null,
      merit: emptyMerit(),
      templeMerit: 0,
      meritPulse: null,
      meritNote: null,
      templeLoaded: false,
      milestonePulse: null,
      notes: emptyNotes(),
      lastNoteAt: {},
      composer: null,
      reveal: null,
      lastEmoteAt: null,
      notice: null,
      flight: null,
    });
  },

  setMuted: (muted) => setState((s) => ({ audio: { ...s.audio, muted } })),
  setSfxEnabled: (enabled) => setState((s) => ({ audio: { ...s.audio, sfxEnabled: enabled } })),
  setMusicVolume: (v) =>
    setState((s) => ({ audio: { ...s.audio, musicVolume: Math.min(1, Math.max(0, v)) } })),
  setSfxVolume: (v) =>
    setState((s) => ({ audio: { ...s.audio, sfxVolume: Math.min(1, Math.max(0, v)) } })),
  markAudioStarted: () => setState((s) => ({ audio: { ...s.audio, started: true } })),
}));

export { TEMPLE } from "@/game/world";
