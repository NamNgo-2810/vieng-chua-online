/**
 * Code-drawn pieces for purification and bathing the Buddha:
 *  - at the Tam quan: the sandal rack (with one pair per barefoot visitor) and
 *    the wash basin with its bamboo spout;
 *  - in the courtyard: the bathing basin with the infant Buddha (Tắm Phật),
 *    and the water poured over him when someone bathes the statue.
 * Positions: TAM_QUAN.shoeRack / washBasin and BATHING_BUDDHA (config/areas.ts).
 */

import * as Phaser from "phaser";
import { TAM_QUAN, BATHING_BUDDHA } from "@/config/areas";
import { pixelSprite, OUTLINE } from "./pixel-art";

function textures(scene: Phaser.Scene) {
  pixelSprite(scene, "pu-rack", 40, 20, (p) => {
    p.box(1, 2, 38, 3, "#6b4a2b"); // top shelf
    p.box(1, 12, 38, 3, "#6b4a2b"); // lower shelf
    p.px(1, 2, 2, 18, "#5a3d22");
    p.px(37, 2, 2, 18, "#5a3d22");
  });
  pixelSprite(scene, "pu-basin", 40, 22, (p) => {
    p.px(30, 0, 3, 10, "#7a9a4a"); // bamboo spout post
    p.px(18, 2, 15, 2, "#8aaa5a"); // bamboo pipe
    p.px(18, 4, 1, 8, "#9ac8e0"); // falling water
    p.box(2, 11, 36, 9, "#a8a297"); // stone trough
    p.px(4, 12, 32, 4, "#6aa8c6"); // water
    p.px(6, 13, 8, 1, "#9ac8e0");
    p.box(34, 8, 4, 3, "#a8743f"); // coconut ladle
    p.px(35, 5, 1, 3, "#6b4a2b");
  });
  pixelSprite(scene, "pu-buddha", 26, 34, (p) => {
    p.box(1, 24, 24, 9, "#a8a297"); // stone basin
    p.px(3, 25, 20, 4, "#6aa8c6"); // water
    for (let i = 0; i < 5; i++) p.disc(5 + i * 4, 23, 2, i % 2 ? "#f4a6c0" : "#f8c6d6"); // lotus pedestal
    p.px(10, 10, 6, 12, "#e3b34e"); // body (gold)
    p.px(14, 10, 2, 12, "#c49433");
    p.disc(13, 7, 3, "#e8bb55"); // head
    p.px(16, 1, 2, 9, "#e3b34e"); // right hand pointing to the sky
    p.px(8, 16, 2, 6, "#e3b34e"); // left hand pointing to the earth
    p.px(12, 7, 1, 1, OUTLINE);
    p.px(14, 7, 1, 1, OUTLINE);
    p.box(20, 18, 5, 3, "#a8743f"); // ladle resting on the rim
  });
  pixelSprite(scene, "pu-sandals", 7, 3, (p) => {
    p.px(0, 0, 3, 3, "#6b4a2b");
    p.px(4, 0, 3, 3, "#6b4a2b");
    p.px(1, 0, 1, 1, "#c9a24a");
    p.px(5, 0, 1, 1, "#c9a24a");
  });
}

/** The sandal rack and wash basin at the Tam quan. */
export function buildPurificationStation(scene: Phaser.Scene) {
  textures(scene);
  const r = TAM_QUAN.shoeRack;
  const b = TAM_QUAN.washBasin;
  scene.add.image(r.x, r.y + 10, "pu-rack").setOrigin(0.5, 1).setDepth(r.y);
  scene.add.image(b.x, b.y + 12, "pu-basin").setOrigin(0.5, 1).setDepth(b.y);
  const label = { fontFamily: "monospace", fontSize: "10px", color: "#2b2119", backgroundColor: "#f3e4b0cc", padding: { x: 3, y: 1 } };
  scene.add.text(r.x, r.y - 34, "Để dép", label).setOrigin(0.5, 1).setDepth(r.y);
  scene.add.text(b.x, b.y - 34, "Rửa tay chân", label).setOrigin(0.5, 1).setDepth(b.y);
}

/** Sandals on the rack: one pair per barefoot visitor (up to 8), on two shelves. */
export function drawSandalPairs(scene: Phaser.Scene, count: number, previous: Phaser.GameObjects.Image[]): Phaser.GameObjects.Image[] {
  for (const p of previous) p.destroy();
  textures(scene);
  const r = TAM_QUAN.shoeRack;
  const out: Phaser.GameObjects.Image[] = [];
  // The rack image (2 world px per art px) stands from r.y - 30 to r.y + 10;
  // its shelves' tops are at r.y - 26 and r.y - 6.
  for (let i = 0; i < Math.min(8, count); i++) {
    const shelf = i < 4 ? 0 : 1;
    const x = r.x - 34 + (i % 4) * 17;
    const y = r.y - 26 + shelf * 20;
    out.push(scene.add.image(x, y, "pu-sandals").setOrigin(0, 1).setDepth(r.y + 1));
  }
  return out;
}

/** The infant Buddha in his bathing basin, on the terrace before the main hall. */
export function buildBathingBuddha(scene: Phaser.Scene) {
  textures(scene);
  const { x, y } = BATHING_BUDDHA;
  scene.add.image(x, y + 12, "pu-buddha").setOrigin(0.5, 1).setScale(1.5).setDepth(y + 12);
  scene.add
    .text(x, y - 92, "Tắm Phật", { fontFamily: "monospace", fontSize: "10px", color: "#2b2119", backgroundColor: "#f3e4b0cc", padding: { x: 3, y: 1 } })
    .setOrigin(0.5, 1)
    .setDepth(y + 12);
}

/** Water poured from the ladle over the statue: drops falling into the basin. */
export function pourOverBuddha(scene: Phaser.Scene) {
  const { x, y } = BATHING_BUDDHA;
  for (let i = 0; i < 10; i++) {
    const drop = scene.add.rectangle(x + Phaser.Math.Between(-12, 12), y - 70, 2, 4, 0x9ac8e0, 0.95).setDepth(y + 13);
    scene.tweens.add({
      targets: drop,
      y: y + 4,
      alpha: 0.2,
      duration: 500 + Math.random() * 250,
      delay: i * 70,
      ease: "Quad.in",
      onComplete: () => drop.destroy(),
    });
  }
}
