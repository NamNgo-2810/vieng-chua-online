/**
 * Shared helpers for code-drawn areas: a full-world canvas texture drawn on a
 * 2px art grid, in the same chunky style as the characters (dark outline,
 * flat shading). Each area file (game/areas/*.ts) supplies a draw function.
 */

import * as Phaser from "phaser";
import { TEMPLE } from "./world";

export const ART_PX = 2;
export const OUTLINE = "#3b2414";

/** Drawing kit for one canvas; coordinates are art pixels (world px / 2). */
export interface Paint {
  /** Width and height in art pixels. */
  W: number;
  H: number;
  px(x: number, y: number, w: number, h: number, c: string): void;
  /** Filled box with a 1-art-pixel outline. */
  box(x: number, y: number, w: number, h: number, c: string): void;
  disc(cx: number, cy: number, r: number, c: string): void;
  /** World px → art px. */
  g(v: number): number;
  /** Deterministic 0..1 noise (stable texture, no flicker). */
  hash(x: number, y: number): number;
}

export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function kit(ctx: CanvasRenderingContext2D, wPx: number, hPx: number): Paint {
  const px: Paint["px"] = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x) * ART_PX, Math.round(y) * ART_PX, Math.max(1, Math.round(w)) * ART_PX, Math.max(1, Math.round(h)) * ART_PX);
  };
  return {
    W: wPx / ART_PX,
    H: hPx / ART_PX,
    px,
    box: (x, y, w, h, c) => {
      px(x - 1, y - 1, w + 2, h + 2, OUTLINE);
      px(x, y, w, h, c);
    },
    disc: (cx, cy, r, c) => {
      for (let y = -r; y <= r; y++) {
        const half = Math.floor(Math.sqrt(r * r - y * y));
        px(cx - half, cy + y, half * 2 + 1, 1, c);
      }
    },
    g: (v) => v / ART_PX,
    hash,
  };
}

/** Create (once) and place a full-world background drawn by `draw`. */
export function worldBackground(scene: Phaser.Scene, key: string, draw: (p: Paint) => void) {
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, TEMPLE.width, TEMPLE.height);
    if (tex) {
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      draw(kit(ctx, TEMPLE.width, TEMPLE.height));
      tex.refresh();
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
}

/** A small sprite texture drawn on the art grid (for animated pieces). */
export function pixelSprite(scene: Phaser.Scene, key: string, wArt: number, hArt: number, draw: (p: Paint) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, wArt * ART_PX, hArt * ART_PX);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(kit(ctx, wArt * ART_PX, hArt * ART_PX));
  tex.refresh();
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** A slow trickle of incense smoke rising from (x, y). */
export function incenseSmoke(scene: Phaser.Scene, x: number, y: number, depth = 900) {
  scene.time.addEvent({
    delay: 1100,
    loop: true,
    callback: () => {
      const puff = scene.add.circle(x + Phaser.Math.Between(-2, 2), y, Phaser.Math.Between(2, 3), 0xdad3c4, 0.45).setDepth(depth);
      scene.tweens.add({
        targets: puff,
        y: y - Phaser.Math.Between(40, 60),
        x: x + Phaser.Math.Between(-10, 10),
        alpha: 0,
        scale: 2,
        duration: Phaser.Math.Between(2600, 3400),
        ease: "Sine.out",
        onComplete: () => puff.destroy(),
      });
    },
  });
}

/** A warm flickering glow (candles, lanterns). */
export function glow(scene: Phaser.Scene, x: number, y: number, scale: number, depth = 10) {
  const key = "pa-glow";
  if (!scene.textures.exists(key)) {
    const size = 128;
    const tex = scene.textures.createCanvas(key, size, size);
    if (tex) {
      const c = tex.getContext();
      const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grd.addColorStop(0, "rgba(255, 214, 130, 0.9)");
      grd.addColorStop(0.4, "rgba(255, 190, 95, 0.45)");
      grd.addColorStop(1, "rgba(255, 180, 80, 0)");
      c.fillStyle = grd;
      c.fillRect(0, 0, size, size);
      tex.refresh();
    }
  }
  const img = scene.add.image(x, y, key).setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(depth);
  scene.tweens.add({ targets: img, alpha: 0.75, scale: scale * 1.08, duration: 1300 + Math.random() * 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  return img;
}
