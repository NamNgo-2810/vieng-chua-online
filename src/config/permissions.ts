/**
 * Role → allowed activities. This single map drives both the UI (which activity
 * buttons appear) and server-side validation (which activity changes are
 * accepted). Keep it in sync with docs/05-role-activity-matrix.md.
 */

import { ACTIVITY_IDS, type ActivityId } from "./activities";
import type { RoleId } from "./roles";

export const PERMISSIONS: Record<RoleId, ActivityId[]> = {
  // Abbot (host) can do everything.
  TRU_TRI: [...ACTIVITY_IDS],
  // Senior Monk: all ritual + lay activities except ringing the bell.
  HOA_THUONG: [
    "CHANTING",
    "OFFER_INCENSE",
    "LISTENING",
    "OFFERING",
    "WOODEN_FISH",
    "MEDITATION",
    "WALKING",
    "PRAYING",
  ],
  // Visitor: lay activities only.
  KHACH_THAP_PHUONG: [
    "OFFER_INCENSE",
    "LISTENING",
    "OFFERING",
    "MEDITATION",
    "WALKING",
    "PRAYING",
  ],
};

/** Default activity a player starts with when entering the temple. */
export const DEFAULT_ACTIVITY: ActivityId = "WALKING";

export function canPerform(role: RoleId, activity: ActivityId): boolean {
  return PERMISSIONS[role]?.includes(activity) ?? false;
}

export function allowedActivities(role: RoleId): ActivityId[] {
  return PERMISSIONS[role] ?? [];
}
