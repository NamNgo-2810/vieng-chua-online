/**
 * Tây du ký decor (config/journey.ts), drawn in this game's own pixel style:
 *  - two silk paintings on the main hall's back wall: the four pilgrims on the
 *    road west, and Ngộ Không riding his cloud;
 *  - the golden staff (Như Ý Kim Cô Bổng) on a lacquer stand in the library;
 *  - the landing cloud under a rider who arrives by cân đẩu vân.
 */

import * as Phaser from "phaser";
import { SUTRA_LIBRARY } from "@/config/areas";
import { CLOUD } from "@/config/journey";
import { pixelSprite, OUTLINE, type Paint } from "./pixel-art";

const GOLD = "#ffd84a";

/** A tiny pilgrim figure, 6 art px wide and ~10 tall, standing at (x, y). */
function pilgrim(p: Paint, x: number, y: number, robe: string, head: string, extra?: (x: number, y: number) => void) {
  p.px(x + 1, y - 6, 4, 6, robe);
  p.px(x + 1, y - 10, 4, 4, head);
  extra?.(x, y);
}

function scrollPainting(p: Paint, x: number, y: number, w: number, h: number, scene: (x: number, y: number, w: number, h: number) => void) {
  p.px(x - 2, y - 3, w + 4, 3, "#6b4a2b"); // top rod
  p.px(x - 2, y + h, w + 4, 3, "#6b4a2b"); // bottom rod
  p.box(x, y, w, h, "#efe3c4"); // silk
  p.px(x + 2, y + 2, w - 4, 1, "#d9a441");
  p.px(x + 2, y + h - 3, w - 4, 1, "#d9a441");
  scene(x + 3, y + 4, w - 6, h - 8);
}

/**
 * Two hanging silk scrolls on the main hall's back wall, in the gaps between
 * the pillars and the altar banners (art coords; call from the hall's draw):
 * right, Đường Tăng on the white horse led by Ngộ Không; left, Bát Giới and
 * Sa Tăng with the luggage, Ngộ Không's cloud in the sky above.
 */
export function paintPilgrimMurals(p: Paint) {
  const { px, disc } = p;
  const mountains = (x: number, y: number, w: number) => {
    for (let i = 0; i < w; i++) {
      const m = 4 + Math.round(Math.abs(Math.sin(i / 5 + x)) * 8);
      px(x + i, y + 22 - m, 1, m, "#a8bfae");
    }
  };
  scrollPainting(p, p.g(1024), p.g(24), p.g(88), p.g(116), (x, y, w, h) => {
    mountains(x, y, w);
    const base = y + h - 6;
    px(x, base, w, 2, "#b9a27a"); // the road
    pilgrim(p, x + 1, base, "#d8a020", "#9a6a36", (x0, y0) => { px(x0 + 5, y0 - 14, 1, 14, "#b8322a"); px(x0 + 1, y0 - 9, 4, 1, GOLD); });
    px(x + 12, base - 8, 13, 5, "#f4f4f4"); // horse body
    px(x + 23, base - 13, 3, 6, "#f4f4f4"); // neck and head
    px(x + 13, base - 3, 1, 3, "#f4f4f4");
    px(x + 23, base - 3, 1, 3, "#f4f4f4");
    pilgrim(p, x + 14, base - 7, "#b8322a", "#f0c8a0", (x0, y0) => px(x0 + 1, y0 - 11, 4, 1, GOLD));
    px(x + w - 9, y + 2, 6, 6, "#d62828"); // the red seal
  });
  scrollPainting(p, p.g(262), p.g(24), p.g(88), p.g(116), (x, y, w, h) => {
    // Ngộ Không's cloud in the sky.
    for (let i = -2; i <= 2; i++) disc(x + 22 + i * 3, y + 12, 3, "#ffffff");
    pilgrim(p, x + 19, y + 11, "#d8a020", "#9a6a36", (x0, y0) => px(x0 + 1, y0 - 9, 4, 1, GOLD));
    mountains(x, y + 8, w);
    const base = y + h - 6;
    px(x, base, w, 2, "#b9a27a");
    pilgrim(p, x + 6, base, "#3d4560", "#f2b8b0", (x0, y0) => { px(x0 + 4, y0 - 8, 2, 2, "#f7cccc"); px(x0 - 1, y0 - 10, 2, 2, "#e8a0a0"); });
    pilgrim(p, x + 22, base, "#6b5a3a", "#9aaabb", (x0, y0) => { px(x0 + 1, y0 - 7, 4, 2, "#a8322a"); px(x0 + 6, y0 - 9, 4, 4, "#c9a24a"); });
    px(x + 2, y + 2, 6, 6, "#d62828"); // the red seal
  });
}

/** The golden staff on its lacquer stand in the library (world position from config). */
export function buildGoldenStaff(scene: Phaser.Scene) {
  const s = SUTRA_LIBRARY.staffStand;
  pixelSprite(scene, "jt-staff-stand", 70, 24, (p) => {
    p.box(4, 14, 62, 6, "#8a2a1e"); // lacquer stand
    p.px(8, 20, 4, 4, "#6e1f17");
    p.px(58, 20, 4, 4, "#6e1f17");
    p.box(14, 6, 3, 8, "#8a2a1e"); // cradles
    p.box(53, 6, 3, 8, "#8a2a1e");
    p.box(2, 4, 66, 2, "#b8322a"); // the staff
    p.px(1, 3, 6, 4, GOLD);
    p.px(63, 3, 6, 4, GOLD);
    p.px(30, 4, 10, 2, "#d9a441");
    p.px(0, 0, 1, 1, OUTLINE);
  });
  scene.add.image(s.x, s.y + 12, "jt-staff-stand").setOrigin(0.5, 1).setDepth(s.y);
  scene.add
    .text(s.x, s.y - 40, "Như Ý Kim Cô Bổng", { fontFamily: "monospace", fontSize: "10px", color: "#2b2119", backgroundColor: "#f3e4b0cc", padding: { x: 3, y: 1 } })
    .setOrigin(0.5, 1)
    .setDepth(s.y);
}

/** The cân đẩu vân under a rider who just landed; it drifts off and fades. */
export function landingCloud(scene: Phaser.Scene, x: number, y: number) {
  pixelSprite(scene, "jt-cloud", 30, 12, (p) => {
    for (const [cx, cy, r] of [[7, 7, 4], [13, 5, 5], [20, 6, 4], [25, 8, 3], [12, 8, 4], [18, 8, 4]] as const) p.disc(cx, cy, r, "#ffffff");
    p.px(4, 9, 22, 1, "#dbe8f0");
    p.px(26, 4, 3, 1, "#f6e6a8"); // golden curl
  });
  const cloud = scene.add.image(x, y + 6, "jt-cloud").setOrigin(0.5, 0.5).setDepth(y - 1);
  scene.tweens.add({ targets: cloud, y: y + 2, duration: 300, yoyo: true, repeat: 1 });
  scene.tweens.add({
    targets: cloud,
    x: x + 260,
    y: y - 80,
    alpha: 0,
    delay: CLOUD.landingMs * 0.5,
    duration: CLOUD.landingMs * 0.5,
    ease: "Quad.in",
    onComplete: () => cloud.destroy(),
  });
}
