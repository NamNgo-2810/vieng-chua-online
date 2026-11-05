/**
 * Typed asset manifest. Wraps the generated JSON produced by
 * `npm run assets:prep` (scripts/prep-assets.ts) and exposes stable,
 * strongly-typed accessors so game code never hardcodes file paths or pixel
 * coordinates. To swap artwork: replace the source sheets in /assets, re-run
 * the prep script, and everything downstream keeps working.
 */

import generated from "./generated-manifest.json";
import type { RoleId } from "./roles";
import type { ActivityId, PropKey } from "./activities";

export interface AtlasEntry {
  /** Path relative to /public/assets, e.g. "characters/hoa_thuong/walk.png". */
  file: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}

export interface CharacterManifest {
  dir: string;
  /**
   * Per-direction frame ranges into the WALKING strip, encoded as
   * "down:0-1,up:2-3,left:4-5,right:6-7". Parse with `walkFrameRanges`.
   */
  walkDirs: string;
  activities: Partial<Record<ActivityId, AtlasEntry>>;
  placeholder?: boolean;
}

export type Direction = "up" | "down" | "left" | "right";

export interface FrameRange {
  start: number;
  end: number;
}

/**
 * Parse a CharacterManifest.walkDirs descriptor into a per-direction frame
 * range map. Tolerates the legacy comma-list form (e.g. "down,left,up,right")
 * by treating each listed direction as a single 1-frame range.
 */
export function walkFrameRanges(
  walkDirs: string
): Partial<Record<Direction, FrameRange>> {
  const out: Partial<Record<Direction, FrameRange>> = {};
  for (const part of walkDirs.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [dir, range] = part.split(":");
    const d = dir as Direction;
    if (range) {
      const [a, b] = range.split("-").map((n) => parseInt(n, 10));
      out[d] = { start: a, end: Number.isFinite(b) ? b : a };
    } else {
      // Legacy form: positional single frame.
      out[d] = { start: 0, end: 0 };
    }
  }
  return out;
}

export interface AssetManifest {
  generatedAt: string;
  cell: number;
  background: string;
  characters: Record<RoleId, CharacterManifest>;
  props: Partial<Record<Exclude<PropKey, null>, string>>;
}

export const MANIFEST = generated as unknown as AssetManifest;

/** Public URL (served from /public) for an assets-relative path. */
export function assetUrl(relative: string): string {
  return `/assets/${relative}`;
}

export function backgroundUrl(): string {
  return assetUrl(MANIFEST.background);
}

export function characterManifest(role: RoleId): CharacterManifest {
  return MANIFEST.characters[role];
}

/** Atlas entry for a role's activity, falling back to WALKING then undefined. */
export function activityAtlas(
  role: RoleId,
  activity: ActivityId
): AtlasEntry | undefined {
  const char = MANIFEST.characters[role];
  return char.activities[activity] ?? char.activities.WALKING;
}

export function propUrl(prop: Exclude<PropKey, null>): string | undefined {
  const rel = MANIFEST.props[prop];
  return rel ? assetUrl(rel) : undefined;
}

/** All prop keys available in the manifest (incl. decor-only ones like altar). */
export function propKeys(): string[] {
  return Object.keys(MANIFEST.props);
}

/**
 * Resolve any prop by raw key for world decoration. Prefers the manifest, but
 * falls back to the conventional `props/<key>.png` path so decor still works
 * for sliced props that the (index-based) prep step didn't name in the manifest
 * (e.g. altar). The scene's loader simply skips a key whose file is absent.
 */
export function decorUrl(key: string): string | undefined {
  const rel = (MANIFEST.props as Record<string, string | undefined>)[key];
  if (rel) return assetUrl(rel);
  return assetUrl(`props/${key}.png`);
}

export const CELL_SIZE = MANIFEST.cell;
