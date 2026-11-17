/**
 * The lotus garden (Vườn sen), drawn in code in the characters' chunky pixel
 * style: lawn, back wall, moon gate home, stone path, lotus pond with a wooden
 * bridge, a Bodhi tree, a pavilion and stone lanterns. Layout numbers come from
 * GARDEN in config/areas.ts, so the picture matches the walk map.
 */

import * as Phaser from "phaser";
import { GARDEN } from "@/config/areas";
import { TEMPLE } from "./world";

const PX = 2; // world px per art pixel
const OUTLINE = "#3b2414";

/** Deterministic 0..1 noise per art pixel, so the lawn texture never flickers. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function drawGarden(ctx: CanvasRenderingContext2D) {
  const W = TEMPLE.width / PX;
  const H = TEMPLE.height / PX;
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x) * PX, Math.round(y) * PX, Math.max(1, Math.round(w)) * PX, Math.max(1, Math.round(h)) * PX);
  };
  const disc = (cx: number, cy: number, r: number, c: string) => {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      px(cx - half, cy + y, half * 2 + 1, 1, c);
    }
  };
  const g = (v: number) => v / PX; // world px → art px

  // Lawn with a soft dither.
  px(0, 0, W, H, "#6fa35a");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x, y);
    if (n < 0.08) px(x, y, 1, 1, "#5f9150");
    else if (n > 0.965) px(x, y, 1, 1, "#86b86b");
  }

  // Trees behind the back wall, then the wall with its tiled cap.
  for (let x = 0; x < W; x += 22) disc(x + 8, 22, 18 + Math.round(hash(x, 1) * 6), hash(x, 2) > 0.5 ? "#3f7a3c" : "#4a8a44");
  px(0, 48, W, 27, "#d8c7a0");
  for (let x = 0; x < W; x += 12) px(x, 52, 1, 22, "#c2b088");
  px(0, 42, W, 7, "#b5562e");
  px(0, 41, W, 1, OUTLINE);
  px(0, 49, W, 1, "#8a3b1e");
  px(0, 75, W, 1, OUTLINE);

  // Side walls.
  px(0, 75, g(60), H - 75, "#d8c7a0");
  px(g(60), 75, 1, H - 75, OUTLINE);
  px(W - 12, 75, 12, H - 75, "#d8c7a0");
  px(W - 13, 75, 1, H - 75, OUTLINE);

  // Moon gate (home): a round stone ring with the courtyard floor beyond.
  const mg = GARDEN.moonGate;
  const mcx = g(mg.x + mg.w / 2) - 6;
  const mcy = g(mg.y + mg.h / 2) + 4;
  disc(mcx, mcy, 34, "#8f8a80");
  disc(mcx, mcy, 30, "#cfc2a6");
  for (let y = -28; y <= 28; y += 6) px(mcx - 28, mcy + y, 56, 1, "#b9ad92");

  // Stone path: gate → bridge, and bridge → pavilion.
  const pathY = g(GARDEN.bridge.y);
  const pathH = g(GARDEN.bridge.h);
  const pathTiles = (x0: number, x1: number) => {
    px(x0, pathY, x1 - x0, pathH, "#d8cdb4");
    for (let x = x0; x < x1; x += 10) px(x, pathY, 1, pathH, "#b9ad92");
    px(x0, pathY + Math.floor(pathH / 2), x1 - x0, 1, "#c4b89c");
    px(x0, pathY - 1, x1 - x0, 1, "#a99d84");
    px(x0, pathY + pathH, x1 - x0, 1, "#a99d84");
  };
  pathTiles(g(60), g(GARDEN.pond.x) - 3);
  pathTiles(g(GARDEN.pond.x + GARDEN.pond.w) + 3, g(GARDEN.pavilion.x) + 4);

  // Lotus pond with a stone rim, ripples, pads and blossoms.
  const pd = { x: g(GARDEN.pond.x), y: g(GARDEN.pond.y), w: g(GARDEN.pond.w), h: g(GARDEN.pond.h) };
  px(pd.x - 4, pd.y - 4, pd.w + 8, pd.h + 8, "#8f8a80");
  px(pd.x - 2, pd.y - 2, pd.w + 4, pd.h + 4, "#a8a297");
  px(pd.x, pd.y, pd.w, pd.h, "#4f8fb0");
  for (let i = 0; i < 70; i++) {
    const x = pd.x + Math.floor(hash(i, 7) * (pd.w - 8));
    const y = pd.y + Math.floor(hash(i, 9) * (pd.h - 2));
    px(x, y, 4 + Math.floor(hash(i, 3) * 6), 1, "#6aa8c6");
  }
  for (let i = 0; i < 26; i++) {
    const x = pd.x + 6 + Math.floor(hash(i, 21) * (pd.w - 12));
    const y = pd.y + 6 + Math.floor(hash(i, 23) * (pd.h - 12));
    if (Math.abs(y - (pathY + pathH / 2)) < pathH) continue; // keep the bridge clear
    disc(x, y, 4, "#3f8f4a");
    px(x - 3, y, 3, 1, "#4f8fb0"); // notch in the pad
    if (hash(i, 25) > 0.6) { disc(x + 1, y - 2, 2, "#f4a6c0"); px(x + 1, y - 3, 1, 1, "#ffd84a"); }
  }

  // Wooden bridge over the pond.
  const bx0 = pd.x - 6;
  const bx1 = pd.x + pd.w + 6;
  px(bx0, pathY, bx1 - bx0, pathH, "#a8743f");
  for (let x = bx0; x < bx1; x += 4) px(x, pathY, 1, pathH, "#8a5a32");
  px(bx0, pathY - 3, bx1 - bx0, 3, "#6b4a2b"); // north rail
  px(bx0, pathY + pathH, bx1 - bx0, 3, "#6b4a2b"); // south rail
  for (let x = bx0; x <= bx1; x += 24) { px(x, pathY - 6, 3, 6, "#5a3d22"); px(x, pathY + pathH, 3, 6, "#5a3d22"); }

  // Bodhi tree: trunk with roots, a broad canopy of heart-shaped leaves.
  const tx = g(GARDEN.bodhi.trunkX);
  const ty = g(GARDEN.bodhi.trunkY);
  disc(tx, ty - 60, 62, "#3f7a3c");
  for (let i = 0; i < 260; i++) {
    const a = hash(i, 31) * Math.PI * 2;
    const r = Math.sqrt(hash(i, 33)) * 58;
    const lx = tx + Math.cos(a) * r;
    const ly = ty - 60 + Math.sin(a) * r;
    px(lx, ly, 3, 2, hash(i, 35) > 0.5 ? "#4f9a45" : "#6fbf5a");
    px(lx + 1, ly + 2, 1, 1, "#3f7a3c");
  }
  px(tx - 9, ty - 20, 18, 20, "#6b4a2b");
  px(tx - 9, ty - 20, 3, 20, "#5a3d22");
  px(tx - 15, ty - 3, 30, 4, "#5a3d22"); // roots
  px(tx - 18, ty, 6, 2, "#5a3d22");
  px(tx + 12, ty, 6, 2, "#5a3d22");

  // Pavilion (thủy đình): plank floor, red pillars, tiled roof with lifted eaves.
  const pv = { x: g(GARDEN.pavilion.x), y: g(GARDEN.pavilion.y), w: g(GARDEN.pavilion.w), h: g(GARDEN.pavilion.h) };
  px(pv.x - 2, pv.y - 2, pv.w + 4, pv.h + 4, "#7a5a3e");
  px(pv.x, pv.y, pv.w, pv.h, "#b08a5c");
  for (let y = pv.y; y < pv.y + pv.h; y += 5) px(pv.x, y, pv.w, 1, "#9a7650");
  const roofY = pv.y - 50;
  const pillar = (x: number, yTop: number, yBot: number) => { px(x, yTop, 6, yBot - yTop, "#a83a2a"); px(x, yTop, 2, yBot - yTop, "#c8503c"); px(x - 1, yBot - 2, 8, 2, "#6b4a2b"); };
  pillar(pv.x + 2, roofY + 14, pv.y + 4);
  pillar(pv.x + pv.w - 8, roofY + 14, pv.y + 4);
  px(pv.x - 12, roofY, pv.w + 24, 16, "#b5562e");
  for (let x = pv.x - 12; x < pv.x + pv.w + 12; x += 5) px(x, roofY + 2, 1, 14, "#8a3b1e");
  px(pv.x - 12, roofY, pv.w + 24, 2, "#d9a441"); // gold ridge
  px(pv.x - 18, roofY + 12, 8, 4, "#b5562e"); // lifted eaves
  px(pv.x + pv.w + 10, roofY + 12, 8, 4, "#b5562e");
  px(pv.x - 20, roofY + 10, 4, 3, "#d9a441");
  px(pv.x + pv.w + 16, roofY + 10, 4, 3, "#d9a441");
  px(pv.x - 12, roofY + 16, pv.w + 24, 1, OUTLINE);
  pillar(pv.x + 2, pv.y + pv.h - 46, pv.y + pv.h + 4); // front pillars
  pillar(pv.x + pv.w - 8, pv.y + pv.h - 46, pv.y + pv.h + 4);

  // Stone lanterns.
  const stoneLantern = (x: number, y: number) => {
    px(x - 6, y - 4, 12, 4, "#8f8a80");
    px(x - 3, y - 12, 6, 8, "#a8a297");
    px(x - 5, y - 18, 10, 6, "#9a9488");
    px(x - 2, y - 16, 4, 3, "#ffd77a");
    px(x - 7, y - 21, 14, 3, "#8f8a80");
    px(x - 2, y - 24, 4, 3, "#8f8a80");
  };
  stoneLantern(g(215), g(634));
  stoneLantern(g(1195), g(644));

  // Flower-bed hedge along the bottom.
  px(0, H - 14, W, 14, "#3f7a3c");
  for (let x = 4; x < W; x += 9) {
    disc(x, H - 13, 4, hash(x, 41) > 0.5 ? "#4a8a44" : "#3f7a3c");
    if (hash(x, 43) > 0.55) px(x, H - 15, 2, 2, hash(x, 45) > 0.5 ? "#f4a6c0" : "#ffcf33");
  }
}

/** Build the lotus garden scene layer (background + gentle pond sparkles). */
export function buildGarden(scene: Phaser.Scene) {
  if (!scene.textures.exists("garden-bg")) {
    const tex = scene.textures.createCanvas("garden-bg", TEMPLE.width, TEMPLE.height);
    if (tex) {
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      drawGarden(ctx);
      tex.refresh();
      scene.textures.get("garden-bg").setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
  scene.add.image(0, 0, "garden-bg").setOrigin(0, 0).setDepth(-1000);

  // Light glinting on the water.
  const p = GARDEN.pond;
  for (let i = 0; i < 8; i++) {
    const s = scene.add
      .rectangle(p.x + 30 + hash(i, 51) * (p.w - 60), p.y + 20 + hash(i, 53) * (p.h - 40), 6, 2, 0xffffff, 0)
      .setDepth(-900);
    scene.tweens.add({ targets: s, alpha: 0.7, duration: 900 + i * 150, delay: i * 400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }
}

/** Draw (once) the small floating flower-lantern texture. */
function ensureFloatingLanternTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("hoa-dang")) return;
  const tex = scene.textures.createCanvas("hoa-dang", 14 * PX, 10 * PX);
  if (!tex) return;
  const ctx = tex.getContext();
  const px = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x * PX, y * PX, w * PX, h * PX); };
  px(0, 6, 14, 3, OUTLINE);
  px(1, 6, 12, 2, "#f4a6c0");
  px(3, 4, 8, 2, "#f8c6d6");
  px(6, 1, 2, 3, "#ffd84a");
  px(6, 0, 2, 1, "#fff2a8");
  tex.refresh();
  scene.textures.get("hoa-dang").setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/**
 * A released flower lantern drifts out from the south shore across the pond,
 * glowing softly, then fades away.
 */
export function floatLantern(scene: Phaser.Scene, fromX: number) {
  ensureFloatingLanternTexture(scene);
  const p = GARDEN.pond;
  const startY = p.y + p.h - 14;
  const lantern = scene.add.image(fromX, startY, "hoa-dang").setOrigin(0.5, 1).setDepth(-850);
  const glow = scene.textures.exists("lantern-glow")
    ? scene.add.image(fromX, startY - 8, "lantern-glow").setScale(0.25).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setDepth(-851)
    : null;
  const toX = Phaser.Math.Clamp(fromX + Phaser.Math.Between(-140, 140), p.x + 20, p.x + p.w - 20);
  const toY = Phaser.Math.Between(p.y + 30, GARDEN.bridge.y + GARDEN.bridge.h + 40);
  const targets = glow ? [lantern, glow] : [lantern];
  scene.tweens.add({ targets, x: toX, duration: 16000, ease: "Sine.inOut" });
  scene.tweens.add({ targets: lantern, y: toY, duration: 16000, ease: "Sine.inOut" });
  if (glow) scene.tweens.add({ targets: glow, y: toY - 8, duration: 16000, ease: "Sine.inOut" });
  scene.tweens.add({ targets, alpha: 0, delay: 14000, duration: 4000, onComplete: () => targets.forEach((t) => t.destroy()) });
}
