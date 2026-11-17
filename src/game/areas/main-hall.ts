/**
 * Chánh điện (main hall interior), code-drawn: three golden Buddhas on a red
 * and gold altar, a red carpet aisle, rows of cushions, the hall bell (left),
 * the great wooden fish (right), red pillars, lattice windows and lanterns.
 * Layout: MAIN_HALL in config/areas.ts.
 */

import * as Phaser from "phaser";
import { MAIN_HALL } from "@/config/areas";
import { worldBackground, incenseSmoke, glow, OUTLINE, type Paint } from "../pixel-art";
import { paintPilgrimMurals } from "../journey-decor";

function buddha(p: Paint, cx: number, baseY: number, s: number) {
  const { px, disc } = p;
  disc(cx, baseY - 50 * s, Math.round(22 * s), "#f3d27a"); // halo
  disc(cx, baseY - 50 * s, Math.round(19 * s), "#e8c05a");
  // Lotus pedestal.
  for (let i = -2; i <= 2; i++) disc(cx + i * 8 * s, baseY - 4, Math.round(6 * s), i % 2 ? "#f4a6c0" : "#f8c6d6");
  px(cx - 22 * s, baseY - 2, 44 * s, 3, "#3f8f4a");
  // Seated body: crossed legs, torso, robe fold.
  px(cx - 20 * s, baseY - 14 * s, 40 * s, 10 * s, "#d9a441");
  px(cx - 20 * s, baseY - 8 * s, 40 * s, 4 * s, "#b8862a");
  px(cx - 12 * s, baseY - 36 * s, 24 * s, 24 * s, "#e3b34e");
  px(cx + 4 * s, baseY - 36 * s, 8 * s, 24 * s, "#c49433");
  px(cx - 4 * s, baseY - 22 * s, 8 * s, 5 * s, "#f0c766"); // hands in lap
  // Head with ushnisha and a calm face.
  disc(cx, baseY - 44 * s, Math.round(8 * s), "#e8bb55");
  disc(cx, baseY - 54 * s, Math.round(3 * s), "#b8862a");
  px(cx - 4 * s, baseY - 44 * s, 3 * s, 1, OUTLINE);
  px(cx + 2 * s, baseY - 44 * s, 3 * s, 1, OUTLINE);
  px(cx - 1, baseY - 40 * s, 3, 1, "#a06a2a");
}

function draw(p: Paint) {
  const { px, box, disc, g, W, H, hash } = p;
  const altar = { x: g(MAIN_HALL.altar.x), y: g(MAIN_HALL.altar.y), w: g(MAIN_HALL.altar.w), h: g(MAIN_HALL.altar.h) };
  const doorX = g(MAIN_HALL.door.x);
  const doorW = g(MAIN_HALL.door.w);

  // Floor planks.
  px(0, 0, W, H, "#7a4a2a");
  for (let y = 75; y < H; y += 6) px(0, y, W, 1, "#6b3f22");
  for (let y = 75; y < H; y += 6) for (let x = (y / 6) % 2 ? 0 : 20; x < W; x += 40) px(x, y, 1, 6, "#6b3f22");

  // Back wall with a gold frieze.
  px(0, 0, W, 76, "#6e1f17");
  for (let x = 0; x < W; x += 16) px(x, 6, 8, 3, "#d9a441");
  px(0, 74, W, 2, OUTLINE);

  // Side walls with lattice windows.
  for (const x0 of [0, W - 30]) {
    px(x0, 0, 30, H, "#5a3d22");
    for (let y = 120; y < 250; y += 8) for (let x = x0 + 4; x < x0 + 26; x += 8) px(x, y, 6, 6, "#f3e4b0");
    px(x0 + (x0 ? 0 : 29), 0, 1, H, OUTLINE);
  }

  // Red carpet aisle from the altar to the door.
  px(doorX, altar.y + altar.h, doorW, H - (altar.y + altar.h), "#9e2a20");
  px(doorX, altar.y + altar.h, 2, H, "#d9a441");
  px(doorX + doorW - 2, altar.y + altar.h, 2, H, "#d9a441");
  for (let y = altar.y + altar.h + 8; y < H; y += 16) px(doorX + doorW / 2 - 3, y, 6, 2, "#d9a441");

  // Three Buddhas (the centre one larger), then the altar in front of them.
  buddha(p, altar.x + altar.w * 0.22, altar.y + 6, 0.9);
  buddha(p, altar.x + altar.w * 0.5, altar.y + 6, 1.15);
  buddha(p, altar.x + altar.w * 0.78, altar.y + 6, 0.9);
  box(altar.x, altar.y, altar.w, altar.h, "#8a2a1e");
  px(altar.x, altar.y, altar.w, 12, "#a83a2a");
  for (let x = altar.x + 8; x < altar.x + altar.w - 20; x += 36) {
    box(x, altar.y + 20, 28, altar.h - 30, "#7a2219");
    px(x + 6, altar.y + 30, 16, 2, "#d9a441");
    disc(x + 14, altar.y + 42, 5, "#d9a441");
  }
  // Offerings on the altar top: candles, vases, fruit, the incense burner.
  const top = altar.y + 4;
  for (const fx of [0.08, 0.92]) { box(altar.x + altar.w * fx, top - 10, 3, 10, "#d62828"); px(altar.x + altar.w * fx, top - 13, 3, 3, "#ffd84a"); }
  for (const fx of [0.3, 0.7]) { box(altar.x + altar.w * fx - 3, top - 12, 6, 12, "#e8e2d0"); disc(altar.x + altar.w * fx, top - 15, 4, "#f4a6c0"); }
  for (const fx of [0.4, 0.6]) { disc(altar.x + altar.w * fx, top - 3, 4, "#e8862a"); disc(altar.x + altar.w * fx + 5, top - 4, 3, "#d63a2f"); }
  box(altar.x + altar.w / 2 - 8, top - 8, 16, 8, "#b8862a");

  // Tây du ký silk paintings on the back wall, either side of the altar.
  paintPilgrimMurals(p);

  // Hanging yellow banners beside the altar.
  for (const x of [altar.x - 18, altar.x + altar.w + 10]) {
    box(x, 12, 8, 90, "#f5c400");
    for (let y = 22; y < 96; y += 14) px(x + 2, y, 4, 6, "#d62828");
  }

  // Pillars (red, gold base and cap).
  for (const [wx, wy] of MAIN_HALL.pillars) {
    const x = g(wx) - 7;
    const base = g(wy) + 7;
    box(x, 0, 14, base, "#a83a2a");
    px(x + 2, 0, 3, base, "#c8503c");
    px(x - 2, base - 4, 18, 4, "#d9a441");
    px(x - 1, 0, 16, 3, "#d9a441");
  }

  // The hall bell on its wooden frame (left).
  const bx = g(MAIN_HALL.bell.x);
  const by = g(MAIN_HALL.bell.y);
  px(bx - 16, by - 44, 3, 44, "#5a3d22");
  px(bx + 13, by - 44, 3, 44, "#5a3d22");
  px(bx - 18, by - 46, 36, 4, "#6b4a2b");
  disc(bx, by - 30, 11, "#b8862a");
  px(bx - 11, by - 30, 22, 12, "#b8862a");
  px(bx - 13, by - 19, 26, 3, "#9a6a2a");
  px(bx - 6, by - 36, 3, 14, "#d9a441");

  // The great wooden fish on its cushion stand (right).
  const wx = g(MAIN_HALL.woodfish.x);
  const wy = g(MAIN_HALL.woodfish.y);
  box(wx - 14, wy - 6, 28, 6, "#c9a24a");
  disc(wx, wy - 15, 11, "#b8322a");
  px(wx - 11, wy - 15, 22, 9, "#b8322a");
  px(wx - 8, wy - 14, 16, 2, OUTLINE);
  disc(wx - 6, wy - 20, 2, "#d9a441");
  px(wx + 10, wy - 26, 2, 12, "#6b4a2b");
  px(wx + 8, wy - 28, 6, 3, "#8a5a32");

  // Rows of cushions, leaving the aisle clear.
  const cs = { x: g(MAIN_HALL.cushions.x), y: g(MAIN_HALL.cushions.y), w: g(MAIN_HALL.cushions.w), h: g(MAIN_HALL.cushions.h) };
  for (let y = cs.y; y < cs.y + cs.h; y += 20) {
    for (let x = cs.x; x < cs.x + cs.w; x += 24) {
      if (x + 14 > doorX - 4 && x < doorX + doorW + 4) continue;
      box(x, y, 16, 6, hash(x, y) > 0.5 ? "#c9a24a" : "#b8903c");
      px(x + 2, y + 1, 12, 1, "#e0bd66");
    }
  }

  // Doorway with daylight at the bottom.
  px(doorX - 4, H - 14, doorW + 8, 14, "#5a3d22");
  px(doorX, H - 12, doorW, 12, "#f3e4b0");
  px(doorX, H - 12, doorW, 2, "#fff6d6");
}

/** Build the main hall layer. */
export function buildMainHall(scene: Phaser.Scene) {
  worldBackground(scene, "area-main-hall", draw);
  const a = MAIN_HALL.altar;
  incenseSmoke(scene, a.x + a.w / 2, a.y - 4, -900);
  for (const fx of [0.08, 0.92]) glow(scene, a.x + a.w * fx + 3, a.y - 18, 0.25, -899);
  for (const x of [120, 1256]) glow(scene, x, 200, 0.45, 10); // window light
  glow(scene, 688, 740, 0.9, 10); // daylight through the door
}
