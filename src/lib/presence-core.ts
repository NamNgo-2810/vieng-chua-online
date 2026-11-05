/**
 * Pure presence logic, independent of Firebase, so it can be unit-tested.
 *
 * - reconcilePlayers: turn a raw RTDB `players` snapshot into the validated,
 *   online-only collection every client renders. Drops malformed nodes, nodes
 *   marked offline, and nodes gone stale (no heartbeat within a TTL) so
 *   disconnected visitors never linger in the online list.
 * - resolveTakeover: decide whether the current tab still owns the session.
 */

import { playerSchema } from "@/lib/validation";
import type { Player } from "@/lib/types";

/** A visitor is considered stale if no activity/heartbeat within this window. */
export const PRESENCE_TTL_MS = 60_000;

export interface ReconcileOptions {
  now?: number;
  ttlMs?: number;
}

/**
 * Validate + filter a raw players map into the online collection.
 * `raw` is whatever RTDB returned (possibly partial/dirty).
 */
export function reconcilePlayers(
  raw: Record<string, Partial<Player>> | null | undefined,
  opts: ReconcileOptions = {}
): Record<string, Player> {
  const now = opts.now ?? Date.now();
  const ttl = opts.ttlMs ?? PRESENCE_TTL_MS;
  const out: Record<string, Player> = {};
  if (!raw) return out;

  for (const [id, node] of Object.entries(raw)) {
    const parsed = playerSchema.safeParse({ ...node, sessionId: id });
    if (!parsed.success) continue; // malformed -> skip
    const p = parsed.data;
    if (!p.isOnline) continue; // explicitly offline -> skip
    // Stale heartbeat -> treat as disconnected (covers lost onDisconnect()).
    if (p.lastActiveAt > 0 && now - p.lastActiveAt > ttl) continue;
    out[id] = p;
  }
  return out;
}

/** Count of online visitors in a reconciled collection. */
export function onlineCount(players: Record<string, Player>): number {
  return Object.keys(players).length;
}

/**
 * Given the session token currently stored on our player node and this tab's
 * token, decide whether we still own the session. A different, non-empty token
 * means another tab took over (duplicate-session handling).
 */
export function resolveTakeover(storedToken: unknown, myToken: string): boolean {
  return typeof storedToken === "string" && storedToken.length > 0 && storedToken !== myToken;
}
