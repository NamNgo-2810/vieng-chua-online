/**
 * Pure placement rules: where a player may stand, how a move slides along
 * obstacles, where to spawn, and which ritual spot (if any) is in reach.
 * No Phaser, no store — the scene and the store call these, tests cover them.
 *
 * Data: config/temple-map.ts (walkable area), config/ritual-spots.ts (spots).
 * Design: design/game-brief.md — Features: activities tied to places.
 */

import { WALKABLE, BLOCKERS, SPAWN_AREA, type Rect } from "@/config/temple-map";
import { RITUAL_SPOTS, spotsIn, type RitualSpot } from "@/config/ritual-spots";
import { AREAS, type AreaId, type Gate } from "@/config/areas";
import type { ActivityId } from "@/config/activities";

/** The walk map a function works against; injectable for tests. */
export interface WalkMap {
  walkable: Rect[];
  blockers: Rect[];
}

export const TEMPLE_WALK_MAP: WalkMap = { walkable: WALKABLE, blockers: BLOCKERS };

/** The walk map of an area (config/areas.ts). */
export function walkMapFor(area: AreaId): WalkMap {
  return area === "COURTYARD" ? TEMPLE_WALK_MAP : { walkable: AREAS[area].walkable, blockers: AREAS[area].blockers };
}

/** The gate whose trigger contains feet at (x, y) in `area`, or null. */
export function gateAt(area: AreaId, x: number, y: number): Gate | null {
  return AREAS[area].gates.find((g) => inside(g.trigger, x, y)) ?? null;
}

function inside(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when feet at (x, y) are inside a walkable area and no blocker. */
export function canStand(x: number, y: number, map: WalkMap = TEMPLE_WALK_MAP): boolean {
  return map.walkable.some((r) => inside(r, x, y)) && !map.blockers.some((r) => inside(r, x, y));
}

/**
 * Resolve a move from (fx, fy) toward (tx, ty). Takes the full step if it
 * lands on walkable ground; otherwise tries the horizontal and then the
 * vertical part alone, so the player slides along walls instead of sticking.
 * A player already standing somewhere unwalkable (e.g. placed by an old
 * client) may move freely until back on walkable ground, so nobody is trapped.
 */
export function resolveMove(
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  map: WalkMap = TEMPLE_WALK_MAP
): { x: number; y: number } {
  if (!canStand(fx, fy, map)) return { x: tx, y: ty };
  if (canStand(tx, ty, map)) return { x: tx, y: ty };
  if (canStand(tx, fy, map)) return { x: tx, y: fy };
  if (canStand(fx, ty, map)) return { x: fx, y: ty };
  return { x: fx, y: fy };
}

/**
 * A walkable spawn point inside `area`. `random` returns [0, 1) and is
 * injectable for deterministic tests. Falls back to scanning the area on a
 * grid, then to the area's centre.
 */
export function findSpawn(
  random: () => number = Math.random,
  area: Rect = SPAWN_AREA,
  map: WalkMap = TEMPLE_WALK_MAP
): { x: number; y: number } {
  for (let i = 0; i < 20; i++) {
    const x = Math.round(area.x + random() * area.w);
    const y = Math.round(area.y + random() * area.h);
    if (canStand(x, y, map)) return { x, y };
  }
  for (let y = area.y; y <= area.y + area.h; y += 10) {
    for (let x = area.x; x <= area.x + area.w; x += 10) {
      if (canStand(x, y, map)) return { x, y };
    }
  }
  return { x: area.x + area.w / 2, y: area.y + area.h / 2 };
}

/**
 * The closest ritual spot whose radius reaches (x, y), or null. Pass the
 * current area's spots (spotsIn(area)); the default is the courtyard's, since
 * spots in different areas share world coordinates.
 */
export function nearestSpot(
  x: number,
  y: number,
  spots: RitualSpot[] = spotsIn("COURTYARD")
): RitualSpot | null {
  let best: RitualSpot | null = null;
  let bestD = Infinity;
  for (const s of spots) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= s.radius && d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/**
 * Where an activity may be performed. WALKING is allowed anywhere; every other
 * activity needs the player to be at a spot that offers it.
 */
export function activityAllowedAt(activity: ActivityId, spot: RitualSpot | null): boolean {
  if (activity === "WALKING") return true;
  return !!spot && spot.activities.includes(activity);
}

/** The first spot that offers `activity` (for "walk to …" hints). */
export function spotOffering(
  activity: ActivityId,
  spots: RitualSpot[] = RITUAL_SPOTS
): RitualSpot | null {
  return spots.find((s) => s.activities.includes(activity)) ?? null;
}
