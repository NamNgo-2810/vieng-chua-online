/**
 * Tháp chuông (bell tower), code-drawn: an open tower on a stone platform with
 * red pillars and a tiled roof, the great bronze bell (đại hồng chung) with its
 * hanging log striker, a small incense shrine, pines and distant hills.
 * Layout: BELL_TOWER in config/areas.ts.
 */

import * as Phaser from "phaser";
import { BELL_TOWER } from "@/config/areas";
import { worldBackground, incenseSmoke, OUTLINE, type Paint } from "../pixel-art";

function pine(p: Paint, x: number, y: number) {
  const { px } = p;
  px(x - 3, y - 14, 6, 14, "#5a3d22");
  for (let i = 0; i < 4; i++) {
    const w = 34 - i * 7;
    px(x - w / 2, y - 22 - i * 10, w, 10, i % 2 ? "#2f6a3a" : "#3a7a44");
    px(x - w / 2, y - 22 - i * 10, w, 1, OUTLINE);
  }
}

function draw(p: Paint) {
  const { px, box, disc, g, W, H, hash } = p;

  // Sky, distant hills, then the lawn.
  px(0, 0, W, 70, "#bcd8e8");
  for (let x = 0; x < W; x++) {
    const h = 18 + Math.round(Math.sin(x / 37) * 8 + Math.sin(x / 13) * 3);
    px(x, 70 - h, 1, h, "#8fb08a");
  }
  px(0, 70, W, H - 70, "#6fa35a");
  for (let y = 70; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x, y);
    if (n < 0.07) px(x, y, 1, 1, "#5f9150");
    else if (n > 0.97) px(x, y, 1, 1, "#86b86b");
  }

  // Stone platform.
  const pl = { x: g(BELL_TOWER.platform.x), y: g(BELL_TOWER.platform.y), w: g(BELL_TOWER.platform.w), h: g(BELL_TOWER.platform.h) };
  box(pl.x, pl.y, pl.w, pl.h, "#c9bea6");
  for (let y = pl.y; y < pl.y + pl.h; y += 12) px(pl.x, y, pl.w, 1, "#b0a58c");
  for (let y = pl.y; y < pl.y + pl.h; y += 12) for (let x = pl.x + ((y / 12) % 2 ? 0 : 10); x < pl.x + pl.w; x += 20) px(x, y, 1, 12, "#b0a58c");
  // Steps down to the bottom path.
  for (let i = 0; i < 4; i++) px(g(630) - i * 2, pl.y + pl.h + i * 5, g(116) + i * 4, 5, i % 2 ? "#b0a58c" : "#c9bea6");
  px(g(630), H - 14, g(116), 14, "#d8cdb4");

  // Roof and beam over the bell.
  const roofY = pl.y - 40;
  px(pl.x - 20, roofY, pl.w + 40, 26, "#b5562e");
  for (let x = pl.x - 20; x < pl.x + pl.w + 20; x += 6) px(x, roofY + 3, 1, 23, "#8a3b1e");
  px(pl.x - 20, roofY, pl.w + 40, 3, "#d9a441");
  px(pl.x - 30, roofY + 20, 12, 6, "#b5562e");
  px(pl.x + pl.w + 18, roofY + 20, 12, 6, "#b5562e");
  px(pl.x - 20, roofY + 26, pl.w + 40, 1, OUTLINE);
  const bell = { x: g(BELL_TOWER.bell.x), top: g(BELL_TOWER.bell.top), bottom: g(BELL_TOWER.bell.bottom), w: g(BELL_TOWER.bell.w) };
  px(pl.x + 10, roofY + 34, pl.w - 20, 6, "#6b4a2b"); // beam

  // Pillars.
  for (const [wx, wy] of BELL_TOWER.pillars) {
    const x = g(wx) - 8;
    box(x, roofY + 26, 16, g(wy) + 8 - (roofY + 26), "#a83a2a");
    px(x + 2, roofY + 26, 3, g(wy) + 8 - (roofY + 26), "#c8503c");
    px(x - 2, g(wy) + 4, 20, 4, "#8f8a80");
  }

  // The great bell: rope, crown, body with bands, flared lip, striking lotus.
  px(bell.x - 1, roofY + 40, 3, bell.top - roofY - 40, "#5a3d22");
  disc(bell.x, bell.top + 6, 8, "#7a5a2a");
  disc(bell.x, bell.top + 22, bell.w / 2 - 6, "#9a6a2a");
  px(bell.x - bell.w / 2 + 6, bell.top + 22, bell.w - 12, bell.bottom - bell.top - 30, "#9a6a2a");
  px(bell.x - bell.w / 2 + 2, bell.bottom - 10, bell.w - 4, 6, "#8a5a22");
  px(bell.x - bell.w / 2 + 6, bell.top + 22, 8, bell.bottom - bell.top - 30, "#b8862a"); // highlight
  for (const fy of [0.35, 0.62]) px(bell.x - bell.w / 2 + 6, bell.top + (bell.bottom - bell.top) * fy, bell.w - 12, 2, "#6f8a5a"); // patina bands
  for (let x = bell.x - 24; x <= bell.x + 24; x += 12) px(x, bell.top + 30, 4, 14, "#7a5a2a"); // inscription panels
  disc(bell.x - bell.w / 2 + 16, bell.top + 56, 5, "#d9a441"); // striking lotus

  // The log striker hanging on two ropes, left of the bell.
  const logY = bell.top + 44;
  px(g(470), roofY + 40, 2, logY - roofY - 40, "#5a3d22");
  px(g(590), roofY + 40, 2, logY - roofY - 40, "#5a3d22");
  box(g(462), logY, g(140), 7, "#7a5230");
  px(g(462), logY + 2, g(140), 1, "#5a3d22");

  // Incense shrine.
  const sx = g(BELL_TOWER.shrine.x);
  const sy = g(BELL_TOWER.shrine.y);
  box(sx - 14, sy - 16, 28, 16, "#8f8a80");
  px(sx - 16, sy - 20, 32, 4, "#a8a297");
  box(sx - 6, sy - 26, 12, 6, "#b8862a");
  px(sx - 1, sy - 34, 1, 8, "#8a3b1e");
  px(sx + 2, sy - 33, 1, 7, "#8a3b1e");

  for (const [x, y] of BELL_TOWER.pines) pine(p, g(x), g(y) + 6);
}

/** Build the bell tower layer. */
export function buildBellTower(scene: Phaser.Scene) {
  worldBackground(scene, "area-bell-tower", draw);
  incenseSmoke(scene, BELL_TOWER.shrine.x + 2, BELL_TOWER.shrine.y - 70, -900);
}
