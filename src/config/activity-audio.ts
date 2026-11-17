/**
 * Sound that plays for as long as the local player keeps doing an activity.
 * Separate from the one-shot cues in lib/sfx.ts (played when an activity starts).
 * All of it follows the sound-effects toggle (🔔) and its volume.
 *
 *  - `track`: an audio file looped while the activity lasts; background music
 *    is lowered to MUSIC_DUCK of its volume meanwhile.
 *  - `repeat`: a synthesized sound repeated every `everyMs`, timed to the
 *    activity's strike animation (game/anim.ts pulseMs).
 *  - `heardByAll`: other players hear one `repeat.sound` when someone starts
 *    the activity (the great bell carries across the temple).
 */

import type { ActivityId } from "./activities";
import { ACTIVITY_ANIM } from "@/game/anim";

export type RepeatSound = "woodKnock" | "greatBell";

export interface ActivityAudio {
  track?: string;
  repeat?: { everyMs: number; sound: RepeatSound };
  heardByAll?: boolean;
}

export const ACTIVITY_AUDIO: Partial<Record<ActivityId, ActivityAudio>> = {
  CHANTING: { track: "/assets/All_money_back_my_home.mp3" },
  WOODEN_FISH: { repeat: { everyMs: ACTIVITY_ANIM.WOODEN_FISH.pulseMs!, sound: "woodKnock" } },
  STRIKE_GREAT_BELL: { repeat: { everyMs: ACTIVITY_ANIM.STRIKE_GREAT_BELL.pulseMs!, sound: "greatBell" }, heardByAll: true },
};

/** Background music volume multiplier while an activity track plays. */
export const MUSIC_DUCK = 0.3;

/** How loud another player's great bell is, relative to the effects volume. */
export const HEARD_BY_ALL_LEVEL = 0.6;

export function activityAudio(activity: ActivityId | null | undefined): ActivityAudio | null {
  return activity ? ACTIVITY_AUDIO[activity] ?? null : null;
}
