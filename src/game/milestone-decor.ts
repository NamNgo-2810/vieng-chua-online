/**
 * Code-drawn decor that appears as temple milestones unlock (config/milestones.ts):
 * lotuses on the pond, marigold pots, Buddhist-flag bunting, a lantern string.
 * Same chunky pixel style as the characters (2 world px per art pixel, dark
 * outline). Positions are world px over the painted background.
 */

import * as Phaser from "phaser";
import type { MilestoneId } from "@/config/milestones";

const PX = 2;
const OUTLINE = "#3b2414";

type Paint = (x: number, y: number, w: number, h: number, color: string) => void;

/** Create (once) a canvas texture drawn on a logical pixel grid. */
function pixelTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (px: Paint, box: Paint) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w * PX, h * PX);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const px: Paint = (x, y, ww, hh, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * PX, y * PX, ww * PX, hh * PX);
  };
  const box: Paint = (x, y, ww, hh, c) => {
    px(x - 1, y - 1, ww + 2, hh + 2, OUTLINE);
    px(x, y, ww, hh, c);
  };
  draw(px, box);
  tex.refresh();
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

function makeTextures(scene: Phaser.Scene) {
  pixelTexture(scene, "md-lotus", 18, 12, (px, box) => {
    box(1, 7, 16, 4, "#3f8f4a"); // lily pad
    px(2, 8, 14, 1, "#5fae5a");
    box(5, 3, 8, 5, "#f4a6c0"); // outer petals
    box(7, 1, 4, 4, "#f8c6d6"); // inner petals
    px(8, 3, 2, 2, "#ffd84a"); // seed head
  });
  pixelTexture(scene, "md-marigold", 12, 14, (px, box) => {
    box(3, 9, 6, 4, "#b5562e"); // terracotta pot
    px(3, 9, 6, 1, "#8a3b1e");
    px(5, 6, 1, 3, "#3f8f4a"); // stems
    px(7, 6, 1, 3, "#3f8f4a");
    box(2, 3, 4, 3, "#f5a623"); // blooms
    box(6, 2, 4, 3, "#ffcf33");
    box(4, 0, 4, 3, "#f08a24");
  });
  const flagColours = ["#2a6fdb", "#f5c400", "#d62828", "#f7f7f2", "#f08a24"];
  flagColours.forEach((c, i) =>
    pixelTexture(scene, `md-flag-${i}`, 6, 7, (px) => {
      // A downward pennant: rows narrow to a point.
      for (let r = 0; r < 6; r++) px(r >> 1, r, 6 - (r >> 1) * 2, 1, c);
      px(0, 0, 6, 1, OUTLINE);
    })
  );
  pixelTexture(scene, "md-lantern", 8, 12, (px, box) => {
    px(3, 0, 2, 2, OUTLINE); // hook
    box(2, 2, 4, 1, "#d9a441"); // cap
    box(1, 4, 6, 5, "#d62828"); // body
    px(2, 5, 1, 3, "#f05a4a"); // highlight
    box(2, 10, 4, 1, "#d9a441"); // bottom cap
  });
}

/** A rope sagging between two points, drawn as pixel steps. */
function rope(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, sag: number, depth: number) {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(0x3b2414, 1);
  const steps = Math.ceil((x2 - x1) / PX);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag;
    g.fillRect(Math.round(x), Math.round(y), PX, PX);
  }
  return g;
}

const ropeY = (y1: number, y2: number, sag: number, t: number) => y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag;

type Built = Phaser.GameObjects.GameObject[];

const BUILDERS: Partial<Record<MilestoneId, (scene: Phaser.Scene) => Built>> = {
  LOTUS_BLOOM: (scene) => {
    const spots: [number, number][] = [[1125, 560], [1172, 588], [1216, 552], [1150, 534], [1205, 604]];
    return spots.map(([x, y], i) => {
      const img = scene.add.image(x, y, "md-lotus").setOrigin(0.5, 1).setDepth(-400);
      scene.tweens.add({ targets: img, y: y - 2, duration: 1800 + i * 230, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      return img;
    });
  },
  MARIGOLDS: (scene) => {
    const spots: [number, number][] = [[112, 592], [326, 518], [1046, 522], [1046, 602], [566, 634], [812, 634]];
    return spots.map(([x, y]) => scene.add.image(x, y, "md-marigold").setOrigin(0.5, 1).setDepth(y));
  },
  PRAYER_FLAGS: (scene) => {
    const [x1, y1, x2, y2, sag] = [300, 238, 1080, 238, 22];
    const out: Built = [rope(scene, x1, y1, x2, y2, sag, 20)];
    const n = 22;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const flag = scene.add
        .image(x1 + (x2 - x1) * t, ropeY(y1, y2, sag, t), `md-flag-${i % 5}`)
        .setOrigin(0.5, 0)
        .setDepth(21);
      scene.tweens.add({ targets: flag, angle: 6, duration: 1400 + (i % 4) * 200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      out.push(flag);
    }
    return out;
  },
  // Strung between the outer hall pillars, over the terrace walkway (visible
  // above the dock on every screen; drawn behind characters on the terrace).
  LANTERN_STRING: (scene) => {
    const [x1, y1, x2, y2, sag] = [335, 332, 1040, 332, 16];
    const out: Built = [rope(scene, x1, y1, x2, y2, sag, 330)];
    const n = 10;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t;
      const y = ropeY(y1, y2, sag, t);
      if (scene.textures.exists("lantern-glow")) {
        const glow = scene.add.image(x, y + 14, "lantern-glow").setScale(0.35).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setDepth(331);
        scene.tweens.add({ targets: glow, alpha: 0.85, duration: 1200 + i * 140, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        out.push(glow);
      }
      const lantern = scene.add.image(x, y, "md-lantern").setOrigin(0.5, 0).setDepth(332);
      scene.tweens.add({ targets: lantern, angle: 4, duration: 1600 + i * 170, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      out.push(lantern);
    }
    return out;
  },
};

/** Moon gate in the right garden wall, leading to the lotus garden (config/areas.ts gate). */
function buildMoonGate(scene: Phaser.Scene): Built {
  pixelTexture(scene, "md-moongate", 30, 48, (px) => {
    const disc = (cx: number, cy: number, r: number, c: string) => {
      for (let y = -r; y <= r; y++) {
        const half = Math.floor(Math.sqrt(r * r - y * y));
        px(cx - half, cy + y, half * 2 + 1, 1, c);
      }
    };
    px(0, 4, 30, 44, "#d8c7a0"); // wall section
    px(0, 0, 30, 5, "#b5562e"); // tiled cap
    px(0, 5, 30, 1, OUTLINE);
    disc(15, 28, 14, "#8f8a80"); // stone ring
    disc(15, 28, 11, "#6fa35a"); // the garden beyond
    px(9, 30, 3, 3, "#f4a6c0");
    px(17, 27, 4, 2, "#3f8f4a");
    px(4, 40, 22, 8, "#d8c7a0"); // threshold
    px(4, 40, 22, 1, "#a99d84");
  });
  // Named by the scene's gate marker, like every other entrance.
  return [scene.add.image(1318, 392, "md-moongate").setOrigin(0.5, 1).setDepth(-300)];
}
BUILDERS.LOTUS_GARDEN = buildMoonGate;

/** Ids that have courtyard decor (area milestones are handled elsewhere). */
export const DECOR_MILESTONES = Object.keys(BUILDERS) as MilestoneId[];

/**
 * Build one milestone's decor. With `celebrate`, it fades in with a few rising
 * motes so an unlock that happens while you watch is noticeable.
 */
export function buildMilestoneDecor(scene: Phaser.Scene, id: MilestoneId, celebrate: boolean): Built {
  const builder = BUILDERS[id];
  if (!builder) return [];
  makeTextures(scene);
  const objs = builder(scene);
  if (celebrate) {
    for (const o of objs) {
      const a = o as unknown as Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject;
      if (typeof a.setAlpha !== "function") continue;
      const target = a.alpha;
      a.setAlpha(0);
      scene.tweens.add({ targets: a, alpha: target, duration: 1200, ease: "Sine.out" });
    }
  }
  return objs;
}
