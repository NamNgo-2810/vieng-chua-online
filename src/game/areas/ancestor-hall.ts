/**
 * Nhà Tổ (ancestors' hall), code-drawn: a warm wooden interior with the altar
 * of the past masters (memorial tablets, two portraits, candles), a lacquered
 * plaque, calligraphy scrolls, a low tea table with a tea set, and a teaching
 * bench. Layout: ANCESTOR_HALL in config/areas.ts.
 */

import * as Phaser from "phaser";
import { ANCESTOR_HALL } from "@/config/areas";
import { worldBackground, incenseSmoke, glow, OUTLINE, type Paint } from "../pixel-art";

function portrait(p: Paint, x: number, y: number) {
  const { px, box, disc } = p;
  box(x, y, 22, 28, "#6b4a2b");
  px(x + 2, y + 2, 18, 24, "#e8dcc0");
  disc(x + 11, y + 11, 5, "#e3b08a"); // a master's face
  px(x + 6, y + 17, 10, 8, "#8a5418"); // robe
  px(x + 9, y + 10, 1, 1, OUTLINE);
  px(x + 12, y + 10, 1, 1, OUTLINE);
}

function scroll(p: Paint, x: number, y: number, h: number) {
  const { px, box, hash } = p;
  box(x, y, 14, h, "#f4efe0");
  px(x - 1, y - 2, 16, 3, "#6b4a2b");
  px(x - 1, y + h - 1, 16, 3, "#6b4a2b");
  for (let i = 0; i < h - 10; i += 7) {
    const w = 3 + Math.floor(hash(x, i) * 7);
    px(x + 3 + Math.floor(hash(i, x) * 4), y + 5 + i, w, 2, "#2b2119"); // brush strokes
    if (hash(x + 1, i) > 0.6) px(x + 6, y + 6 + i, 2, 4, "#2b2119");
  }
  px(x + 9, y + h - 9, 3, 3, "#c0392b"); // seal
}

function draw(p: Paint) {
  const { px, box, disc, g, W, H } = p;
  // Floor and walls.
  px(0, 0, W, H, "#b08a5c");
  for (let y = 80; y < H; y += 7) px(0, y, W, 1, "#9a7650");
  px(0, 0, W, 80, "#e8dcc0");
  for (let x = 0; x < W; x += 86) px(x, 0, 5, 80, "#5a3d22"); // wall posts
  px(0, 0, W, 6, "#5a3d22");
  px(0, 76, W, 4, "#5a3d22");
  for (const x0 of [0, W - 26]) px(x0, 0, 26, H, "#d8caa8");

  // Plaque above the altar (its words are drawn as text in buildAncestorHall).
  box(g(560), 14, g(256), 18, "#8a2a1e");
  px(g(560) + 2, 16, g(256) - 4, 2, "#d9a441");

  // The altar of the past masters.
  const a = { x: g(ANCESTOR_HALL.altar.x), y: g(ANCESTOR_HALL.altar.y), w: g(ANCESTOR_HALL.altar.w), h: g(ANCESTOR_HALL.altar.h) };
  box(a.x, a.y, a.w, a.h, "#5a3d22");
  px(a.x, a.y, a.w, 8, "#6b4a2b");
  px(a.x + 4, a.y + 14, a.w - 8, 2, "#d9a441");
  for (let x = a.x + 12; x < a.x + a.w - 20; x += 40) box(x, a.y + 24, 30, a.h - 34, "#4a3220");
  // Memorial tablets in a row, two portraits either side.
  for (let i = 0; i < 5; i++) {
    const tx = a.x + a.w / 2 - 50 + i * 22;
    box(tx, a.y - 30, 12, 30, "#2b2119");
    px(tx + 2, a.y - 27, 8, 2, "#d9a441");
    px(tx + 5, a.y - 22, 2, 18, "#d9a441");
  }
  portrait(p, a.x + 18, a.y - 34);
  portrait(p, a.x + a.w - 40, a.y - 34);
  for (const fx of [0.3, 0.7]) { box(a.x + a.w * fx, a.y - 10, 3, 10, "#d62828"); px(a.x + a.w * fx, a.y - 13, 3, 3, "#ffd84a"); }
  box(a.x + a.w / 2 - 8, a.y - 7, 16, 7, "#b8862a");
  disc(a.x + a.w * 0.18, a.y - 3, 4, "#ffcf33");
  disc(a.x + a.w * 0.82, a.y - 3, 4, "#ffcf33");

  // Calligraphy scrolls on the walls.
  scroll(p, g(130), 18, 54);
  scroll(p, g(190), 18, 54);
  scroll(p, g(1170), 18, 54);
  scroll(p, g(1230), 18, 54);

  // Pillars (dark wood).
  for (const [wx, wy] of ANCESTOR_HALL.pillars) {
    const x = g(wx) - 6;
    box(x, 0, 12, g(wy) + 6, "#5a3d22");
    px(x + 2, 0, 2, g(wy) + 6, "#6b4a2b");
  }

  // Tea table with a tea set, cushions around it.
  const t = { x: g(ANCESTOR_HALL.teaTable.x), y: g(ANCESTOR_HALL.teaTable.y), w: g(ANCESTOR_HALL.teaTable.w), h: g(ANCESTOR_HALL.teaTable.h) };
  box(t.x, t.y, t.w, t.h, "#5a3d22");
  px(t.x, t.y, t.w, 4, "#6b4a2b");
  box(t.x + t.w / 2 - 5, t.y - 6, 10, 7, "#5a7a6a"); // teapot
  px(t.x + t.w / 2 + 5, t.y - 4, 3, 1, "#5a7a6a");
  for (const dx of [-18, -10, 10, 18]) box(t.x + t.w / 2 + dx - 1, t.y - 3, 3, 3, "#efe3c4");
  for (const [dx, dy] of [[-12, 8], [t.w + 4, 8], [t.w / 2 - 6, t.h + 6]]) box(t.x + dx, t.y + dy, 12, 5, "#9e2a20");

  // Teaching bench with a cushion.
  const b = { x: g(ANCESTOR_HALL.benches.x), y: g(ANCESTOR_HALL.benches.y), w: g(ANCESTOR_HALL.benches.w), h: g(ANCESTOR_HALL.benches.h) };
  box(b.x, b.y, b.w, b.h, "#6b4a2b");
  px(b.x, b.y, b.w, 3, "#7a5a3e");
  box(b.x + b.w / 2 - 8, b.y - 3, 16, 5, "#c9a24a");

  // Doorway with daylight at the bottom.
  px(g(626), H - 14, g(124), 14, "#5a3d22");
  px(g(630), H - 12, g(116), 12, "#f3e4b0");
}

/** Build the ancestors' hall layer (incl. the plaque and scroll words). */
export function buildAncestorHall(scene: Phaser.Scene) {
  worldBackground(scene, "area-ancestor-hall", draw);
  const a = ANCESTOR_HALL.altar;
  incenseSmoke(scene, a.x + a.w / 2, a.y - 16, -900);
  for (const fx of [0.3, 0.7]) glow(scene, a.x + a.w * fx + 3, a.y - 22, 0.22, -899);
  scene.add
    .text(688, 30, "TỔ ĐỨC LƯU QUANG", { fontFamily: "serif", fontSize: "18px", color: "#f3d27a", fontStyle: "bold" })
    .setOrigin(0.5, 0)
    .setDepth(-890);
  scene.add
    .text(320, 112, "Uống nước nhớ nguồn", { fontFamily: "serif", fontSize: "13px", color: "#5a3d22", fontStyle: "italic" })
    .setOrigin(0.5, 0.5)
    .setDepth(-890);
}
