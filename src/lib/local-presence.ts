"use client";

/**
 * Offline / demo presence. Used when Firebase is not configured (or as a
 * graceful fallback). It keeps the experience fully playable: the local player
 * works exactly as online, and a few gentle ambient visitors populate the
 * temple so it never feels empty. No network, no fake *production* data — this
 * only activates when the real backend is unavailable, and the UI clearly
 * labels it as offline.
 */

import type { Player, Direction } from "@/lib/types";
import type { ActivityId } from "@/config/activities";
import { DEFAULT_ACTIVITY, canPerform } from "@/config/permissions";
import type { IPresence, JoinOptions, PresenceCallbacks } from "./presence-types";
import { TEMPLE } from "@/game/world";

const LOCAL_ID = "local-you";

/** A couple of calm, non-interactive demo visitors for the empty-room case. */
function demoVisitors(): Record<string, Player> {
  const now = Date.now();
  const make = (
    id: string,
    name: string,
    role: Player["role"],
    activity: ActivityId,
    fx: number,
    fy: number
  ): Player => ({
    sessionId: id,
    displayName: name,
    role,
    currentActivity: activity,
    positionX: TEMPLE.width * fx,
    positionY: TEMPLE.height * fy,
    direction: "down",
    joinedAt: now,
    lastActiveAt: now,
    isOnline: true,
  });
  // Positioned to sit on the two meditation cushions (decor fx 0.38 / 0.62,
  // fy 0.74). Characters anchor bottom-center, so place their base just inside
  // the cushion top for a "seated on cushion" look.
  return {
    "demo-monk": make("demo-monk", "Sư thầy", "HOA_THUONG", "CHANTING", 0.38, 0.75),
    "demo-monk-2": make("demo-monk-2", "Sư huynh", "HOA_THUONG", "OFFER_INCENSE", 0.62, 0.75),
  };
}

export class LocalPresence implements IPresence {
  private cbs: PresenceCallbacks;
  private players: Record<string, Player> = {};
  private local: Player | null = null;
  private wanderTimer?: ReturnType<typeof setInterval>;

  constructor(cbs: PresenceCallbacks) {
    this.cbs = cbs;
  }

  async authenticate(): Promise<string> {
    this.cbs.onConnection("authenticating");
    return LOCAL_ID;
  }

  async join(opts: JoinOptions): Promise<void> {
    const now = Date.now();
    this.local = {
      sessionId: LOCAL_ID,
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
    this.players = { ...demoVisitors(), [LOCAL_ID]: this.local };
    // Offline but fully usable: report as online so gameplay is unblocked.
    this.cbs.onConnection("online");
    this.emit();

    // Gentle ambient drift for the demo monk so the scene feels alive.
    this.wanderTimer = setInterval(() => {
      const monk = this.players["demo-monk"];
      if (!monk) return;
      monk.direction = (["left", "right", "down"] as Direction[])[Math.floor(Math.random() * 3)];
      this.emit();
    }, 4000);
  }

  async changeActivity(activity: ActivityId): Promise<boolean> {
    if (!this.local) return false;
    if (!canPerform(this.local.role, activity)) return false;
    this.local.currentActivity = activity;
    this.local.lastActiveAt = Date.now();
    this.emit();
    return true;
  }

  move(x: number, y: number, dir: Direction): void {
    if (!this.local) return;
    this.local.positionX = x;
    this.local.positionY = y;
    this.local.direction = dir;
    // No per-move emit needed: Phaser owns the local position optimistically.
  }

  getSessionId(): string | null {
    return this.local ? LOCAL_ID : null;
  }

  getLocal(): Player | null {
    return this.local;
  }

  async leave(): Promise<void> {
    this.dispose();
  }

  dispose(): void {
    if (this.wanderTimer) clearInterval(this.wanderTimer);
    this.wanderTimer = undefined;
    this.players = {};
    this.local = null;
  }

  private emit() {
    this.cbs.onPlayers({ ...this.players });
  }
}
