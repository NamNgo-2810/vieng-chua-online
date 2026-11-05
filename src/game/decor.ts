import * as Phaser from "phaser";
import { decorUrl } from "@/config/asset-manifest";
import { TEMPLE } from "@/game/world";

/**
 * World decorations placed in the courtyard: altar, incense burner, bell,
 * wooden fish, flower offerings. These are purely cosmetic set-dressing that
 * complement the painted background and give the activities physical anchors.
 *
 * Each item references a sliced prop from the manifest when available and falls
 * back to a labelled placeholder rectangle so the scene is never empty.
 */

interface DecorSpec {
  prop: string;
  /** Fractional position in the temple (0..1). */
  fx: number;
  fy: number;
  scale: number;
  /** Does it gently animate (smoke rising / sway)? */
  animate?: "smoke" | "sway";
  /** Ground items (cushion, tray) render below characters so players sit on them. */
  floor?: boolean;
  label: string;
}

// Scales are small: the sliced props are high-resolution source crops, so they
// must be scaled down to sit naturally next to the 64px characters. `floor`
// marks items that lie on the ground and must render BELOW characters (cushions,
// tray) regardless of their y, so visitors appear to sit on top of them.
const LAYOUT: DecorSpec[] = [
  { prop: "altar", fx: 0.5, fy: 0.44, scale: 0.42, label: "Ban thờ" },
  { prop: "incense", fx: 0.5, fy: 0.58, scale: 0.32, animate: "smoke", label: "Lư hương" },
  { prop: "bell", fx: 0.2, fy: 0.46, scale: 0.4, animate: "sway", label: "Chuông" },
  { prop: "woodfish", fx: 0.8, fy: 0.46, scale: 0.4, label: "Mõ" },
  { prop: "tray", fx: 0.5, fy: 0.72, scale: 0.28, floor: true, label: "Mâm lễ" },
  { prop: "cushion", fx: 0.38, fy: 0.74, scale: 0.42, floor: true, label: "Bồ đoàn" },
  { prop: "cushion", fx: 0.62, fy: 0.74, scale: 0.42, floor: true, label: "Bồ đoàn" },
];

/** Queue decoration textures into the scene loader. */
export function preloadDecor(scene: Phaser.Scene) {
  const seen = new Set<string>();
  for (const spec of LAYOUT) {
    const url = decorUrl(spec.prop);
    const key = `prop-${spec.prop}`;
    if (url && !seen.has(key) && !scene.textures.exists(key)) {
      scene.load.image(key, url);
      seen.add(key);
    }
  }
}

/** Build the decoration layer. Call after the background exists. */
export function createDecor(scene: Phaser.Scene) {
  for (const spec of LAYOUT) {
    const x = TEMPLE.width * spec.fx;
    const y = TEMPLE.height * spec.fy;
    const key = `prop-${spec.prop}`;

    let obj: Phaser.GameObjects.GameObject & { setDepth: (d: number) => unknown };

    if (scene.textures.exists(key)) {
      const img = scene.add.image(x, y, key).setOrigin(0.5, 1).setScale(spec.scale);
      obj = img;
    } else {
      // Fallback placeholder so the world still reads if a prop is missing.
      const rect = scene.add
        .rectangle(x, y, 40, 40, 0x8a6239, 0.9)
        .setOrigin(0.5, 1)
        .setStrokeStyle(2, 0x6b4a2b);
      obj = rect;
    }

    // Floor items (cushions, tray) sit beneath characters so players appear to
    // rest on them. Standing props depth-sort by their base y like characters.
    obj.setDepth(spec.floor ? -500 + y * 0.001 : y);

    // Ambient life: incense smoke and a swaying bell.
    if (spec.animate === "smoke") spawnSmoke(scene, x, y - 24 * spec.scale);
    if (spec.animate === "sway" && "setAngle" in obj) {
      scene.tweens.add({
        targets: obj,
        angle: 2.5,
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
  }

  createLanternGlows(scene);
}

/**
 * Soft, warm lantern glows placed over the painted lanterns in the background
 * (hall eaves + courtyard posts). Each is a radial-gradient sprite that gently
 * pulses, adding cozy lighting without touching the art. Positions are
 * fractional so they track the scaled background.
 */
function createLanternGlows(scene: Phaser.Scene) {
  const key = "lantern-glow";
  if (!scene.textures.exists(key)) {
    // Build a radial-gradient glow texture once.
    const size = 128;
    const canvasTex = scene.textures.createCanvas(key, size, size);
    if (canvasTex) {
      const g = canvasTex.getContext();
      const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grd.addColorStop(0, "rgba(255, 214, 130, 0.9)");
      grd.addColorStop(0.4, "rgba(255, 190, 95, 0.45)");
      grd.addColorStop(1, "rgba(255, 180, 80, 0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      canvasTex.refresh();
    }
  }

  // Approximate lantern positions in the background (fx, fy, scale).
  const spots: [number, number, number][] = [
    [0.35, 0.33, 0.7], // hall eave, left
    [0.65, 0.33, 0.7], // hall eave, right
    [0.17, 0.5, 0.5], // left courtyard post
    [0.83, 0.5, 0.5], // right courtyard post
    [0.24, 0.78, 0.45], // lower-left post
    [0.38, 0.82, 0.4], // lantern near bottom bench
  ];

  for (const [fx, fy, scale] of spots) {
    const glow = scene.add
      .image(TEMPLE.width * fx, TEMPLE.height * fy, key)
      .setScale(scale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(10) // above floor, below the HUD vignette
      .setAlpha(0.5);
    // Gentle candle-like flicker.
    scene.tweens.add({
      targets: glow,
      alpha: 0.78,
      scale: scale * 1.08,
      duration: 1400 + Math.random() * 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }
}

/** A slow, looping trickle of translucent smoke motes. */
function spawnSmoke(scene: Phaser.Scene, x: number, y: number) {
  scene.time.addEvent({
    delay: 900,
    loop: true,
    callback: () => {
      const puff = scene.add
        .circle(x + Phaser.Math.Between(-3, 3), y, Phaser.Math.Between(2, 4), 0xdad3c4, 0.5)
        .setDepth(y + 1);
      scene.tweens.add({
        targets: puff,
        y: y - Phaser.Math.Between(40, 70),
        x: x + Phaser.Math.Between(-14, 14),
        alpha: 0,
        scale: 2,
        duration: Phaser.Math.Between(2600, 3600),
        ease: "Sine.out",
        onComplete: () => puff.destroy(),
      });
    },
  });
}
