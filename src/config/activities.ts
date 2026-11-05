/**
 * Temple activities. IDs are stable strings stored in RTDB / Sheets.
 * Each activity maps to a character animation and (optionally) a visual prop.
 */

export const ACTIVITY_IDS = [
  "CHANTING",
  "OFFER_INCENSE",
  "LISTENING",
  "OFFERING",
  "WOODEN_FISH",
  "MEDITATION",
  "RING_BELL",
  "WALKING",
  "PRAYING",
] as const;

export type ActivityId = (typeof ACTIVITY_IDS)[number];

/** Prop keys reference entries in the asset manifest (config/asset-manifest). */
export type PropKey =
  | "sutra"
  | "incense"
  | "tray"
  | "woodfish"
  | "cushion"
  | "bell"
  | null;

export interface ActivityDef {
  id: ActivityId;
  label: string;
  /** Asset-manifest prop key, or null when no prop is shown. */
  prop: PropKey;
  /** Optional sound-effect key (wired up in the audio phase). */
  sfx: string | null;
}

export const ACTIVITIES: Record<ActivityId, ActivityDef> = {
  CHANTING: { id: "CHANTING", label: "Tụng kinh", prop: "sutra", sfx: null },
  OFFER_INCENSE: { id: "OFFER_INCENSE", label: "Dâng hương", prop: "incense", sfx: "incense" },
  LISTENING: { id: "LISTENING", label: "Nghe kinh", prop: null, sfx: null },
  OFFERING: { id: "OFFERING", label: "Dâng lễ", prop: "tray", sfx: null },
  WOODEN_FISH: { id: "WOODEN_FISH", label: "Gõ mõ", prop: "woodfish", sfx: "woodfish" },
  MEDITATION: { id: "MEDITATION", label: "Thiền định", prop: "cushion", sfx: null },
  RING_BELL: { id: "RING_BELL", label: "Thỉnh chuông", prop: "bell", sfx: "bell" },
  WALKING: { id: "WALKING", label: "Đi dạo", prop: null, sfx: null },
  PRAYING: { id: "PRAYING", label: "Cầu nguyện", prop: null, sfx: null },
};

export const ACTIVITY_LIST: ActivityDef[] = ACTIVITY_IDS.map((id) => ACTIVITIES[id]);

export function isActivityId(value: unknown): value is ActivityId {
  return typeof value === "string" && (ACTIVITY_IDS as readonly string[]).includes(value);
}

/**
 * Activities currently selectable in the activity picker. Temporarily limited
 * while we iterate; the full set above is intact. WALKING stays implicitly
 * available (it's the movement state) but is not an explicit picker button.
 */
export const ENABLED_ACTIVITY_IDS: readonly ActivityId[] = [
  "CHANTING",
  "OFFER_INCENSE",
  "OFFERING",
] as const;

export function isActivityEnabled(id: ActivityId): boolean {
  return (ENABLED_ACTIVITY_IDS as readonly string[]).includes(id);
}
