/**
 * Tàng kinh các (sutra library), code-drawn: wall shelves of scrolls and
 * bound sutras, two shelf islands, a reading desk with an open sutra and an
 * oil lamp, a lamp-lit corner with a cushion, hanging lanterns and a plaque.
 * Layout: SUTRA_LIBRARY in config/areas.ts.
 */

import * as Phaser from "phaser";
import { SUTRA_LIBRARY } from "@/config/areas";
import { worldBackground, glow, OUTLINE, type Paint } from "../pixel-art";
import { buildGoldenStaff } from "../journey-decor";

const SPINES = ["#8a2a1e", "#5a7a6a", "#d9a441", "#3e4a7a", "#7a5a3e", "#9e2a20", "#e8dcc0"];

function shelf(p: Paint, x: number, y: number, w: number, h: number) {
  const { px, box, hash } = p;
  box(x, y, w, h, "#4a3220");
  for (let row = y + 3; row < y + h - 6; row += 14) {
    px(x + 2, row + 11, w - 4, 2, "#2e1f14"); // the board
    for (let bx = x + 3; bx < x + w - 5; ) {
      const bw = 2 + Math.floor(hash(bx, row) * 3);
      const bh = 7 + Math.floor(hash(row, bx) * 4);
      if (hash(bx, row + 1) > 0.82) {
        px(bx, row + 11 - 4, 6, 4, "#efe3c4"); // a rolled scroll lying flat
        px(bx + 6, row + 11 - 4, 1, 4, "#c9a24a");
        bx += 8;
      } else {
        px(bx, row + 11 - bh, bw, bh, SPINES[Math.floor(hash(bx, row + 2) * SPINES.length)]);
        bx += bw + 1;
      }
    }
  }
}

function draw(p: Paint) {
  const { px, box, disc, g, W, H } = p;
  px(0, 0, W, H, "#6b4a2b");
  for (let y = 75; y < H; y += 6) px(0, y, W, 1, "#5a3d22");
  px(0, 0, W, 76, "#4a3220");
  for (const x0 of [0, W - 40]) px(x0, 0, 40, H, "#3e2a1a");

  const bs = SUTRA_LIBRARY.backShelves;
  shelf(p, g(bs.x), g(bs.y) - 50, g(bs.w), g(bs.h) + 50);
  for (const i of SUTRA_LIBRARY.islands) {
    shelf(p, g(i.x), g(i.y) - 30, g(i.w), g(i.h) + 30);
  }

  // Plaque above the shelves (its words are text, added in buildSutraLibrary).
  box(g(560), 6, g(256), 16, "#8a2a1e");

  // Reading desk: open sutra, oil lamp, cushion.
  const d = SUTRA_LIBRARY.desk;
  box(g(d.x), g(d.y), g(d.w), g(d.h), "#5a3d22");
  px(g(d.x), g(d.y), g(d.w), 3, "#7a5a3e");
  box(g(d.x + d.w / 2) - 14, g(d.y) - 4, 28, 6, "#f4efe0");
  px(g(d.x + d.w / 2), g(d.y) - 4, 1, 6, "#b9ad92");
  for (let i = 0; i < 4; i++) px(g(d.x + d.w / 2) - 12 + i * 3, g(d.y) - 3, 1, 4, "#2b2119");
  px(g(d.x) + 6, g(d.y) - 6, 4, 6, "#b8862a");
  px(g(d.x) + 7, g(d.y) - 9, 2, 3, "#ffd84a");
  box(g(d.x + d.w / 2) - 8, g(d.y + d.h) + 12, 16, 5, "#c9a24a");

  // Lamp corner: standing lamp and a cushion.
  const lc = SUTRA_LIBRARY.lampCorner;
  px(g(lc.x) - 26, g(lc.y) - 40, 2, 40, "#5a3d22");
  box(g(lc.x) - 30, g(lc.y) - 50, 10, 10, "#f3e4b0");
  box(g(lc.x) - 8, g(lc.y) + 2, 16, 5, "#9e2a20");

  // Hanging lanterns.
  for (const x of [g(240), g(688), g(1136)]) {
    px(x, 30, 1, 14, OUTLINE);
    disc(x, 50, 6, "#d62828");
    px(x - 3, 44, 7, 2, "#d9a441");
  }

  // Doorway back to the hall, on the left.
  px(0, g(600) - 2, 42, g(90) + 4, "#2e1f14");
  px(2, g(600), 38, g(90), "#f3e4b0");
}

/** Build the sutra library layer. */
export function buildSutraLibrary(scene: Phaser.Scene) {
  worldBackground(scene, "area-sutra-library", draw);
  buildGoldenStaff(scene);
  glow(scene, SUTRA_LIBRARY.staffStand.x, SUTRA_LIBRARY.staffStand.y - 10, 0.35, -899);
  const d = SUTRA_LIBRARY.desk;
  glow(scene, d.x + 16, d.y - 14, 0.3, -899);
  glow(scene, SUTRA_LIBRARY.lampCorner.x - 50, SUTRA_LIBRARY.lampCorner.y - 90, 0.45, -899);
  for (const x of [240, 688, 1136]) glow(scene, x, 100, 0.35, -899);
  scene.add
    .text(688, 28, "TÀNG KINH CÁC", { fontFamily: "serif", fontSize: "16px", fontStyle: "bold", color: "#f3d27a" })
    .setOrigin(0.5, 0.5)
    .setDepth(-890);
}
