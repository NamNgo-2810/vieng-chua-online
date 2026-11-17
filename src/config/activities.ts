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
  "RELEASE_LANTERN",
  "STRIKE_GREAT_BELL",
  "OFFER_TEA",
  "WALKING_MEDITATION",
  "SIGN_GUESTBOOK",
  "DONATE",
  "RELEASE_FISH",
  "FEED_FISH",
  "READ_SUTRA",
  "DRAW_FORTUNE",
  "HANG_WISH",
  "REMOVE_SHOES",
  "WASH_HANDS_FEET",
  "BATHE_BUDDHA",
  "PICK_PEACH",
  "FEED_MONKEYS",
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
  // Lotus garden only (config/ritual-spots.ts): set a flower lantern afloat.
  RELEASE_LANTERN: { id: "RELEASE_LANTERN", label: "Thả hoa đăng", prop: null, sfx: "incense" },
  // Bell tower only: the great bronze bell, any role (its toll is heard by all).
  STRIKE_GREAT_BELL: { id: "STRIKE_GREAT_BELL", label: "Thỉnh đại hồng chung", prop: null, sfx: null },
  // Ancestors' hall only: offer tea to the past masters.
  OFFER_TEA: { id: "OFFER_TEA", label: "Dâng trà", prop: null, sfx: "incense" },
  // Bamboo grove only: slow mindful walking on the stone path.
  WALKING_MEDITATION: { id: "WALKING_MEDITATION", label: "Thiền hành", prop: null, sfx: null },
  // Tam quan (front gate): sign the guestbook everyone can read; give at the donation box.
  SIGN_GUESTBOOK: { id: "SIGN_GUESTBOOK", label: "Ghi sổ vàng", prop: null, sfx: null },
  DONATE: { id: "DONATE", label: "Cúng dường", prop: null, sfx: null },
  // Hồ phóng sinh (release pond).
  RELEASE_FISH: { id: "RELEASE_FISH", label: "Phóng sinh", prop: null, sfx: null },
  FEED_FISH: { id: "FEED_FISH", label: "Cho cá ăn", prop: null, sfx: null },
  // Tàng kinh các (sutra library): reveals a verse.
  READ_SUTRA: { id: "READ_SUTRA", label: "Đọc kinh", prop: null, sfx: null },
  // Chánh điện: fortune sticks reveal a verse.
  DRAW_FORTUNE: { id: "DRAW_FORTUNE", label: "Xin xăm", prop: null, sfx: null },
  // Đồi Quan Âm: hang a wish on the shared wish tree.
  HANG_WISH: { id: "HANG_WISH", label: "Treo điều ước", prop: null, sfx: null },
  // Tam quan: leave your sandals on the rack and wash hands and feet before
  // going inside (config/purity.ts).
  REMOVE_SHOES: { id: "REMOVE_SHOES", label: "Để dép", prop: null, sfx: null },
  WASH_HANDS_FEET: { id: "WASH_HANDS_FEET", label: "Rửa tay chân", prop: null, sfx: null },
  // Courtyard, before the main hall doors: pour water over the infant Buddha.
  BATHE_BUDDHA: { id: "BATHE_BUDDHA", label: "Tắm Phật", prop: null, sfx: null },
  // Hoa Quả Sơn (config/journey.ts): pick an immortal peach for the altar, feed the monkeys.
  PICK_PEACH: { id: "PICK_PEACH", label: "Hái đào tiên", prop: null, sfx: null },
  FEED_MONKEYS: { id: "FEED_MONKEYS", label: "Cho khỉ ăn", prop: null, sfx: null },
};

export const ACTIVITY_LIST: ActivityDef[] = ACTIVITY_IDS.map((id) => ACTIVITIES[id]);

export function isActivityId(value: unknown): value is ActivityId {
  return typeof value === "string" && (ACTIVITY_IDS as readonly string[]).includes(value);
}

/**
 * Activities selectable in the picker. All are on now that each has a place
 * (config/ritual-spots.ts) and a pose; remove an ID to hide one. WALKING is
 * the movement state and never a picker button.
 */
export const ENABLED_ACTIVITY_IDS: readonly ActivityId[] = [
  "CHANTING",
  "OFFER_INCENSE",
  "LISTENING",
  "OFFERING",
  "WOODEN_FISH",
  "MEDITATION",
  "RING_BELL",
  "WALKING",
  "PRAYING",
  "RELEASE_LANTERN",
  "STRIKE_GREAT_BELL",
  "OFFER_TEA",
  "WALKING_MEDITATION",
  "SIGN_GUESTBOOK",
  "DONATE",
  "RELEASE_FISH",
  "FEED_FISH",
  "READ_SUTRA",
  "DRAW_FORTUNE",
  "HANG_WISH",
  "REMOVE_SHOES",
  "WASH_HANDS_FEET",
  "BATHE_BUDDHA",
  "PICK_PEACH",
  "FEED_MONKEYS",
] as const;

export function isActivityEnabled(id: ActivityId): boolean {
  return (ENABLED_ACTIVITY_IDS as readonly string[]).includes(id);
}
