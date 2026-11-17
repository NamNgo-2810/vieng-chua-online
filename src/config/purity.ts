/**
 * Purification before going inside (owner's request, 2026-11-16): at the Tam
 * quan, leave your sandals on the rack and wash your hands and feet. Both are
 * required to enter the indoor halls (AreaDef.requiresPurity). Done once per
 * visit; the character walks barefoot from then on.
 *
 * The local hub and the RTDB rules both enforce it (src/lib/merit-rules.ts).
 */

import type { ActivityId } from "./activities";

/** Which player flag each purification ritual sets (when it starts). */
export const PURIFY_ACTIVITIES = {
  REMOVE_SHOES: "shoesOff",
  WASH_HANDS_FEET: "washed",
} as const satisfies Partial<Record<ActivityId, "shoesOff" | "washed">>;

export type PurityFlag = (typeof PURIFY_ACTIVITIES)[keyof typeof PURIFY_ACTIVITIES];

/** True when a player has done both. */
export function isPurified(p: { shoesOff?: boolean; washed?: boolean }): boolean {
  return p.shoesOff === true && p.washed === true;
}

/** The flag a ritual sets, if it is a purification ritual. */
export function purityFlagFor(activity: ActivityId): PurityFlag | null {
  return (PURIFY_ACTIVITIES as Partial<Record<ActivityId, PurityFlag>>)[activity] ?? null;
}

export const PURITY_TEXT = {
  needed: "Hãy để dép và rửa tay chân ở Tam quan trước khi vào.",
  welcome: "Chào mừng đến chùa! Hãy để dép ở kệ và rửa tay chân trước khi vào trong.",
  done: "Đã để dép và rửa tay chân — thân tâm thanh tịnh, mời vào chùa.",
  gateLabel: "🩴 Để dép, rửa tay chân trước",
} as const;
