/**
 * Rừng trúc (bamboo grove), code-drawn: tall bamboo stalks in clumps and a
 * dense backdrop, a winding stone path, a stream with a small wooden bridge,
 * a stone seat, and a few bamboo leaves drifting down.
 * Layout: BAMBOO_GROVE in config/areas.ts.
 */

import * as Phaser from "phaser";
import { BAMBOO_GROVE } from "@/config/areas";
import { worldBackground, pixelSprite, OUTLINE, type Paint } from "../pixel-art";

function stalk(p: Paint, x: number, bottom: number, height: number, shade: number) {
  const { px } = p;
  const body = shade > 0.5 ? "#7fb24a" : "#6a9e3c";
  px(x, bottom - height, 4, height, body);
  px(x, bottom - height, 1, height, "#9ccc5e");
  for (let y = bottom - 14; y > bottom - height; y -= 18) px(x - 1, y, 6, 2, "#4f7a2c"); // nodes
  for (let y = bottom - height + 6; y < bottom - 30; y += 26) {
    px(x + 4, y, 10, 2, "#5a9a3a"); // leaves
    px(x - 9, y + 9, 9, 2, "#5a9a3a");
  }
}

function draw(p: Paint) {
  const { px, box, disc, g, W, H, hash } = p;

  // Mossy ground.
  px(0, 0, W, H, "#7a9a5a");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x, y);
    if (n < 0.08) px(x, y, 1, 1, "#6a8a4a");
    else if (n > 0.965) px(x, y, 1, 1, "#9ab86e");
  }

  // Dense bamboo backdrop along the top.
  px(0, 0, W, 80, "#4f7a2c");
  for (let x = 2; x < W; x += 9) stalk(p, x + Math.floor(hash(x, 3) * 4), 92, 92, hash(x, 5));

  // Winding stone path from the gate across the grove.
  const pathAt = (x: number) => 215 + Math.round(Math.sin(x / 70) * 18);
  for (let x = 30; x < W - 20; x += 7) {
    const y = pathAt(x);
    box(x, y - 4 + Math.floor(hash(x, 7) * 3), 6, 5, hash(x, 9) > 0.5 ? "#b9ad92" : "#a99d84");
  }

  // Stream with rocks and ripples, and the wooden bridge.
  const s = { x: g(BAMBOO_GROVE.stream.x), y: g(BAMBOO_GROVE.stream.y), w: g(BAMBOO_GROVE.stream.w), h: g(BAMBOO_GROVE.stream.h) };
  px(s.x, s.y, s.w, s.h, "#4f8fb0");
  for (let i = 0; i < 60; i++) px(s.x + Math.floor(hash(i, 11) * s.w), s.y + 2 + Math.floor(hash(i, 13) * (s.h - 4)), 5, 1, "#7ab8d6");
  for (let x = s.x; x < s.x + s.w; x += 11) {
    disc(x, s.y - 1, 2, "#8f8a80");
    disc(x + 5, s.y + s.h, 2, "#8f8a80");
  }
  const bx = g(BAMBOO_GROVE.bridge.x);
  const bw = g(BAMBOO_GROVE.bridge.w);
  px(bx, s.y - 3, bw, s.h + 6, "#a8743f");
  for (let x = bx; x < bx + bw; x += 4) px(x, s.y - 3, 1, s.h + 6, "#8a5a32");
  px(bx - 2, s.y - 3, 2, s.h + 6, "#6b4a2b");
  px(bx + bw, s.y - 3, 2, s.h + 6, "#6b4a2b");

  // Stone seat.
  const st = { x: g(BAMBOO_GROVE.seat.x), y: g(BAMBOO_GROVE.seat.y) };
  box(st.x - 14, st.y - 8, 28, 6, "#a8a297");
  px(st.x - 12, st.y - 2, 4, 4, "#8f8a80");
  px(st.x + 8, st.y - 2, 4, 4, "#8f8a80");

  // Bamboo clumps (drawn bottom-up so nearer stalks overlap).
  for (const [cx, cy] of BAMBOO_GROVE.clumps) {
    const x = g(cx);
    const y = g(cy) + 10;
    disc(x, y, 12, "#5f7a3a");
    for (let i = 0; i < 6; i++) stalk(p, x - 12 + i * 5, y - (i % 2) * 2, 70 + Math.floor(hash(cx, i) * 40), hash(i, cy));
    px(x - 13, y - 1, 28, 1, OUTLINE);
  }

  // Gate back to the lotus garden on the left.
  box(18, 182, 10, 64, "#6b4a2b");
  px(16, 180, 16, 4, "#5a3d22");
  for (let y = 190; y < 240; y += 8) px(19, y, 8, 2, "#7fb24a");
}

/** Build the bamboo grove layer, with leaves drifting down. */
export function buildBambooGrove(scene: Phaser.Scene) {
  worldBackground(scene, "area-bamboo-grove", draw);
  pixelSprite(scene, "bamboo-leaf", 6, 2, (p) => {
    p.px(0, 0, 6, 2, "#9ccc5e");
    p.px(0, 1, 6, 1, "#6a9e3c");
  });
  scene.time.addEvent({
    delay: 1600,
    loop: true,
    callback: () => {
      const x = Phaser.Math.Between(80, 1300);
      const leaf = scene.add.image(x, 120, "bamboo-leaf").setDepth(4200).setAlpha(0.9).setAngle(Phaser.Math.Between(0, 180));
      scene.tweens.add({
        targets: leaf,
        y: Phaser.Math.Between(400, 700),
        x: x + Phaser.Math.Between(-80, 80),
        angle: leaf.angle + Phaser.Math.Between(180, 540),
        alpha: 0,
        duration: Phaser.Math.Between(6000, 9000),
        ease: "Sine.inOut",
        onComplete: () => leaf.destroy(),
      });
    },
  });
}
