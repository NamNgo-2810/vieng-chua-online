/**
 * Which sound goes with what. All sounds are synthesized (lib/sound-library.ts,
 * lib/sfx.ts) and follow the sound-effects toggle (🔔) and its volume.
 *
 *  - ACTIVITY_CUES: played once when a ritual starts. Rituals with lasting
 *    audio (config/activity-audio.ts: chanting track, wooden fish, great bell)
 *    have none here, so their sound is not doubled.
 *  - EVENT_SOUNDS: merit, unlocks, gates, other people's chat.
 *  - AREA_AMBIENCE: a quiet bed of water/stream/wind plus bird calls per area.
 */

import type { ActivityId } from "./activities";
import type { AreaId } from "./areas";

export type CueName =
  | "incense" | "offering" | "handBell" | "singingBowl" | "lowBowl" | "teaPour" | "waterPlop"
  | "coins" | "pageTurn" | "sticksShake" | "windChime" | "brush"
  | "sandals" | "waterPour" | "monkeys";

export const ACTIVITY_CUES: Record<ActivityId, CueName | null> = {
  WALKING: null,
  CHANTING: null, // its own track
  WOODEN_FISH: null, // repeating knocks
  STRIKE_GREAT_BELL: null, // repeating tolls
  OFFER_INCENSE: "incense",
  OFFERING: "offering",
  RING_BELL: "handBell",
  PRAYING: "singingBowl",
  LISTENING: "singingBowl",
  MEDITATION: "lowBowl",
  WALKING_MEDITATION: "lowBowl",
  OFFER_TEA: "teaPour",
  RELEASE_LANTERN: "waterPlop",
  SIGN_GUESTBOOK: "brush",
  DONATE: "coins",
  RELEASE_FISH: "waterPlop",
  FEED_FISH: "waterPlop",
  READ_SUTRA: "pageTurn",
  DRAW_FORTUNE: "sticksShake",
  HANG_WISH: "windChime",
  REMOVE_SHOES: "sandals",
  WASH_HANDS_FEET: "waterPour",
  BATHE_BUDDHA: "waterPour",
  PICK_PEACH: "windChime",
  FEED_MONKEYS: "monkeys",
};

/** Notes in Hz. */
export const EVENT_SOUNDS = {
  merit: [783.99, 1046.5], // G5 → C6, a small "ding-ding"
  unlock: [523.25, 659.25, 783.99, 1046.5], // C major arpeggio
} as const;

export interface AmbienceSpec {
  water?: number;
  stream?: number;
  wind?: number;
  /** Bird calls per minute (average). */
  birds?: number;
}

export const AREA_AMBIENCE: Record<AreaId, AmbienceSpec> = {
  COURTYARD: { birds: 5, wind: 0.3 },
  MAIN_HALL: {}, // indoors: quiet, only the music and the rituals
  LOTUS_GARDEN: { water: 0.8, birds: 8 },
  BELL_TOWER: { wind: 0.8, birds: 4 },
  ANCESTOR_HALL: {},
  BAMBOO_GROVE: { stream: 0.9, wind: 0.6, birds: 6 },
  TAM_QUAN: { birds: 6, wind: 0.3 },
  RELEASE_POND: { water: 0.9, birds: 7 },
  SUTRA_LIBRARY: {}, // indoors: hushed
  QUAN_AM_HILL: { wind: 0.9, birds: 3 },
  HOA_QUA_SON: { stream: 1, water: 0.6, birds: 7, wind: 0.3 }, // the waterfall
};

/** Ambience volume relative to the effects volume (keeps it in the background). */
export const AMBIENCE_LEVEL = 0.6;

/** Other players' chat pops this much quieter than other effects. */
export const CHAT_POP_LEVEL = 0.5;
