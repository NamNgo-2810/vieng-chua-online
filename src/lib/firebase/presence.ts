"use client";

/**
 * Presence & player-session manager. Wraps Firebase anonymous auth + RTDB.
 *
 * Responsibilities:
 *  - anonymous sign-in
 *  - create/own the player node (sessionId == auth uid)
 *  - presence via `.info/connected` + `onDisconnect()`
 *  - subscribe to all players and push updates to a callback
 *  - throttled position sync, immediate activity change
 *  - duplicate-tab detection (last-writer-owns via a per-tab token)
 *
 * The store (src/state) is the only consumer; UI/game never call this directly.
 */

import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  ref,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  off,
  type Database,
  type DatabaseReference,
} from "firebase/database";

import { getFirebase } from "./client";
import type { Player, Direction } from "@/lib/types";
import type { ActivityId } from "@/config/activities";
import { DEFAULT_ACTIVITY, canPerform } from "@/config/permissions";
import { playerSchema } from "@/lib/validation";
import { reconcilePlayers, resolveTakeover } from "@/lib/presence-core";
import type { IPresence, JoinOptions, PresenceCallbacks } from "@/lib/presence-types";

const POSITION_SYNC_MS = 120; // ~8 Hz max position writes

/** A random token unique to this browser tab, used for takeover detection. */
const TAB_TOKEN = Math.random().toString(36).slice(2) + Date.now().toString(36);

export type { JoinOptions, PresenceCallbacks } from "@/lib/presence-types";

export class PresenceManager implements IPresence {
  private db: Database;
  private cbs: PresenceCallbacks;
  private sessionId: string | null = null;
  private playerRef: DatabaseReference | null = null;
  private playersRef: DatabaseReference;
  private connectedRef: DatabaseReference;
  private tokenRef: DatabaseReference | null = null;

  private local: Player | null = null;
  private pendingPos: { x: number; y: number; dir: Direction } | null = null;
  private posTimer: ReturnType<typeof setInterval> | null = null;
  private subscribed = false;

  constructor(cbs: PresenceCallbacks) {
    const { db } = getFirebase();
    this.db = db;
    this.cbs = cbs;
    this.playersRef = ref(db, "players");
    this.connectedRef = ref(db, ".info/connected");
  }

  /** Sign in anonymously; resolves with the uid (used as sessionId). */
  async authenticate(): Promise<string> {
    const { auth } = getFirebase();
    this.cbs.onConnection("authenticating");
    if (auth.currentUser) {
      this.sessionId = auth.currentUser.uid;
      return this.sessionId;
    }
    await signInAnonymously(auth);
    return new Promise<string>((resolve, reject) => {
      const unsub = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsub();
            this.sessionId = user.uid;
            resolve(user.uid);
          }
        },
        (err) => {
          unsub();
          this.cbs.onConnection("error", err.message);
          reject(err);
        }
      );
    });
  }

  /** Create the player node and wire up presence + subscriptions. */
  async join(opts: JoinOptions): Promise<void> {
    if (!this.sessionId) await this.authenticate();
    const sid = this.sessionId!;
    this.playerRef = ref(this.db, `players/${sid}`);
    this.tokenRef = ref(this.db, `players/${sid}/sessionToken`);

    const now = Date.now();
    const player: Player = {
      sessionId: sid,
      displayName: opts.displayName,
      role: opts.role,
      currentActivity: DEFAULT_ACTIVITY,
      positionX: opts.spawnX,
      positionY: opts.spawnY,
      direction: "down",
      joinedAt: now,
      lastActiveAt: now,
      isOnline: true,
    };

    // Validate the shape before writing (defense in depth; rules also enforce).
    const parsed = playerSchema.safeParse(player);
    if (!parsed.success) {
      throw new Error("Invalid player data: " + parsed.error.issues[0]?.message);
    }
    this.local = player;

    // Write node with server timestamps for join/active and our tab token.
    await set(this.playerRef, {
      ...player,
      joinedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      sessionToken: TAB_TOKEN,
    });

    this.setupPresence();
    this.subscribePlayers();
    this.watchTakeover();
    this.startPositionLoop();
  }

  /** `.info/connected` + onDisconnect cleanup, with reconnect re-assert. */
  private setupPresence() {
    onValue(this.connectedRef, async (snap) => {
      const connected = snap.val() === true;
      if (!connected) {
        this.cbs.onConnection("reconnecting");
        return;
      }
      if (this.playerRef && this.local) {
        // Register disconnect cleanup, then (re)assert our presence.
        await onDisconnect(this.playerRef).remove();
        await update(this.playerRef, {
          isOnline: true,
          lastActiveAt: serverTimestamp(),
          sessionToken: TAB_TOKEN,
        });
      }
      this.cbs.onConnection("online");
    });
  }

  private subscribePlayers() {
    if (this.subscribed) return;
    this.subscribed = true;
    onValue(this.playersRef, (snap) => {
      const raw = (snap.val() ?? {}) as Record<string, Partial<Player>>;
      // Validate, drop offline/stale nodes — shared with the unit-tested core.
      this.cbs.onPlayers(reconcilePlayers(raw));
    });
  }

  /** If another tab writes a different token, this tab yields ownership. */
  private watchTakeover() {
    if (!this.tokenRef) return;
    onValue(this.tokenRef, (snap) => {
      if (resolveTakeover(snap.val(), TAB_TOKEN)) {
        this.cbs.onTakenOver();
        this.stopPositionLoop();
      }
    });
  }

  /** Change activity immediately (validated against role permissions). */
  async changeActivity(activity: ActivityId): Promise<boolean> {
    if (!this.playerRef || !this.local) return false;
    if (!canPerform(this.local.role, activity)) return false;
    this.local.currentActivity = activity;
    await update(this.playerRef, {
      currentActivity: activity,
      lastActiveAt: serverTimestamp(),
    });
    return true;
  }

  /** Queue a position update; flushed on the throttle timer. */
  move(x: number, y: number, dir: Direction) {
    if (!this.local) return;
    this.pendingPos = { x, y, dir };
    this.local.positionX = x;
    this.local.positionY = y;
    this.local.direction = dir;
  }

  private startPositionLoop() {
    this.stopPositionLoop();
    this.posTimer = setInterval(() => {
      if (!this.pendingPos || !this.playerRef) return;
      const { x, y, dir } = this.pendingPos;
      this.pendingPos = null;
      void update(this.playerRef, {
        positionX: x,
        positionY: y,
        direction: dir,
        lastActiveAt: serverTimestamp(),
      });
    }, POSITION_SYNC_MS);
  }

  private stopPositionLoop() {
    if (this.posTimer) {
      clearInterval(this.posTimer);
      this.posTimer = null;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getLocal(): Player | null {
    return this.local;
  }

  /** Explicit leave: best-effort immediate cleanup. */
  async leave(): Promise<void> {
    this.stopPositionLoop();
    try {
      if (this.playerRef) {
        await onDisconnect(this.playerRef).cancel();
        await remove(this.playerRef);
      }
    } catch {
      // onDisconnect() remains as the safety net.
    }
  }

  /** Detach all listeners (e.g. on unmount). */
  dispose() {
    this.stopPositionLoop();
    off(this.connectedRef);
    off(this.playersRef);
    if (this.tokenRef) off(this.tokenRef);
  }
}
