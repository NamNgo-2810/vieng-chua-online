/**
 * Hồ phóng sinh (release pond), code-drawn: a large pond with lily pads, a
 * stone rim, a wooden pier, weeping willows — and live koi that drift around,
 * gather where someone feeds them, and swim off when one is released.
 * Layout: RELEASE_POND in config/areas.ts.
 */

import * as Phaser from "phaser";
import { RELEASE_POND } from "@/config/areas";
import { worldBackground, pixelSprite, type Paint } from "../pixel-art";

function willow(p: Paint, x: number, y: number) {
  const { px, disc, hash } = p;
  disc(x, y - 40, 26, "#5f9a4a");
  for (let i = 0; i < 22; i++) {
    const sx = x - 26 + i * 2.5;
    const len = 20 + Math.floor(hash(i, x) * 22);
    px(sx, y - 40, 1, len, hash(i, y) > 0.5 ? "#7fb24a" : "#6a9e3c"); // drooping strands
  }
  px(x - 4, y - 16, 8, 18, "#5a3d22");
}

function draw(p: Paint) {
  const { px, disc, g, W, H, hash } = p;
  px(0, 0, W, H, "#6fa35a");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x, y);
    if (n < 0.07) px(x, y, 1, 1, "#5f9150");
    else if (n > 0.97) px(x, y, 1, 1, "#86b86b");
  }
  // Back hedge.
  px(0, 0, W, 70, "#3f7a3c");
  for (let x = 0; x < W; x += 14) disc(x + 6, 70, 9, hash(x, 2) > 0.5 ? "#4a8a44" : "#3f7a3c");

  // The pond.
  const pd = { x: g(RELEASE_POND.pond.x), y: g(RELEASE_POND.pond.y), w: g(RELEASE_POND.pond.w), h: g(RELEASE_POND.pond.h) };
  px(pd.x - 4, pd.y - 4, pd.w + 8, pd.h + 8, "#8f8a80");
  px(pd.x - 2, pd.y - 2, pd.w + 4, pd.h + 4, "#a8a297");
  px(pd.x, pd.y, pd.w, pd.h, "#3f7fa0");
  for (let i = 0; i < 90; i++) px(pd.x + hash(i, 3) * (pd.w - 8), pd.y + hash(3, i) * (pd.h - 2), 4 + hash(i, 5) * 6, 1, "#5f9fc0");
  for (let i = 0; i < 18; i++) {
    const cx = pd.x + 8 + hash(i, 7) * (pd.w - 16);
    const cy = pd.y + 8 + hash(7, i) * (pd.h - 40);
    disc(cx, cy, 5, "#3f8f4a");
    px(cx - 4, cy, 4, 1, "#3f7fa0");
  }

  // Wooden pier from the south bank out over the water.
  const pr = { x: g(RELEASE_POND.pier.x), w: g(RELEASE_POND.pier.w), top: g(RELEASE_POND.pier.top) };
  px(pr.x, pr.top, pr.w, pd.y + pd.h + 4 - pr.top, "#a8743f");
  for (let y = pr.top; y < pd.y + pd.h + 4; y += 4) px(pr.x, y, pr.w, 1, "#8a5a32");
  px(pr.x - 2, pr.top, 2, pd.y + pd.h + 4 - pr.top, "#6b4a2b");
  px(pr.x + pr.w, pr.top, 2, pd.y + pd.h + 4 - pr.top, "#6b4a2b");
  for (const x of [pr.x - 2, pr.x + pr.w]) px(x, pr.top - 4, 2, 6, "#5a3d22");

  for (const [x, y] of RELEASE_POND.willows) willow(p, g(x), g(y) + 10);
}

/** Water region koi may swim in: the pond, minus the pier. */
function inWater(x: number, y: number) {
  const pd = RELEASE_POND.pond;
  const pr = RELEASE_POND.pier;
  const inPond = x > pd.x + 14 && x < pd.x + pd.w - 14 && y > pd.y + 12 && y < pd.y + pd.h - 10;
  const onPier = x > pr.x - 10 && x < pr.x + pr.w + 10 && y > pr.top - 10;
  return inPond && !onPier;
}

function randomWaterPoint(): { x: number; y: number } {
  const pd = RELEASE_POND.pond;
  for (let i = 0; i < 40; i++) {
    const x = Phaser.Math.Between(pd.x + 20, pd.x + pd.w - 20);
    const y = Phaser.Math.Between(pd.y + 20, pd.y + pd.h - 20);
    if (inWater(x, y)) return { x, y };
  }
  return { x: pd.x + 60, y: pd.y + 60 };
}

function koiTextures(scene: Phaser.Scene) {
  const colors: [string, string][] = [["#f08a24", "#ffffff"], ["#ffffff", "#d62828"], ["#ffcf33", "#f08a24"], ["#d62828", "#ffffff"]];
  colors.forEach(([body, spot], i) =>
    pixelSprite(scene, `koi-${i}`, 12, 5, (p) => {
      p.px(2, 1, 7, 3, body);
      p.px(9, 0, 3, 5, body); // tail
      p.px(3, 1, 2, 2, spot);
      p.px(1, 2, 1, 1, "#2b2119"); // eye
    })
  );
}

/** Koi swimming in the pond. Returns a handle to steer them toward a point. */
export interface KoiPond {
  gather(x: number, y: number): void;
  release(fromX: number, fromY: number): void;
}

function swim(scene: Phaser.Scene, fish: Phaser.GameObjects.Image, to: { x: number; y: number }, ms: number, then?: () => void) {
  fish.setFlipX(to.x > fish.x); // sprite faces left
  scene.tweens.add({ targets: fish, x: to.x, y: to.y, duration: ms, ease: "Sine.inOut", onComplete: then });
}

/** Build the release-pond layer with its koi. */
export function buildReleasePond(scene: Phaser.Scene): KoiPond {
  worldBackground(scene, "area-release-pond", draw);
  koiTextures(scene);
  const fishes: Phaser.GameObjects.Image[] = [];
  const wander = (f: Phaser.GameObjects.Image) => {
    if (!f.active) return;
    swim(scene, f, randomWaterPoint(), Phaser.Math.Between(4000, 8000), () => scene.time.delayedCall(Phaser.Math.Between(300, 1500), () => wander(f)));
  };
  for (let i = 0; i < 9; i++) {
    const pt = randomWaterPoint();
    const f = scene.add.image(pt.x, pt.y, `koi-${i % 4}`).setDepth(-850).setAlpha(0.95);
    fishes.push(f);
    wander(f);
  }
  return {
    gather(x, y) {
      // Fish nearest the feeder swim up to the bank in front of them.
      const target = { x: Phaser.Math.Clamp(x, RELEASE_POND.pond.x + 30, RELEASE_POND.pond.x + RELEASE_POND.pond.w - 30), y: RELEASE_POND.pond.y + RELEASE_POND.pond.h - 24 };
      [...fishes].sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, x, y) - Phaser.Math.Distance.Between(b.x, b.y, x, y)).slice(0, 5).forEach((f, i) => {
        scene.tweens.killTweensOf(f);
        const spot = { x: target.x + (i - 2) * 16, y: target.y - (i % 2) * 10 };
        swim(scene, f, inWater(spot.x, spot.y) ? spot : target, 1600 + i * 200, () => scene.time.delayedCall(4000, () => wander(f)));
      });
    },
    release(fromX, fromY) {
      const f = scene.add.image(fromX, Math.min(fromY - 30, RELEASE_POND.pier.top - 14), `koi-${Phaser.Math.Between(0, 3)}`).setDepth(-850).setAlpha(0);
      scene.tweens.add({ targets: f, alpha: 0.95, duration: 600 });
      fishes.push(f);
      swim(scene, f, randomWaterPoint(), 3500, () => wander(f));
    },
  };
}
