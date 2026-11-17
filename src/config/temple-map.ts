/**
 * Where players can walk, in world pixels over the painted background
 * (public/assets/background/temple-bg.png, drawn 1:1 at TEMPLE 1376x768).
 * Coordinates are the character's FEET (sprites anchor bottom-centre).
 *
 * A point is walkable when it lies inside at least one WALKABLE rect and
 * inside no BLOCKER rect. Tune by opening the game with `?debug=walk`, which
 * draws both sets over the scene.
 *
 * Design: design/game-brief.md — Features: activities tied to places.
 */

/** Axis-aligned rectangle: x/y top-left, w/h size, in world px. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** What it is, for the debug overlay and for whoever tunes it. */
  label: string;
}

export const WALKABLE: Rect[] = [
  { x: 95, y: 395, w: 970, h: 360, label: "stone courtyard" },
  // The terrace runs past the last pillar into the right garden (the only way
  // in: a potted tree and the pond rocks close the courtyard side).
  { x: 330, y: 345, w: 755, h: 55, label: "hall terrace" },
  { x: 60, y: 275, w: 245, h: 230, label: "left garden" },
  { x: 1060, y: 285, w: 265, h: 200, label: "right garden" },
];

export const BLOCKERS: Rect[] = [
  // Hall front: pillar bases on the terrace.
  { x: 318, y: 340, w: 34, h: 40, label: "pillar" },
  { x: 410, y: 340, w: 36, h: 40, label: "pillar" },
  { x: 562, y: 340, w: 36, h: 40, label: "pillar" },
  { x: 776, y: 340, w: 36, h: 40, label: "pillar" },
  { x: 928, y: 340, w: 36, h: 40, label: "pillar" },
  { x: 1024, y: 340, w: 36, h: 40, label: "pillar" },
  // Altar tables and the potted trees beside them.
  { x: 372, y: 418, w: 172, h: 82, label: "left altar table" },
  { x: 597, y: 418, w: 182, h: 82, label: "centre altar table" },
  { x: 832, y: 418, w: 172, h: 82, label: "right altar table" },
  { x: 303, y: 400, w: 72, h: 66, label: "potted tree" },
  { x: 1000, y: 400, w: 74, h: 66, label: "potted tree" },
  // Courtyard centre and front.
  { x: 645, y: 505, w: 90, h: 76, label: "incense burner" },
  { x: 598, y: 600, w: 180, h: 124, label: "front offering table" },
  // Gardens.
  { x: 45, y: 270, w: 70, h: 75, label: "tree trunk" },
  { x: 90, y: 420, w: 50, h: 82, label: "stone statue" },
  { x: 225, y: 420, w: 50, h: 82, label: "stone statue" },
  { x: 1055, y: 465, w: 240, h: 230, label: "lotus pond and rocks" },
  { x: 1110, y: 360, w: 50, h: 60, label: "flowering tree trunk" },
  // Edges: stairs, statues and foliage along the bottom.
  { x: 40, y: 500, w: 75, h: 70, label: "side stairs" },
  { x: 0, y: 600, w: 360, h: 168, label: "statue and foliage" },
  { x: 360, y: 640, w: 115, h: 128, label: "flowering tree" },
  { x: 895, y: 640, w: 170, h: 128, label: "trees" },
  { x: 1220, y: 640, w: 156, h: 128, label: "trees" },
];

/**
 * Where new players appear: open stone floor on the left of the courtyard,
 * below the garden statues — clear of every ritual spot (so they arrive
 * walking) and above the bottom strip the player dock covers on screen.
 */
export const SPAWN_AREA: Rect = { x: 150, y: 520, w: 170, h: 65, label: "spawn" };
