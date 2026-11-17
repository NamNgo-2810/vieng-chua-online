/**
 * Hoa Quả Sơn (Flower-Fruit Mountain, from Tây du ký), code-drawn: green peaks
 * and clouds, the Thủy Liêm waterfall falling over the cave mouth into a pool,
 * the immortal peach tree hung with pink peaches, mossy boulders, and a troop
 * of monkeys that play around their rock and come over when fed.
 * Layout: HOA_QUA_SON in config/areas.ts. Drawn in this game's own style.
 */

import * as Phaser from "phaser";
import { HOA_QUA_SON } from "@/config/areas";
import { worldBackground, pixelSprite, glow, OUTLINE, type Paint } from "../pixel-art";

/** What the scene can ask of the monkeys (FEED_MONKEYS). */
export interface MonkeyTroop {
  gather(x: number, y: number): void;
}

function boulder(p: Paint, x: number, y: number, r: number) {
  p.disc(x, y - r / 2, r, "#7a7a6e");
  p.disc(x - r / 4, y - r / 2 - r / 4, Math.round(r * 0.6), "#8f8f82");
  p.px(x - r, y - r / 2 - 2, r * 2, 2, "#5f8a3a"); // moss band
}

function draw(p: Paint) {
  const { px, box, disc, g, W, H, hash } = p;
  // Sky, clouds and far peaks.
  for (let y = 0; y < 150; y++) px(0, y, W, 1, y < 50 ? "#9cc8e4" : y < 100 ? "#b4d6ea" : "#cfe4ec");
  for (let i = 0; i < 7; i++) { const cx = 40 + i * 100; disc(cx, 30 + (i % 3) * 10, 11, "#f6f9fb"); disc(cx + 14, 33 + (i % 3) * 10, 8, "#f6f9fb"); }
  for (let x = 0; x < W; x++) {
    const h1 = 60 + Math.round(Math.abs(Math.sin(x / 40)) * 40 + Math.sin(x / 13) * 5);
    px(x, 150 - h1, 1, h1, "#6f9a7a");
    const h2 = 30 + Math.round(Math.abs(Math.sin(x / 23 + 2)) * 20);
    px(x, 150 - h2, 1, h2, "#5a8a5e");
  }
  // Meadow.
  px(0, 150, W, H - 150, "#78a85a");
  for (let y = 150; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x, y);
    if (n < 0.05) px(x, y, 1, 1, "#679a4c");
    else if (n > 0.995) px(x, y, 1, 1, i2(x, y) ? "#f4a6c0" : "#fff3a0"); // wildflowers
  }

  // Cliff and the Thủy Liêm waterfall over the cave mouth, into the pool.
  const pool = { x: g(HOA_QUA_SON.pool.x), y: g(HOA_QUA_SON.pool.y), w: g(HOA_QUA_SON.pool.w), h: g(HOA_QUA_SON.pool.h) };
  box(pool.x - 30, 40, pool.w + 60, pool.y - 30, "#6e6a5e"); // cliff face
  for (let i = 0; i < 60; i++) px(pool.x - 28 + hash(i, 3) * (pool.w + 56), 42 + hash(3, i) * (pool.y - 50), 4, 2, "#5e5a50");
  px(pool.x + pool.w / 2 - 34, pool.y - 60, 68, 40, "#2a2620"); // cave mouth behind the falls
  for (let x = pool.x + pool.w / 2 - 30; x < pool.x + pool.w / 2 + 30; x++) {
    const shade = (x + Math.floor(hash(x, 1) * 3)) % 3;
    px(x, 40, 1, pool.y - 40, shade === 0 ? "#dff2fb" : shade === 1 ? "#b6def0" : "#9cd0e8");
  }
  // A carved plaque above the cave.
  box(pool.x + pool.w / 2 - 26, 46, 52, 10, "#8a2a1e");
  box(pool.x, pool.y, pool.w, pool.h, "#4e9cc4"); // pool
  for (let i = 0; i < 30; i++) px(pool.x + 4 + hash(i, 7) * (pool.w - 8), pool.y + 4 + hash(7, i) * (pool.h - 8), 5, 1, "#8ccbe6");
  for (let i = 0; i < 12; i++) disc(pool.x + pool.w / 2 - 30 + i * 5, pool.y + 3, 3, "#f4fbff"); // foam

  // Immortal peach tree.
  const t = { x: g(HOA_QUA_SON.peachTree.x), y: g(HOA_QUA_SON.peachTree.y) };
  disc(t.x, t.y - 50, 40, "#4a8a3a");
  for (let i = 0; i < 160; i++) {
    const a = hash(i, 5) * Math.PI * 2, r = Math.sqrt(hash(5, i)) * 38;
    px(t.x + Math.cos(a) * r, t.y - 50 + Math.sin(a) * r, 3, 2, hash(i, 6) > 0.5 ? "#5aa048" : "#68b056");
  }
  for (let i = 0; i < 14; i++) {
    const a = hash(i, 8) * Math.PI * 2, r = 8 + hash(8, i) * 28;
    const fx = t.x + Math.cos(a) * r, fy = t.y - 50 + Math.sin(a) * r;
    box(fx, fy, 4, 4, "#f49aa4");
    px(fx, fy, 2, 1, "#ffd0d4");
  }
  px(t.x - 8, t.y - 18, 16, 18, "#6b4a2b");

  // The monkeys' rock.
  const m = { x: g(HOA_QUA_SON.monkeyRock.x), y: g(HOA_QUA_SON.monkeyRock.y) };
  boulder(p, m.x, m.y, 30);
  for (const [x, y] of HOA_QUA_SON.rocks) boulder(p, g(x), g(y), 14);
  // Trail markers at the left (back down to Quan Âm hill).
  for (let i = 0; i < 4; i++) px(g(80) + i * 6, g(560) - i * 4, 10, 4, "#b9ad92");
  px(0, 0, 1, 1, OUTLINE);
}

/** Wildflower colour choice (deterministic). */
function i2(x: number, y: number) {
  return (x + y) % 2 === 0;
}

function monkeyTextures(scene: Phaser.Scene) {
  pixelSprite(scene, "hqs-monkey", 10, 10, (p) => {
    p.box(3, 4, 5, 4, "#8a5a2e"); // body
    p.box(2, 1, 5, 4, "#8a5a2e"); // head
    p.px(3, 2, 3, 2, "#e8c49a"); // face
    p.px(3, 2, 1, 1, OUTLINE);
    p.px(5, 2, 1, 1, OUTLINE);
    p.px(1, 2, 1, 1, "#e8c49a"); // ear
    p.px(8, 3, 1, 4, "#8a5a2e"); // tail
    p.px(9, 2, 1, 2, "#8a5a2e");
    p.px(3, 8, 1, 2, "#6b4422"); // legs
    p.px(6, 8, 1, 2, "#6b4422");
  });
}

/** Points the monkeys wander between (around their rock and the peach tree). */
function randomPlayPoint(): { x: number; y: number } {
  const anchors = [HOA_QUA_SON.monkeyRock, HOA_QUA_SON.peachTree];
  const a = anchors[Math.random() < 0.75 ? 0 : 1];
  return { x: a.x + Phaser.Math.Between(-110, 110), y: a.y + Phaser.Math.Between(10, 90) };
}

/** Build the Hoa Quả Sơn layer with its monkeys. */
export function buildHoaQuaSon(scene: Phaser.Scene): MonkeyTroop {
  worldBackground(scene, "area-hoa-qua-son", draw);
  glow(scene, HOA_QUA_SON.pool.x + HOA_QUA_SON.pool.w / 2, HOA_QUA_SON.pool.y + 20, 0.5, -899);
  monkeyTextures(scene);
  scene.add
    .text(HOA_QUA_SON.pool.x + HOA_QUA_SON.pool.w / 2, 102, "THỦY LIÊM ĐỘNG", { fontFamily: "serif", fontSize: "11px", fontStyle: "bold", color: "#f3d27a" })
    .setOrigin(0.5, 0.5)
    .setDepth(-890);

  const troop: Phaser.GameObjects.Image[] = [];
  const hop = (mk: Phaser.GameObjects.Image, to: { x: number; y: number }, ms: number, then?: () => void) => {
    mk.setFlipX(to.x < mk.x);
    scene.tweens.add({ targets: mk, x: to.x, duration: ms, ease: "Sine.inOut" });
    scene.tweens.add({ targets: mk, y: to.y, duration: ms, ease: "Sine.inOut", onUpdate: () => mk.setDepth(mk.y), onComplete: then });
    // Little hops on the way.
    scene.tweens.add({ targets: mk, scaleY: 0.85, duration: 120, yoyo: true, repeat: Math.max(0, Math.floor(ms / 260) - 1) });
  };
  const wander = (mk: Phaser.GameObjects.Image) => {
    if (!mk.active) return;
    hop(mk, randomPlayPoint(), Phaser.Math.Between(1500, 3500), () => scene.time.delayedCall(Phaser.Math.Between(600, 2600), () => wander(mk)));
  };
  for (let i = 0; i < 6; i++) {
    const pt = randomPlayPoint();
    const mk = scene.add.image(pt.x, pt.y, "hqs-monkey").setOrigin(0.5, 1).setDepth(pt.y);
    if (i === 0) mk.setScale(0.8); // a young one
    troop.push(mk);
    wander(mk);
  }
  return {
    gather(x, y) {
      troop.forEach((mk, i) => {
        scene.tweens.killTweensOf(mk);
        mk.setScale(i === 0 ? 0.8 : 1);
        const spot = { x: x + Math.cos((i / troop.length) * Math.PI * 2) * 46, y: y + 20 + Math.sin((i / troop.length) * Math.PI * 2) * 20 };
        hop(mk, spot, 900 + i * 120, () => scene.time.delayedCall(4500, () => wander(mk)));
      });
    },
  };
}
