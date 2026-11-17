/**
 * Phaser side of the code-drawn characters: turns sprite-painter frames into
 * textures at the keys the game uses, but only where no real art was loaded.
 *
 * Texture keys:  look-<AppearanceId>-<ActivityId>
 * Walk anims:    walk-<AppearanceId>-<direction>
 */

import * as Phaser from "phaser";
import { ACTIVITY_IDS, type ActivityId } from "@/config/activities";
import { APPEARANCE_IDS, APPEARANCES, hasRealWalkArt, type AppearanceId } from "@/config/appearances";
import { ACTIVITY_POSE, WALK_FRAMES, SPRITE_CELL, paintCharacter } from "./sprite-painter";

/** Texture key for a look's activity sprite (barefoot after leaving the sandals). */
export function lookTextureKey(look: AppearanceId, activity: ActivityId, barefoot = false): string {
  return `look-${look}-${activity}${barefoot ? "-bare" : ""}`;
}

/** Animation key for a look's walk cycle in one direction. */
export function walkAnimKey(look: AppearanceId, dir: string, barefoot = false): string {
  return `walk-${look}-${dir}${barefoot ? "-bare" : ""}`;
}

/**
 * Create a placeholder texture for every look x activity that has no texture
 * yet. Returns the looks whose WALKING texture is real art (so the caller can
 * use the manifest's walk layout for those).
 */
export function ensurePlaceholderTextures(scene: Phaser.Scene): Set<AppearanceId> {
  const realWalk = new Set<AppearanceId>();
  for (const look of APPEARANCE_IDS) {
    const palette = APPEARANCES[look].palette;
    for (const barefoot of [false, true])
    for (const activity of ACTIVITY_IDS) {
      const key = lookTextureKey(look, activity, barefoot);
      if (scene.textures.exists(key)) {
        if (activity === "WALKING" && !barefoot && hasRealWalkArt(look, true)) realWalk.add(look);
        continue;
      }
      if (activity === "WALKING") {
        const tex = scene.textures.createCanvas(key, SPRITE_CELL * WALK_FRAMES.length, SPRITE_CELL);
        if (!tex) continue;
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        WALK_FRAMES.forEach((f, i) => {
          paintCharacter(ctx, palette, { body: "stand", arms: "sides", facing: f.facing, step: f.step, barefoot }, i * SPRITE_CELL, 0);
          tex.add(i, 0, i * SPRITE_CELL, 0, SPRITE_CELL, SPRITE_CELL);
        });
        tex.refresh();
      } else {
        const tex = scene.textures.createCanvas(key, SPRITE_CELL, SPRITE_CELL);
        if (!tex) continue;
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        paintCharacter(ctx, palette, { ...ACTIVITY_POSE[activity], barefoot });
        tex.refresh();
      }
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
  return realWalk;
}
