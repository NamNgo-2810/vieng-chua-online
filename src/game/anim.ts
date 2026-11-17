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
  /**
   * Prop size and anchor, tuned so the prop sits in the hands of a 64px
   * character. Scale multiplies the source image; x/y are fractions of the
   * cell from the feet (negative y is up). Defaults: PROP_DEFAULTS.
   */
  propScale?: number;
  propX?: number;
  propY?: number;
}

/** Fallback prop sizing per placement when an activity sets none. */
export const PROP_DEFAULTS: Record<Exclude<PropPlacement, "none">, { scale: number; x: number; y: number }> = {
  hand: { scale: 0.18, x: 0.2, y: -0.25 },
  seat: { scale: 0.42, x: 0, y: 0.03 },
};

const DEFAULT: AnimBehaviour = { style: "static", fps: 4, bob: 0, entryPop: true, prop: "hand" };

export const ACTIVITY_ANIM: Record<ActivityId, AnimBehaviour> = {
  WALKING: { style: "walk", fps: 6, bob: 0, entryPop: false, prop: "none" },
  // Incense sticks and the sutra are part of every incense/chanting pose
  // (painted art and placeholders alike), so no overlay is drawn for them.
  OFFER_INCENSE: { style: "loop", fps: 3, bob: 2, entryPop: true, prop: "none" },
  CHANTING: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  LISTENING: { style: "static", fps: 2, bob: 1, entryPop: true, prop: "none" },
  // Characters are code-drawn (game/sprite-painter.ts) and the tray, wooden
  // fish and bell striker are drawn into their poses, so no painted prop is
  // overlaid. Meditation happens on the world's cushions, so none here either.
  OFFERING: { style: "loop", fps: 3, bob: 2, entryPop: true, prop: "none" },
  WOODEN_FISH: { style: "strike", fps: 6, bob: 3, pulseMs: 520, entryPop: true, prop: "none" },
  MEDITATION: { style: "static", fps: 1, bob: 0, entryPop: true, prop: "none" },
  // The bell is a world object (decor), not something carried.
  RING_BELL: { style: "strike", fps: 4, bob: 4, pulseMs: 900, entryPop: true, prop: "none" },
  PRAYING: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  RELEASE_LANTERN: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  // A slow, heavy swing of the great bell's log striker.
  STRIKE_GREAT_BELL: { style: "strike", fps: 2, bob: 5, pulseMs: 7000, entryPop: true, prop: "none" },
  OFFER_TEA: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  WALKING_MEDITATION: { style: "loop", fps: 2, bob: 1, entryPop: true, prop: "none" },
  SIGN_GUESTBOOK: { style: "loop", fps: 2, bob: 1, entryPop: true, prop: "none" },
  DONATE: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  RELEASE_FISH: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  FEED_FISH: { style: "strike", fps: 3, bob: 2, pulseMs: 1400, entryPop: true, prop: "none" },
  READ_SUTRA: { style: "static", fps: 1, bob: 0, entryPop: true, prop: "none" },
  // Shaking the cylinder of fortune sticks.
  DRAW_FORTUNE: { style: "strike", fps: 4, bob: 2, pulseMs: 380, entryPop: true, prop: "none" },
  HANG_WISH: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  REMOVE_SHOES: { style: "static", fps: 1, bob: 0, entryPop: true, prop: "none" },
  WASH_HANDS_FEET: { style: "loop", fps: 3, bob: 1, entryPop: true, prop: "none" },
  // Each dip of the ladle pours water over the statue.
  BATHE_BUDDHA: { style: "strike", fps: 3, bob: 2, pulseMs: 1600, entryPop: true, prop: "none" },
  PICK_PEACH: { style: "loop", fps: 3, bob: 1.5, entryPop: true, prop: "none" },
  FEED_MONKEYS: { style: "strike", fps: 3, bob: 1.5, pulseMs: 1400, entryPop: true, prop: "none" },
};

export function animFor(activity: ActivityId): AnimBehaviour {
  return ACTIVITY_ANIM[activity] ?? DEFAULT;
}
