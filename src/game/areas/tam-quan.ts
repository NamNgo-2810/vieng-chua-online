/**
 * Tam quan (the temple's three-door front gate), code-drawn: the gate with a
 * two-tier tiled roof, a stone approach path, lotus ponds either side, banyan
 * trees, the guestbook lectern and the donation box.
 * Layout: TAM_QUAN in config/areas.ts.
 */

import * as Phaser from "phaser";
import { TAM_QUAN } from "@/config/areas";
import { worldBackground, OUTLINE, type Paint } from "../pixel-art";

function banyan(p: Paint, x: number, y: number) {
  const { px, disc, hash } = p;
  disc(x, y - 34, 30, "#2f6a3a");
  for (let i = 0; i < 120; i++) {
    const a = hash(i, x) * Math.PI * 2;
    const r = Math.sqrt(hash(x, i)) * 28;
    px(x + Math.cos(a) * r, y - 34 + Math.sin(a) * r, 3, 2, hash(i, y) > 0.5 ? "#3f8a44" : "#4f9a4a");
  }
  px(x - 6, y - 12, 12, 14, "#5a3d22");
  for (let i = -3; i <= 3; i++) px(x + i * 6, y - 20, 1, 14 + (i % 2) * 4, "#6b4a2b"); // hanging roots
}

function pond(p: Paint, x: number, y: number, w: number, h: number) {
  const { px, disc, hash } = p;
  px(x - 3, y - 3, w + 6, h + 6, "#8f8a80");
  px(x, y, w, h, "#4f8fb0");
  for (let i = 0; i < 30; i++) px(x + hash(i, x) * (w - 6), y + hash(x, i) * (h - 2), 5, 1, "#6aa8c6");
  for (let i = 0; i < 14; i++) {
    const cx = x + 6 + hash(i, y) * (w - 12);
    const cy = y + 6 + hash(y, i) * (h - 12);
    disc(cx, cy, 4, "#3f8f4a");
    if (hash(i, i) > 0.5) disc(cx + 1, cy - 2, 2, "#f4a6c0");
  }
}

function draw(p: Paint) {
  const { px, box, g, W, H, hash } = p;
  // Lawn.
  px(0, 0, W, H, "#6fa35a");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x, y);
    if (n < 0.07) px(x, y, 1, 1, "#5f9150");
    else if (n > 0.97) px(x, y, 1, 1, "#86b86b");
  }
  // Boundary walls left and right of the gate.
  px(0, 60, g(440), 30, "#d8c7a0");
  px(g(936), 60, W - g(936), 30, "#d8c7a0");
  px(0, 56, g(440), 5, "#b5562e");
  px(g(936), 56, W - g(936), 5, "#b5562e");

  // Stone approach path.
  const pathX = g(560);
  const pathW = g(256);
  px(pathX, g(210), pathW, H - g(210), "#d8cdb4");
  for (let y = g(210); y < H; y += 10) px(pathX, y, pathW, 1, "#b9ad92");
  for (let y = g(210); y < H; y += 10) for (let x = pathX + ((y / 10) % 2 ? 0 : 16); x < pathX + pathW; x += 32) px(x, y, 1, 10, "#b9ad92");

  // The gate: three doorways under a two-tier roof.
  const gx = g(TAM_QUAN.gate.x);
  const gy = g(TAM_QUAN.gate.y);
  const gw = g(TAM_QUAN.gate.w);
  const gh = g(TAM_QUAN.gate.h);
  box(gx + 6, gy + 24, gw - 12, gh - 24, "#e8dcc0");
  px(gx + 6, gy + gh - 6, gw - 12, 6, "#c9bea6");
  const door = (cx: number, w: number, h: number) => {
    px(cx - w / 2, gy + gh - h, w, h, "#5a3d22");
    px(cx - w / 2 + 2, gy + gh - h + 2, w - 4, h - 2, "#7a2a1e");
    px(cx - 1, gy + gh - h + 2, 2, h - 2, "#5a1e16");
  };
  door(gx + gw / 2, g(TAM_QUAN.doors.w), 46);
  door(gx + gw * 0.18, 28, 32);
  door(gx + gw * 0.82, 28, 32);
  // Lower roof, upper roof with lifted eaves and a ridge.
  px(gx - 8, gy + 18, gw + 16, 10, "#b5562e");
  for (let x = gx - 8; x < gx + gw + 8; x += 5) px(x, gy + 19, 1, 9, "#8a3b1e");
  px(gx + gw * 0.25, gy, gw * 0.5, 14, "#b5562e");
  for (let x = gx + gw * 0.25; x < gx + gw * 0.75; x += 5) px(x, gy + 1, 1, 13, "#8a3b1e");
  px(gx + gw * 0.25 - 8, gy + 10, 8, 4, "#b5562e");
  px(gx + gw * 0.75, gy + 10, 8, 4, "#b5562e");
  px(gx + gw * 0.25, gy, gw * 0.5, 2, "#d9a441");
  px(gx - 8, gy + 18, gw + 16, 1, "#d9a441");
  px(gx - 8, gy + 28, gw + 16, 1, OUTLINE);
  box(gx + gw / 2 - 30, gy + 32, 60, 12, "#8a2a1e"); // name plaque (text added in buildTamQuan)

  pond(p, g(TAM_QUAN.pondLeft.x), g(TAM_QUAN.pondLeft.y), g(TAM_QUAN.pondLeft.w), g(TAM_QUAN.pondLeft.h));
  pond(p, g(TAM_QUAN.pondRight.x), g(TAM_QUAN.pondRight.y), g(TAM_QUAN.pondRight.w), g(TAM_QUAN.pondRight.h));

  // Guestbook lectern: red cloth, open book, brush.
  const gb = { x: g(TAM_QUAN.guestbook.x), y: g(TAM_QUAN.guestbook.y) };
  px(gb.x - 2, gb.y - 6, 4, 6, "#5a3d22");
  box(gb.x - 12, gb.y - 16, 24, 10, "#9e2a20");
  box(gb.x - 9, gb.y - 19, 18, 5, "#f4efe0");
  px(gb.x, gb.y - 19, 1, 5, "#b9ad92");
  px(gb.x + 5, gb.y - 23, 1, 5, "#5a3d22");

  // Donation box.
  const db = { x: g(TAM_QUAN.donation.x), y: g(TAM_QUAN.donation.y) };
  box(db.x - 10, db.y - 16, 20, 16, "#a83a2a");
  px(db.x - 10, db.y - 16, 20, 3, "#d9a441");
  px(db.x - 4, db.y - 15, 8, 1, OUTLINE); // the slot

  for (const [x, y] of TAM_QUAN.trees) banyan(p, g(x), g(y) + 10);
}

/** Build the front-gate layer (plaque text and box label as text objects). */
export function buildTamQuan(scene: Phaser.Scene) {
  worldBackground(scene, "area-tam-quan", draw);
  const style = { fontFamily: "serif", fontStyle: "bold", color: "#f3d27a" } as const;
  scene.add.text(688, TAM_QUAN.gate.y + 64 + 12, "TAM QUAN", { ...style, fontSize: "16px" }).setOrigin(0.5, 0.5).setDepth(-890);
  scene.add
    .text(TAM_QUAN.donation.x, TAM_QUAN.donation.y - 20, "CÔNG ĐỨC", { ...style, fontSize: "9px" })
    .setOrigin(0.5, 0.5)
    .setDepth(-890);
}
