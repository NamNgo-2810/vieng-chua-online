/**
 * Activity -> animation behaviour mapping.
 *
 * This is the single source of truth for how each activity animates. The
 * Character class reads it to decide frame rate, looping, flip-based "striking"
 * motion, and the resting pose. Keeping it declarative means new activities or
 * tuning never touch the Character logic.
 */

import type { ActivityId } from "@/config/activities";

export type AnimStyle =
  | "walk" // directional walk cycle (loops while moving)
  | "loop" // continuous gentle loop (e.g. chanting sway)
  | "strike" // repetitive pulse (wooden fish, bell)
  | "static"; // single resting pose (meditation, listening)

/**
 * Where an activity's prop is drawn relative to the character:
 *  - "hand": held in front at hand/chest height (incense, sutra, bell)
 *  - "seat": a ground item the character sits on/beside, drawn BEHIND and
 *            under the feet (meditation cushion) — never over the face
 *  - "none": the prop is set-dressing in the world, not on the character
 */
export type PropPlacement = "hand" | "seat" | "none";

export interface AnimBehaviour {
  style: AnimStyle;
  /** Frames-per-second when the atlas is a multi-frame strip. */
  fps: number;
  /**
   * For "loop"/"strike": a subtle vertical bob amplitude (px) applied via tween
   * so even single-frame poses feel alive without extra art.
   */
  bob: number;
  /** For "strike": pulse period in ms (how often the motion repeats). */
  pulseMs?: number;
  /** Optional one-shot "pop" scale when the activity is first entered. */
  entryPop: boolean;
  /** How/whether the activity's prop is drawn on the character. */
  prop: PropPlacement;
}

const DEFAULT: AnimBehaviour = { style: "static", fps: 4, bob: 0, entryPop: true, prop: "hand" };

export const ACTIVITY_ANIM: Record<ActivityId, AnimBehaviour> = {
  WALKING: { style: "walk", fps: 6, bob: 0, entryPop: false, prop: "none" },
  OFFER_INCENSE: { style: "loop", fps: 3, bob: 2, entryPop: true, prop: "hand" },
  CHANTING: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "hand" },
  LISTENING: { style: "static", fps: 2, bob: 1, entryPop: true, prop: "none" },
  OFFERING: { style: "loop", fps: 3, bob: 2, entryPop: true, prop: "hand" },
  WOODEN_FISH: { style: "strike", fps: 6, bob: 3, pulseMs: 520, entryPop: true, prop: "hand" },
  // The monk sits cross-legged already; the cushion belongs under him, not over his face.
  MEDITATION: { style: "static", fps: 1, bob: 0, entryPop: true, prop: "seat" },
  RING_BELL: { style: "strike", fps: 4, bob: 4, pulseMs: 900, entryPop: true, prop: "hand" },
  PRAYING: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
};

export function animFor(activity: ActivityId): AnimBehaviour {
  return ACTIVITY_ANIM[activity] ?? DEFAULT;
}
