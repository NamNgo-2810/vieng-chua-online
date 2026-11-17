/**
 * Time of day in Vietnam (UTC+7) and how each area looks at that time:
 * a tinted overlay (dawn pink, dusk orange, night blue) and whether lights
 * glow. Indoors (lamps lit) stays brighter at night. Pure; tests/daytime.test.ts.
 */

import type { AreaId } from "@/config/areas";

export type DayPhase = "dawn" | "day" | "dusk" | "night";

/** Vietnam hour (0–23.99) of a moment. */
export function vnHour(ts: number): number {
  const d = new Date(ts + 7 * 3600_000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

/** Night 19:00–05:00, dawn 05:00–07:00, day 07:00–17:00, dusk 17:00–19:00. */
export function phaseAt(hour: number): DayPhase {
  if (hour >= 19 || hour < 5) return "night";
  if (hour < 7) return "dawn";
  if (hour < 17) return "day";
  return "dusk";
}

export const INDOOR: readonly AreaId[] = ["MAIN_HALL", "ANCESTOR_HALL", "SUTRA_LIBRARY"];

export interface Lighting {
  /** Overlay colour (0xRRGGBB) and opacity; alpha 0 means no overlay. */
  color: number;
  alpha: number;
  /** Lanterns and lamps glow brighter. */
  lightsOn: boolean;
}

const OUTDOOR: Record<DayPhase, Lighting> = {
  dawn: { color: 0xffb0a0, alpha: 0.12, lightsOn: false },
  day: { color: 0x000000, alpha: 0, lightsOn: false },
  dusk: { color: 0xff8a3d, alpha: 0.16, lightsOn: true },
  night: { color: 0x0b1235, alpha: 0.42, lightsOn: true },
};

const INSIDE: Record<DayPhase, Lighting> = {
  dawn: { color: 0xffd0a0, alpha: 0.06, lightsOn: true },
  day: { color: 0x000000, alpha: 0, lightsOn: false },
  dusk: { color: 0xff9a50, alpha: 0.08, lightsOn: true },
  night: { color: 0x1a1430, alpha: 0.2, lightsOn: true },
};

export function lightingFor(area: AreaId, phase: DayPhase): Lighting {
  return (INDOOR.includes(area) ? INSIDE : OUTDOOR)[phase];
}

export const PHASE_LABEL: Record<DayPhase, string> = {
  dawn: "🌅 Bình minh",
  day: "☀️ Ban ngày",
  dusk: "🌇 Hoàng hôn",
  night: "🌙 Đêm",
};

/**
 * Testing aid: `?debugHour=21` shows that hour's lighting (client only; merit
 * and rằm always use the real date). Returns null when not set.
 */
export function debugHour(search: string): number | null {
  const v = new URLSearchParams(search).get("debugHour");
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 24 ? n : null;
}
