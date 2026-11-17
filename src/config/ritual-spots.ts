/**
 * Ritual spots: places in the temple where activities happen. Walk within a
 * spot's radius and its activities unlock; starting one moves the player to
 * the spot's stand point (e.g. seated on the cushion). World px, feet coords,
 * over the painted background (see temple-map.ts).
 *
 * Design: design/game-brief.md — Features: activities tied to places.
 */

import type { ActivityId } from "./activities";
import type { Direction } from "@/lib/types";
import type { AreaId } from "./areas";

export type SpotId =
  | "BURNER" | "ALTAR" | "CUSHION_LEFT" | "CUSHION_RIGHT" | "BELL" | "WOODEN_FISH"
  | "BODHI" | "LANTERN_SHORE" | "PAVILION"
  | "HALL_ALTAR" | "HALL_CUSHIONS" | "HALL_BELL" | "HALL_WOODFISH"
  | "GREAT_BELL" | "TOWER_SHRINE"
  | "ANCESTOR_ALTAR" | "TEA_TABLE" | "TEACHING_BENCH"
  | "STONE_SEAT" | "GROVE_PATH" | "STREAM_BANK"
  | "HALL_FORTUNE" | "GUESTBOOK" | "DONATION_BOX" | "PIER" | "FEEDING_SHORE"
  | "READING_DESK" | "LAMP_CORNER" | "QUAN_AM" | "WISH_TREE" | "VIEW_BENCH"
  | "SHOE_RACK" | "WASH_BASIN" | "BATHE_BUDDHA"
  | "PEACH_TREE" | "MONKEY_ROCK" | "WATERFALL";

export interface RitualSpot {
  id: SpotId;
  /** Which area the spot is in. */
  area: AreaId;
  /** Vietnamese name shown in hints ("Đến <label> để …"). */
  label: string;
  /** Centre of the object the spot belongs to (activation is measured from here). */
  x: number;
  y: number;
  /** Activation distance in px from (x, y) to the player's feet. */
  radius: number;
  /** Where the player is placed when an activity starts here. */
  standX: number;
  standY: number;
  facing: Direction;
  /** Activities offered here (still filtered by role permission). */
  activities: ActivityId[];
}

export const RITUAL_SPOTS: RitualSpot[] = [
  {
    // Reach kept small so it never overlaps the altar's stand point.
    id: "BURNER", area: "COURTYARD", label: "lư hương", x: 690, y: 545, radius: 75,
    standX: 690, standY: 594, facing: "up", activities: ["OFFER_INCENSE"],
  },
  {
    id: "ALTAR", area: "COURTYARD", label: "ban thờ", x: 688, y: 470, radius: 110,
    standX: 605, standY: 506, facing: "up", activities: ["OFFERING", "PRAYING"],
  },
  {
    id: "CUSHION_LEFT", area: "COURTYARD", label: "bồ đoàn", x: 523, y: 560, radius: 60,
    standX: 523, standY: 574, facing: "down", activities: ["MEDITATION", "CHANTING", "LISTENING"],
  },
  {
    id: "CUSHION_RIGHT", area: "COURTYARD", label: "bồ đoàn", x: 853, y: 560, radius: 60,
    standX: 853, standY: 574, facing: "down", activities: ["MEDITATION", "CHANTING", "LISTENING"],
  },
  {
    id: "BELL", area: "COURTYARD", label: "chuông", x: 275, y: 345, radius: 75,
    standX: 238, standY: 360, facing: "right", activities: ["RING_BELL"],
  },
  {
    // Radius covers the natural approach up the gap between the centre and
    // right altar tables, where a pillar stops the player at about (800, 386).
    id: "WOODEN_FISH", area: "COURTYARD", label: "mõ", x: 870, y: 392, radius: 85,
    standX: 870, standY: 396, facing: "down", activities: ["WOODEN_FISH"],
  },

  // Lotus garden (Vườn sen) — positions follow GARDEN in config/areas.ts.
  {
    // Meditate in the shade of the Bodhi tree.
    id: "BODHI", area: "LOTUS_GARDEN", label: "cây bồ đề", x: 300, y: 372, radius: 70,
    standX: 300, standY: 392, facing: "down", activities: ["MEDITATION"],
  },
  {
    // The pond's south shore: set a flower lantern afloat.
    id: "LANTERN_SHORE", area: "LOTUS_GARDEN", label: "bờ hồ sen", x: 760, y: 630, radius: 80,
    standX: 760, standY: 636, facing: "up", activities: ["RELEASE_LANTERN"],
  },
  {
    // Chant or listen in the pavilion.
    id: "PAVILION", area: "LOTUS_GARDEN", label: "thủy đình", x: 1185, y: 440, radius: 80,
    standX: 1185, standY: 452, facing: "down", activities: ["CHANTING", "LISTENING"],
  },

  // Chánh điện (main hall) — positions follow MAIN_HALL in config/areas.ts.
  {
    id: "HALL_ALTAR", area: "MAIN_HALL", label: "bàn thờ Phật", x: 688, y: 320, radius: 90,
    standX: 688, standY: 335, facing: "up", activities: ["PRAYING", "OFFERING", "OFFER_INCENSE"],
  },
  {
    id: "HALL_CUSHIONS", area: "MAIN_HALL", label: "hàng bồ đoàn", x: 688, y: 510, radius: 120,
    standX: 640, standY: 520, facing: "up", activities: ["CHANTING", "MEDITATION", "LISTENING"],
  },
  {
    id: "HALL_BELL", area: "MAIN_HALL", label: "chuông gia trì", x: 330, y: 330, radius: 70,
    standX: 330, standY: 350, facing: "up", activities: ["RING_BELL"],
  },
  {
    id: "HALL_WOODFISH", area: "MAIN_HALL", label: "mõ lớn", x: 1046, y: 330, radius: 70,
    standX: 1046, standY: 350, facing: "up", activities: ["WOODEN_FISH"],
  },

  // Tháp chuông (bell tower) — BELL_TOWER in config/areas.ts.
  {
    id: "GREAT_BELL", area: "BELL_TOWER", label: "đại hồng chung", x: 560, y: 470, radius: 90,
    standX: 520, standY: 470, facing: "right", activities: ["STRIKE_GREAT_BELL"],
  },
  {
    id: "TOWER_SHRINE", area: "BELL_TOWER", label: "am thờ", x: 900, y: 470, radius: 70,
    standX: 900, standY: 490, facing: "up", activities: ["OFFER_INCENSE", "PRAYING"],
  },

  // Nhà Tổ (ancestors' hall) — ANCESTOR_HALL in config/areas.ts.
  {
    id: "ANCESTOR_ALTAR", area: "ANCESTOR_HALL", label: "bàn thờ Tổ", x: 688, y: 330, radius: 90,
    standX: 688, standY: 345, facing: "up", activities: ["OFFER_INCENSE", "PRAYING"],
  },
  {
    id: "TEA_TABLE", area: "ANCESTOR_HALL", label: "bàn trà", x: 360, y: 540, radius: 80,
    standX: 360, standY: 545, facing: "up", activities: ["OFFER_TEA"],
  },
  {
    id: "TEACHING_BENCH", area: "ANCESTOR_HALL", label: "phản giảng", x: 1010, y: 540, radius: 80,
    standX: 1010, standY: 545, facing: "up", activities: ["LISTENING", "MEDITATION"],
  },

  // Rừng trúc (bamboo grove) — BAMBOO_GROVE in config/areas.ts.
  {
    id: "STONE_SEAT", area: "BAMBOO_GROVE", label: "ghế đá", x: 300, y: 320, radius: 70,
    standX: 300, standY: 330, facing: "down", activities: ["MEDITATION"],
  },
  {
    id: "GROVE_PATH", area: "BAMBOO_GROVE", label: "lối đá", x: 688, y: 420, radius: 110,
    standX: 688, standY: 420, facing: "down", activities: ["WALKING_MEDITATION"],
  },
  {
    id: "STREAM_BANK", area: "BAMBOO_GROVE", label: "bờ suối", x: 900, y: 580, radius: 70,
    standX: 900, standY: 585, facing: "up", activities: ["LISTENING"],
  },

  // Chánh điện: fortune sticks at the front left of the altar.
  {
    id: "HALL_FORTUNE", area: "MAIN_HALL", label: "ống xăm", x: 500, y: 330, radius: 60,
    standX: 500, standY: 345, facing: "up", activities: ["DRAW_FORTUNE"],
  },

  // Tam quan (front gate) — TAM_QUAN in config/areas.ts.
  {
    id: "GUESTBOOK", area: "TAM_QUAN", label: "sổ vàng", x: 470, y: 650, radius: 70,
    standX: 470, standY: 670, facing: "up", activities: ["SIGN_GUESTBOOK"],
  },
  {
    id: "DONATION_BOX", area: "TAM_QUAN", label: "hòm công đức", x: 906, y: 650, radius: 70,
    standX: 906, standY: 670, facing: "up", activities: ["DONATE"],
  },

  // Hồ phóng sinh (release pond) — RELEASE_POND in config/areas.ts.
  {
    id: "PIER", area: "RELEASE_POND", label: "bến phóng sinh", x: 688, y: 505, radius: 60,
    standX: 688, standY: 500, facing: "up", activities: ["RELEASE_FISH"],
  },
  {
    id: "FEEDING_SHORE", area: "RELEASE_POND", label: "bờ hồ", x: 1000, y: 600, radius: 80,
    standX: 1000, standY: 605, facing: "up", activities: ["FEED_FISH"],
  },

  // Tàng kinh các (sutra library) — SUTRA_LIBRARY in config/areas.ts.
  {
    id: "READING_DESK", area: "SUTRA_LIBRARY", label: "bàn đọc kinh", x: 688, y: 585, radius: 80,
    standX: 688, standY: 590, facing: "up", activities: ["READ_SUTRA"],
  },
  {
    id: "LAMP_CORNER", area: "SUTRA_LIBRARY", label: "góc đèn", x: 300, y: 620, radius: 70,
    standX: 300, standY: 625, facing: "down", activities: ["MEDITATION", "LISTENING"],
  },

  // Đồi Quan Âm (Quan Âm hill) — QUAN_AM_HILL in config/areas.ts.
  {
    id: "QUAN_AM", area: "QUAN_AM_HILL", label: "tượng Quan Âm", x: 688, y: 330, radius: 90,
    standX: 688, standY: 345, facing: "up", activities: ["PRAYING", "OFFER_INCENSE"],
  },
  {
    id: "WISH_TREE", area: "QUAN_AM_HILL", label: "cây ước nguyện", x: 380, y: 430, radius: 80,
    standX: 380, standY: 440, facing: "up", activities: ["HANG_WISH"],
  },
  {
    id: "VIEW_BENCH", area: "QUAN_AM_HILL", label: "ghế ngắm cảnh", x: 1050, y: 500, radius: 70,
    standX: 1050, standY: 505, facing: "up", activities: ["MEDITATION"],
  },

  // Tam quan: purification before going inside (config/purity.ts).
  {
    id: "SHOE_RACK", area: "TAM_QUAN", label: "kệ để dép", x: 560, y: 300, radius: 70,
    standX: 560, standY: 305, facing: "up", activities: ["REMOVE_SHOES"],
  },
  {
    id: "WASH_BASIN", area: "TAM_QUAN", label: "chỗ rửa tay chân", x: 816, y: 300, radius: 70,
    standX: 816, standY: 305, facing: "up", activities: ["WASH_HANDS_FEET"],
  },

  // Courtyard before the main hall, left of the drums: bathing the infant Buddha.
  {
    id: "BATHE_BUDDHA", area: "COURTYARD", label: "tượng Tắm Phật", x: 372, y: 560, radius: 60,
    standX: 372, standY: 604, facing: "up", activities: ["BATHE_BUDDHA"],
  },

  // Hoa Quả Sơn — HOA_QUA_SON in config/areas.ts.
  {
    id: "PEACH_TREE", area: "HOA_QUA_SON", label: "cây đào tiên", x: 330, y: 500, radius: 80,
    standX: 330, standY: 505, facing: "up", activities: ["PICK_PEACH"],
  },
  {
    id: "MONKEY_ROCK", area: "HOA_QUA_SON", label: "tảng đá đàn khỉ", x: 1030, y: 500, radius: 85,
    standX: 1030, standY: 505, facing: "up", activities: ["FEED_MONKEYS"],
  },
  {
    id: "WATERFALL", area: "HOA_QUA_SON", label: "thác Thủy Liêm", x: 688, y: 420, radius: 90,
    standX: 688, standY: 420, facing: "up", activities: ["MEDITATION", "PRAYING"],
  },
];

/** Spots in one area. */
export function spotsIn(area: AreaId): RitualSpot[] {
  return RITUAL_SPOTS.filter((s) => s.area === area);
}

export const SPOTS_BY_ID: Record<SpotId, RitualSpot> = Object.fromEntries(
  RITUAL_SPOTS.map((s) => [s.id, s])
) as Record<SpotId, RitualSpot>;
