"use client";

/**
 * Offline / demo presence. Used when Firebase is not configured (or as a
 * graceful fallback). It keeps the experience fully playable: the local player
 * works exactly as online, and a few gentle ambient visitors populate the
 * temple so it never feels empty. No network, no fake *production* data — this
 * only activates when the real backend is unavailable, and the UI clearly
 * labels it as offline.
 */

import { resolveAppearance, type AppearanceId } from "@/config/appearances";
import type { Player, Direction } from "@/lib/types";
import type { ActivityId } from "@/config/activities";
import type { AreaId } from "@/config/areas";
import type { EmoteId } from "@/config/emotes";
import { purityFlagFor } from "@/config/purity";
import { DEFAULT_ACTIVITY, canPerform } from "@/config/permissions";
import type { IPresence, JoinOptions, PresenceCallbacks } from "./presence-types";
import { SPOTS_BY_ID, type SpotId } from "@/config/ritual-spots";

const LOCAL_ID = "local-you";

/** A couple of calm, non-interactive demo visitors for the empty-room case. */
function demoVisitors(): Record<string, Player> {
  const now = Date.now();
  const make = (
    id: string,
    name: string,
    role: Player["role"],
    appearance: AppearanceId,
    activity: ActivityId,
    spot: SpotId
  ): Player => ({
    sessionId: id,
    displayName: name,
    role,
    appearance,
    currentActivity: activity,
    positionX: SPOTS_BY_ID[spot].standX,
    positionY: SPOTS_BY_ID[spot].standY,
    direction: SPOTS_BY_ID[spot].facing,
    joinedAt: now,
    lastActiveAt: now,
    isOnline: true,
  });
  // Seated on the two cushions, at their ritual spots' stand points.
  return {
    // One of each kind of look, so offline mode shows the cast.
    "demo-abbot": make("demo-abbot", "Thích Trí Tâm", "TRU_TRI", "ABBOT", "CHANTING", "CUSHION_LEFT"),
    "demo-visitor": make("demo-visitor", "Cô Lan", "KHACH_THAP_PHUONG", "LAY_WOMAN", "MEDITATION", "CUSHION_RIGHT"),
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
      appearance: resolveAppearance(opts.role, opts.appearance),
      area: opts.area ?? "COURTYARD",
      currentActivity: DEFAULT_ACTIVITY,
      activityStartedAt: now,
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

    // Gentle ambient drift for the demo abbot so the scene feels alive.
    this.wanderTimer = setInterval(() => {
      const monk = this.players["demo-abbot"];
      if (!monk) return;
      monk.direction = (["left", "right", "down"] as Direction[])[Math.floor(Math.random() * 3)];
      this.emit();
    }, 4000);
  }

  async changeActivity(activity: ActivityId): Promise<boolean> {
    if (!this.local) return false;
    if (!canPerform(this.local.role, activity)) return false;
    this.local.currentActivity = activity;
    this.local.activityStartedAt = Date.now();
    const flag = purityFlagFor(activity);
    if (flag) this.local[flag] = true;
    this.local.lastActiveAt = Date.now();
    this.emit();
    return true;
  }

  async changeArea(area: AreaId, x: number, y: number, dir: Direction): Promise<boolean> {
    if (!this.local) return false;
    Object.assign(this.local, { area, positionX: x, positionY: y, direction: dir, currentActivity: "WALKING", activityStartedAt: Date.now() });
    this.emit();
    return true;
  }

  async emote(emote: EmoteId): Promise<boolean> {
    if (!this.local) return false;
    Object.assign(this.local, { emote, emoteAt: Date.now() });
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

  /**
   * A snapshot copy of the local player. Never the internal object: the store
   * and React compare by reference, so handing out the mutable original made
   * the dock miss activity changes.
   */
  getLocal(): Player | null {
    return this.local ? { ...this.local } : null;
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

  /** Broadcast fresh copies so subscribers see changes by reference. */
  private emit() {
    const snapshot: Record<string, Player> = {};
    for (const [id, p] of Object.entries(this.players)) snapshot[id] = { ...p };
    this.cbs.onPlayers(snapshot);
  }
}
