/**
 * Đồi Quan Âm (Quan Âm hill), code-drawn: open sky over distant mountains and
 * the temple roofs far below, a white Quan Âm statue on a lotus pedestal with
 * a willow vase, an incense urn, the wish tree (its red ribbons grow with the
 * wishes people hang), frangipani trees and a stone bench at the viewpoint.
 * Layout: QUAN_AM_HILL in config/areas.ts.
 */

import * as Phaser from "phaser";
import { QUAN_AM_HILL } from "@/config/areas";
import { worldBackground, incenseSmoke, OUTLINE, type Paint } from "../pixel-art";

function frangipani(p: Paint, x: number, y: number) {
  const { px, disc, hash } = p;
  px(x - 2, y - 22, 4, 22, "#7a5a3e");
  px(x - 8, y - 22, 16, 3, "#7a5a3e");
  disc(x, y - 30, 14, "#4f8a3a");
  for (let i = 0; i < 10; i++) {
    const fx = x - 12 + hash(i, x) * 24;
    const fy = y - 42 + hash(x, i) * 20;
    px(fx, fy, 3, 3, "#fff7e0");
    px(fx + 1, fy + 1, 1, 1, "#ffd84a");
  }
}

function draw(p: Paint) {
  const { px, box, disc, g, W, H, hash } = p;
  // Sky (the day/night overlay tints it), clouds, distant mountains.
  for (let y = 0; y < 120; y++) px(0, y, W, 1, y < 40 ? "#a8cce4" : y < 80 ? "#bcd8e8" : "#d4e6ee");
  for (let i = 0; i < 6; i++) { const cx = 60 + i * 110; disc(cx, 28 + (i % 3) * 8, 10, "#f4f8fb"); disc(cx + 12, 30 + (i % 3) * 8, 8, "#f4f8fb"); }
  for (let x = 0; x < W; x++) {
    const h1 = 30 + Math.round(Math.sin(x / 50) * 12 + Math.sin(x / 17) * 4);
    px(x, 120 - h1, 1, h1, "#8fa8b8");
    const h2 = 18 + Math.round(Math.sin(x / 31 + 1) * 8);
    px(x, 125 - h2, 1, h2, "#7a9a8a");
  }
  // The temple far below: little roof silhouettes in the valley.
  for (let i = 0; i < 7; i++) {
    const rx = 180 + i * 50 + (i % 2) * 14;
    px(rx, 112, 26, 6, "#a8563a");
    px(rx + 4, 108, 18, 4, "#b5662e");
  }
  // Hilltop grass.
  px(0, 125, W, H - 125, "#7aaa5e");
  for (let y = 125; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x, y);
    if (n < 0.06) px(x, y, 1, 1, "#6a9a50");
    else if (n > 0.97) px(x, y, 1, 1, "#92c072");
  }
  // Stone path down at the bottom-left.
  for (let i = 0; i < 6; i++) px(g(110) + i * 4, H - 12 - i * 10, 40, 8, i % 2 ? "#b9ad92" : "#c9bea6");

  // Quan Âm on a lotus pedestal, with a halo and willow vase.
  const s = { x: g(QUAN_AM_HILL.statue.x), y: g(QUAN_AM_HILL.statue.y) };
  box(s.x - 30, s.y - 10, 60, 10, "#a8a297"); // plinth
  for (let i = -3; i <= 3; i++) disc(s.x + i * 8, s.y - 14, 6, i % 2 ? "#f4c6d6" : "#f8dce6"); // lotus petals
  disc(s.x, s.y - 62, 20, "#f6e6a8"); // halo
  px(s.x - 13, s.y - 48, 26, 32, "#f7f5ee"); // robe
  px(s.x - 16, s.y - 24, 32, 8, "#efece2");
  px(s.x + 5, s.y - 48, 8, 30, "#e2ded2"); // fold shade
  disc(s.x, s.y - 56, 8, "#f3eee4"); // head
  px(s.x - 9, s.y - 66, 18, 8, "#ffffff"); // veil
  px(s.x - 3, s.y - 56, 2, 1, OUTLINE);
  px(s.x + 2, s.y - 56, 2, 1, OUTLINE);
  box(s.x - 18, s.y - 38, 5, 8, "#dfe9e4"); // vase
  px(s.x - 16, s.y - 46, 1, 8, "#5f9a4a"); // willow sprig
  px(s.x - 18, s.y - 46, 2, 1, "#7fb24a");
  // Incense urn in front.
  box(s.x - 8, s.y + 14, 16, 8, "#b8862a");
  px(s.x - 1, s.y + 6, 1, 8, "#8a3b1e");

  // Wish tree (ribbons are added live by the scene from the wish notes).
  const t = { x: g(QUAN_AM_HILL.wishTree.x), y: g(QUAN_AM_HILL.wishTree.y) };
  disc(t.x, t.y - 46, 34, "#3f7a3c");
  for (let i = 0; i < 140; i++) {
    const a = hash(i, 9) * Math.PI * 2;
    const r = Math.sqrt(hash(9, i)) * 32;
    px(t.x + Math.cos(a) * r, t.y - 46 + Math.sin(a) * r, 3, 2, hash(i, 11) > 0.5 ? "#4f9a45" : "#5fae52");
  }
  px(t.x - 7, t.y - 18, 14, 18, "#5a3d22");
  px(t.x - 20, t.y - 26, 40, 3, "#6b4a2b"); // low branch for ribbons

  // Stone bench at the viewpoint.
  const b = { x: g(QUAN_AM_HILL.bench.x), y: g(QUAN_AM_HILL.bench.y) };
  box(b.x - 20, b.y - 7, 40, 5, "#a8a297");
  px(b.x - 17, b.y - 2, 4, 4, "#8f8a80");
  px(b.x + 13, b.y - 2, 4, 4, "#8f8a80");

  for (const [x, y] of QUAN_AM_HILL.frangipani) frangipani(p, g(x), g(y) + 8);
}

/** Wish ribbons on the tree's branch, one per wish (up to 40), hung where a hand can reach. */
export function drawWishRibbons(scene: Phaser.Scene, count: number, previous?: Phaser.GameObjects.Graphics) {
  previous?.destroy();
  const gfx = scene.add.graphics().setDepth(QUAN_AM_HILL.wishTree.y - 1);
  const n = Math.min(40, count);
  const t = QUAN_AM_HILL.wishTree;
  for (let i = 0; i < n; i++) {
    // Spread through the canopy (world y ~260–330, above the ritual hint label
    // that sits over the trunk); deterministic per index.
    const x = t.x - 55 + ((i * 37) % 110);
    const y = t.y - 140 + ((i * 23) % 70);
    // A ribbon: dark outline, red (or gold) cloth, gold knot where it is tied.
    const h = 18 + (i % 3) * 5;
    gfx.fillStyle(0x3b2414, 1);
    gfx.fillRect(x - 1, y - 1, 7, h + 2);
    gfx.fillStyle(i % 4 === 0 ? 0xffd84a : 0xd62828, 1);
    gfx.fillRect(x, y, 5, h);
    gfx.fillStyle(0xd9a441, 1);
    gfx.fillRect(x - 1, y - 2, 7, 3);
  }
  return gfx;
}

/** Build the Quan Âm hill layer. */
export function buildQuanAmHill(scene: Phaser.Scene) {
  worldBackground(scene, "area-quan-am-hill", draw);
  incenseSmoke(scene, QUAN_AM_HILL.statue.x - 2, QUAN_AM_HILL.statue.y + 12, -900);
}
