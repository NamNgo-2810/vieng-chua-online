/**
 * Code-drawn placeholder characters. Pure Canvas 2D, no Phaser, so the same
 * painter feeds the game textures (placeholder-sprites.ts) and the onboarding
 * preview. Each sprite is a 64x64 cell drawn on a 32x32 logical grid (2px per
 * pixel), bottom-centre anchored like the sliced Gemini sprites.
 *
 * These stand in until real art exists: design/assets/character-art-spec.md.
 */

import type { ActivityId } from "@/config/activities";
import type { LookPalette } from "@/config/appearances";
import type { Direction } from "@/lib/types";

/** Output cell size in px (matches the manifest's 64px cell). */
export const SPRITE_CELL = 64;
const GRID = 32;
const PX = SPRITE_CELL / GRID;

export type BodyPose = "stand" | "sit";
export type ArmPose = "sides" | "joined" | "raise" | "tray" | "strike" | "lap" | "book";

/** Everything the painter needs to draw one frame. */
export interface PoseSpec {
  body: BodyPose;
  arms: ArmPose;
  facing: Direction;
  /** Walk step: 0/1 alternate the feet; undefined when standing still. */
  step?: 0 | 1;
  eyesClosed?: boolean;
  /** Head tilted down (praying). */
  bowed?: boolean;
  /** A held/used item drawn as part of the pose. */
  item?: HeldItem;
  /** Feet drawn bare (sandals left on the rack at the Tam quan). */
  barefoot?: boolean;
}

/** Items drawn into a pose, so no painted prop overlays a drawn character. */
export type HeldItem =
  | "tray" | "woodfish" | "striker" | "lantern" | "tea"
  | "scroll" | "envelope" | "fishbowl" | "feed" | "sticks" | "ribbon"
  | "sandals" | "water" | "ladle" | "peach" | "banana";

/** The pose each activity is drawn in (front-facing). */
export const ACTIVITY_POSE: Record<ActivityId, PoseSpec> = {
  WALKING: { body: "stand", arms: "sides", facing: "down" },
  CHANTING: { body: "sit", arms: "book", facing: "down", eyesClosed: true },
  OFFER_INCENSE: { body: "stand", arms: "raise", facing: "down", bowed: true },
  LISTENING: { body: "sit", arms: "lap", facing: "down" },
  OFFERING: { body: "stand", arms: "tray", facing: "down", item: "tray" },
  WOODEN_FISH: { body: "sit", arms: "strike", facing: "down", eyesClosed: true, item: "woodfish" },
  MEDITATION: { body: "sit", arms: "lap", facing: "down", eyesClosed: true },
  RING_BELL: { body: "stand", arms: "strike", facing: "right", item: "striker" },
  PRAYING: { body: "stand", arms: "joined", facing: "down", eyesClosed: true, bowed: true },
  RELEASE_LANTERN: { body: "stand", arms: "tray", facing: "down", bowed: true, item: "lantern" },
  STRIKE_GREAT_BELL: { body: "stand", arms: "strike", facing: "right", item: "striker" },
  OFFER_TEA: { body: "sit", arms: "lap", facing: "down", bowed: true, item: "tea" },
  WALKING_MEDITATION: { body: "stand", arms: "joined", facing: "down", eyesClosed: true },
  SIGN_GUESTBOOK: { body: "stand", arms: "tray", facing: "down", item: "scroll" },
  DONATE: { body: "stand", arms: "tray", facing: "down", bowed: true, item: "envelope" },
  RELEASE_FISH: { body: "stand", arms: "tray", facing: "down", bowed: true, item: "fishbowl" },
  FEED_FISH: { body: "stand", arms: "strike", facing: "right", item: "feed" },
  READ_SUTRA: { body: "sit", arms: "book", facing: "down" },
  DRAW_FORTUNE: { body: "stand", arms: "raise", facing: "down", bowed: true, item: "sticks" },
  HANG_WISH: { body: "stand", arms: "raise", facing: "down", item: "ribbon" },
  REMOVE_SHOES: { body: "stand", arms: "tray", facing: "down", bowed: true, item: "sandals" },
  WASH_HANDS_FEET: { body: "stand", arms: "tray", facing: "down", bowed: true, item: "water" },
  BATHE_BUDDHA: { body: "stand", arms: "strike", facing: "up", item: "ladle" },
  PICK_PEACH: { body: "stand", arms: "raise", facing: "up", item: "peach" },
  FEED_MONKEYS: { body: "stand", arms: "strike", facing: "right", item: "banana" },
};

/**
 * Walk-sheet frame order. Left reuses the right-facing frames because the game
 * mirrors sprites for "left" (Character.setDirection), as with the real art.
 */
export const WALK_FRAMES: { facing: Direction; step: 0 | 1 }[] = [
  { facing: "down", step: 0 },
  { facing: "down", step: 1 },
  { facing: "up", step: 0 },
  { facing: "up", step: 1 },
  { facing: "right", step: 0 },
  { facing: "right", step: 1 },
];

/** walkDirs descriptor for WALK_FRAMES (parsed by walkFrameRanges). */
export const PLACEHOLDER_WALK_DIRS = "down:0-1,up:2-3,left:4-5,right:4-5";

/** Minimal 2D context surface the painter uses (eases testing and reuse). */
export interface PaintTarget {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/**
 * Paint one character frame into `ctx` with its cell's top-left at (ox, oy).
 * Draws on the logical grid; `palette.scale` shrinks the figure toward its feet.
 */
export function paintCharacter(
  ctx: PaintTarget,
  palette: LookPalette,
  pose: PoseSpec,
  ox = 0,
  oy = 0
): void {
  const s = palette.scale;
  // Scale around the bottom-centre of the cell (x 16, y 32).
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    const gx = 16 + (x - 16) * s;
    const gy = 32 + (y - 32) * s;
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(ox + gx * PX),
      Math.round(oy + gy * PX),
      Math.max(1, Math.round(w * s * PX)),
      Math.max(1, Math.round(h * s * PX))
    );
  };
  /** A filled box with a 1-cell outline. */
  const box = (x: number, y: number, w: number, h: number, color: string) => {
    px(x - 1, y - 1, w + 2, h + 2, palette.outline);
    px(x, y, w, h, color);
  };

  if (pose.body === "sit") paintSeated(px, box, palette, pose);
  else paintStanding(px, box, palette, pose);
}

type Px = (x: number, y: number, w: number, h: number, color: string) => void;

function paintStanding(px: Px, box: Px, p: LookPalette, pose: PoseSpec) {
  const side = pose.facing === "left" || pose.facing === "right";
  const bob = pose.step === 1 ? 1 : 0;

  // Feet (alternate when walking).
  const lf = pose.step === 0 ? -1 : pose.step === 1 ? 1 : 0;
  // Sandals are dark; bare feet are skin-coloured with a thin outline.
  const foot = pose.barefoot ? p.skin : p.outline;
  box(12, 29 + Math.max(0, lf), 3, 2, foot);
  box(17, 29 + Math.max(0, -lf), 3, 2, foot);

  // Robe: a trapezoid widening toward the hem.
  const top = 16 + bob;
  for (let y = top; y <= 29; y++) {
    const t = (y - top) / (29 - top);
    const half = Math.round((side ? 4 : 5) + t * 2);
    px(16 - half - 1, y, half * 2 + 2, 1, p.outline);
    px(16 - half, y, half * 2, 1, p.robe);
    px(16 + half - 2, y, 2, 1, p.robeShade); // shaded side
  }
  px(10, 29, 12, 1, p.outline); // hem line

  if (pose.facing !== "up") {
    if (p.sash) {
      // Red kasaya draped from the left shoulder to the right hip.
      for (let i = 0; i < 9; i++) px(12 + i, top + 1 + i, 2, 2, p.accent);
    } else {
      px(15, top, 2, 6, p.accent); // collar / front opening
    }
    if (p.beads) for (let i = 0; i < 5; i++) px(13 + i, top + 1 + (i % 2), 1, 1, "#4a2a14");
  }

  paintArms(px, box, p, pose, top);
  paintHead(px, box, p, pose, 5 + bob + (pose.bowed ? 1 : 0));
  paintItem(px, box, p, pose, top);

  if (p.stick && pose.arms === "sides") {
    px(23, 18 + bob, 1, 13, "#6b4a2b");
    px(22, 17 + bob, 3, 1, "#6b4a2b");
  }
  if (p.carry && pose.arms === "sides") paintCarry(px, p, bob);
}

/** The pilgrims' weapons, held upright at the right hand. */
function paintCarry(px: Px, p: LookPalette, bob: number) {
  const gold = "#ffd84a";
  switch (p.carry) {
    case "staff": // Như Ý Kim Cô Bổng: red with gold bands at both ends
      px(23, 6 + bob, 1, 25, "#b8322a");
      px(23, 5 + bob, 1, 3, gold);
      px(23, 29 + bob, 1, 3, gold);
      break;
    case "rake": // the nine-tooth rake
      px(23, 10 + bob, 1, 21, "#6b4a2b");
      px(20, 8 + bob, 7, 2, "#9aa0a8");
      for (let i = 0; i < 4; i++) px(20 + i * 2, 10 + bob, 1, 2, "#9aa0a8");
      break;
    case "spade": // the crescent-moon spade
      px(23, 9 + bob, 1, 21, "#6b4a2b");
      px(21, 7 + bob, 5, 1, "#c0c8d0");
      px(21, 5 + bob, 1, 2, "#c0c8d0");
      px(25, 5 + bob, 1, 2, "#c0c8d0");
      px(22, 30 + bob, 3, 2, "#c0c8d0");
      break;
  }
}

function paintSeated(px: Px, box: Px, p: LookPalette, pose: PoseSpec) {
  // Crossed legs: a wide low mound.
  box(7, 26, 18, 4, p.robe);
  px(7, 28, 18, 2, p.robeShade);
  // Torso.
  const top = 19;
  box(10, top, 12, 8, p.robe);
  px(19, top, 3, 8, p.robeShade);
  if (p.sash) for (let i = 0; i < 6; i++) px(11 + i, top + 1 + i, 2, 2, p.accent);
  else px(15, top, 2, 5, p.accent);
  if (p.beads) for (let i = 0; i < 5; i++) px(13 + i, top + 1 + (i % 2), 1, 1, "#4a2a14");

  paintArms(px, box, p, pose, top);
  paintHead(px, box, p, pose, 9);
  paintItem(px, box, p, pose, top);
}

/** Draw the pose's held item (tray of fruit, wooden fish + mallet, bell striker). */
function paintItem(px: Px, box: Px, p: LookPalette, pose: PoseSpec, top: number) {
  switch (pose.item) {
    case "tray":
      // Red lacquer tray at the hands, with an orange, a pear and an apple.
      box(9, top + 4, 14, 2, "#8a2a1e");
      box(11, top + 1, 3, 3, "#e8862a");
      box(15, top, 3, 4, "#8bbf4a");
      box(19, top + 1, 2, 3, "#d63a2f");
      break;
    case "woodfish":
      // Red wooden fish on the floor at the right, mallet in the raised hand.
      box(25, 25, 5, 4, "#b8322a");
      px(26, 26, 2, 1, p.outline); // the slot
      px(27, top - 2, 1, 4, "#6b4a2b"); // mallet handle
      box(26, top - 3, 3, 1, "#8a5a32"); // mallet head
      break;
    case "lantern":
      // A pink lotus lantern with a lit candle, held out at the hands.
      box(11, top + 3, 10, 3, "#f4a6c0");
      box(13, top + 1, 6, 2, "#f8c6d6");
      px(15, top - 1, 2, 2, "#ffd84a"); // flame
      px(15, top - 2, 2, 1, "#fff2a8");
      break;
    case "tea":
      // A small teapot and cup held out in the lap.
      box(12, top + 3, 5, 3, "#5a7a6a"); // teapot
      px(17, top + 4, 2, 1, "#5a7a6a"); // spout
      px(13, top + 2, 3, 1, "#3e5a4a"); // lid
      box(19, top + 4, 2, 2, "#efe3c4"); // cup
      break;
    case "scroll":
      // An open guestbook page and a brush.
      box(10, top + 3, 12, 4, "#f4efe0");
      px(12, top + 4, 7, 1, "#2b2119");
      px(20, top + 1, 1, 4, "#5a3d22");
      break;
    case "envelope":
      // A red offering envelope held out in both hands.
      box(12, top + 3, 8, 5, "#d62828");
      px(15, top + 4, 2, 2, "#ffd84a");
      break;
    case "fishbowl":
      // A bowl of water with a small orange fish.
      box(10, top + 3, 12, 5, "#9ac8e0");
      px(14, top + 5, 4, 2, "#f08a24");
      break;
    case "feed":
      // A small pouch, with grains flying toward the water.
      box(25, top + 1, 3, 3, "#c9a24a");
      px(29, top, 1, 1, "#e8c56a");
      px(30, top + 2, 1, 1, "#e8c56a");
      break;
    case "sticks":
      // A bamboo cylinder of fortune sticks, one sticking out.
      box(14, top - 7, 5, 7, "#a8743f");
      px(15, top - 11, 1, 4, "#d9a441");
      px(17, top - 10, 1, 3, "#d9a441");
      break;
    case "ribbon":
      // A red wish ribbon lifted toward the branch.
      px(15, top - 12, 2, 10, "#d62828");
      px(17, top - 12, 1, 6, "#ffd84a");
      break;
    case "sandals":
      // A pair of sandals held in the hands, about to go on the rack.
      box(11, top + 4, 4, 2, "#6b4a2b");
      box(17, top + 4, 4, 2, "#6b4a2b");
      px(12, top + 4, 1, 1, "#c9a24a");
      px(18, top + 4, 1, 1, "#c9a24a");
      break;
    case "water":
      // Cupped hands with water dripping.
      box(13, top + 3, 6, 3, "#9ac8e0");
      px(15, top + 7, 1, 2, "#9ac8e0");
      px(17, top + 8, 1, 2, "#9ac8e0");
      break;
    case "ladle":
      // A wooden ladle held out, tipping water.
      px(20, top + 2, 6, 1, "#8a5a32");
      box(26, top + 1, 3, 3, "#a8743f");
      px(28, top + 4, 1, 3, "#9ac8e0");
      break;
    case "peach":
      // An immortal peach lifted toward the branch.
      box(15, top - 7, 4, 4, "#f4a0a8");
      px(16, top - 7, 2, 1, "#ffd0d4");
      px(18, top - 8, 2, 1, "#5f9a4a"); // leaf
      break;
    case "banana":
      // A banana held out to the monkeys.
      px(27, top, 1, 3, "#f2d24a");
      px(28, top - 1, 2, 1, "#f2d24a");
      px(26, top + 3, 2, 1, "#8a6a2a");
      break;
    case "striker":
      // A wooden log swung forward to strike the temple bell.
      box(26, top + 1, 5, 2, "#7a5230");
      break;
  }
}

function paintArms(px: Px, box: Px, p: LookPalette, pose: PoseSpec, top: number) {
  const sleeve = p.robeShade;
  const hand = p.skin;
  switch (pose.arms) {
    case "sides":
      if (pose.facing === "left" || pose.facing === "right") {
        box(15, top + 2, 3, 7, sleeve);
        px(15, top + 9, 3, 2, hand);
      } else {
        box(9, top + 1, 2, 8, sleeve);
        box(21, top + 1, 2, 8, sleeve);
        px(9, top + 9, 2, 2, hand);
        px(21, top + 9, 2, 2, hand);
      }
      break;
    case "joined":
      box(12, top + 2, 3, 4, sleeve);
      box(17, top + 2, 3, 4, sleeve);
      box(15, top + 1, 2, 4, hand); // palms together at the chest
      break;
    case "raise":
      box(11, top - 1, 3, 4, sleeve);
      box(18, top - 1, 3, 4, sleeve);
      box(14, top - 3, 4, 3, hand); // hands lifted to the forehead
      // Three incense sticks rising from the hands, glowing tips.
      for (const sx of [14, 16, 18]) {
        px(sx, top - 11, 1, 8, "#8a3b1e");
        px(sx, top - 12, 1, 1, "#ff7a2a");
      }
      break;
    case "tray":
      box(10, top + 3, 3, 3, sleeve);
      box(19, top + 3, 3, 3, sleeve);
      px(11, top + 5, 2, 2, hand);
      px(19, top + 5, 2, 2, hand);
      break;
    case "strike":
      box(20, top + 1, 6, 3, sleeve); // arm swung out to the side
      box(26, top + 1, 2, 3, hand);
      box(9, top + 2, 2, 5, sleeve);
      break;
    case "book":
      box(11, top + 4, 10, 4, "#efe3c4"); // open sutra on the lap
      px(16, top + 4, 1, 4, p.outline);
      break;
    case "lap":
      box(13, top + 5, 6, 2, hand); // hands resting in the lap
      break;
  }
}

function paintHead(px: Px, box: Px, p: LookPalette, pose: PoseSpec, top: number) {
  const left = 11;
  box(left, top, 10, 10, p.skin);

  const hairColor = p.hairColor;
  if (p.hair === "bald") {
    px(left + 2, top, 6, 1, hairColor); // scalp sheen line
  } else {
    px(left, top, 10, 3, hairColor);
    if (p.hair === "bun") box(left + 3, top - 3, 4, 3, hairColor);
    if (pose.facing === "up") px(left, top, 10, 8, hairColor);
    else if (pose.facing === "down") {
      px(left, top + 3, 1, 4, hairColor);
      px(left + 9, top + 3, 1, 4, hairColor);
    }
  }

  paintHeadgear(px, p, pose, left, top);
  if (pose.facing === "up") return; // back of the head: no face

  const eyeY = top + 5;
  const eye = p.outline;
  const brow = p.whiteBrows ? "#f4f4f4" : null;
  if (pose.facing === "down") {
    if (pose.eyesClosed) {
      px(left + 2, eyeY, 2, 1, eye);
      px(left + 6, eyeY, 2, 1, eye);
    } else {
      px(left + 2, eyeY - 1, 2, 2, eye);
      px(left + 6, eyeY - 1, 2, 2, eye);
    }
    if (brow) {
      px(left + 1, eyeY - 3, 3, 1, brow);
      px(left + 6, eyeY - 3, 3, 1, brow);
    }
    px(left + 4, eyeY + 3, 2, 1, "#b0705a"); // gentle mouth
  } else {
    const ex = pose.facing === "right" ? left + 7 : left + 1;
    px(ex, eyeY - (pose.eyesClosed ? 0 : 1), 2, pose.eyesClosed ? 1 : 2, eye);
    if (brow) px(ex - 1, eyeY - 3, 3, 1, brow);
  }
  paintFaceCostume(px, p, pose, left, top);
}

/** Crowns, circlets and ears: drawn from every side. */
function paintHeadgear(px: Px, p: LookPalette, pose: PoseSpec, left: number, top: number) {
  const gold = "#ffd84a";
  switch (p.costume) {
    case "tang": // the five-buddha (Tỳ Lư) crown
      px(left, top - 1, 10, 2, gold);
      for (let i = 0; i < 5; i++) px(left + i * 2, top - 3, 1, 2, gold);
      if (pose.facing !== "up") px(left + 4, top - 1, 2, 1, "#b8322a");
      break;
    case "wukong": // the golden circlet, and the fur ruff around the face
      px(left, top + 2, 10, 1, gold);
      px(left - 1, top + 3, 1, 5, p.hairColor);
      px(left + 10, top + 3, 1, 5, p.hairColor);
      break;
    case "bajie": // big floppy ears
      px(left - 2, top + 1, 3, 4, p.hairColor);
      px(left + 9, top + 1, 3, 4, p.hairColor);
      break;
  }
}

/** Snouts and beards: drawn over the face (front and side views). */
function paintFaceCostume(px: Px, p: LookPalette, pose: PoseSpec, left: number, top: number) {
  const front = pose.facing === "down";
  switch (p.costume) {
    case "wukong": // a lighter muzzle
      if (front) px(left + 3, top + 7, 4, 2, "#f4dcb8");
      break;
    case "bajie": { // the snout with two nostrils
      const sx = front ? left + 3 : pose.facing === "right" ? left + 8 : left - 1;
      px(sx, top + 6, front ? 4 : 3, 3, "#f7cccc");
      px(sx + 1, top + 7, 1, 1, p.outline);
      if (front) px(sx + 2, top + 7, 1, 1, p.outline);
      break;
    }
    case "sha": // a red beard
      px(left + 1, top + 7, 8, 3, p.hairColor);
      if (front) px(left + 3, top + 7, 4, 1, "#7a4a3a");
      break;
  }
}
