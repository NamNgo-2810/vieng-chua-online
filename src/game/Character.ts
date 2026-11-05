import * as Phaser from "phaser";
import { activityAtlas, CELL_SIZE } from "@/config/asset-manifest";
import type { RoleId } from "@/config/roles";
import { ACTIVITIES, type ActivityId } from "@/config/activities";
import type { Direction } from "@/lib/types";
import { animFor } from "./anim";

/**
 * A reusable in-world character. Encapsulates everything about one player's
 * visual presence: body sprite, name label, held prop, direction, current
 * activity, and the animation state machine. It transitions between activities
 * smoothly (no scene reset) — only the pieces that changed are updated.
 *
 * The scene owns a Character per player and feeds it networked state; the
 * Character decides how to render it.
 */
export interface CharacterInit {
  scene: Phaser.Scene;
  sessionId: string;
  role: RoleId;
  displayName: string;
  activity: ActivityId;
  x: number;
  y: number;
  isLocal: boolean;
}

export class Character {
  readonly sessionId: string;
  readonly container: Phaser.GameObjects.Container;

  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Sprite;
  private label: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Ellipse;
  private prop?: Phaser.GameObjects.Image;

  private role: RoleId;
  private activity: ActivityId;
  private direction: Direction = "down";
  private isLocal: boolean;

  // Smoothing targets for remote movement.
  targetX: number;
  targetY: number;

  // Animation helpers (tweens we must stop on activity change).
  private bobTween?: Phaser.Tweens.Tween;
  private pulseTween?: Phaser.Tweens.Tween;

  constructor(init: CharacterInit) {
    this.scene = init.scene;
    this.sessionId = init.sessionId;
    this.role = init.role;
    this.activity = init.activity;
    this.isLocal = init.isLocal;
    this.targetX = init.x;
    this.targetY = init.y;

    const s = init.scene;

    // Soft contact shadow for grounding (cozy, readable depth).
    this.shadow = s.add
      .ellipse(0, -2, CELL_SIZE * 0.5, CELL_SIZE * 0.18, 0x000000, 0.22)
      .setOrigin(0.5, 0.5);

    this.body = s.add.sprite(0, 0, this.textureKey(init.role, init.activity));
    this.body.setOrigin(0.5, 1);

    this.label = s.add
      .text(0, -CELL_SIZE - 6, init.displayName, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#2b2119",
        backgroundColor: "#e8dcc5dd",
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5, 1);

    // Subtle ring under the local player's name so you can find yourself.
    if (init.isLocal) {
      this.label.setColor("#4a2f12");
      this.label.setBackgroundColor("#c9a24add");
    }

    this.container = s.add.container(init.x, init.y, [this.shadow, this.body, this.label]);
    this.container.setDepth(init.y); // simple top-down depth sort

    this.applyActivity(init.activity, true);
  }

  private textureKey(role: RoleId, activity: ActivityId): string {
    const key = `char-${role}-${activity}`;
    if (this.scene.textures.exists(key)) return key;
    return `char-${role}-WALKING`;
  }

  /** The networked state changed; reconcile only what differs. */
  update(opts: {
    displayName: string;
    role: RoleId;
    activity: ActivityId;
    direction: Direction;
    x: number;
    y: number;
  }) {
    if (this.label.text !== opts.displayName) this.label.setText(opts.displayName);

    if (opts.activity !== this.activity || opts.role !== this.role) {
      this.role = opts.role;
      this.applyActivity(opts.activity, false);
    }

    this.setDirection(opts.direction);

    if (!this.isLocal) {
      this.targetX = opts.x;
      this.targetY = opts.y;
    }
  }

  setDirection(dir: Direction) {
    const changed = dir !== this.direction;
    this.direction = dir;
    // Left and right share the same (right-facing) source frames; we mirror for
    // left so the monk always faces the way he is moving. Up/down are not
    // mirrored. This guarantees correct facing regardless of the source art's
    // native orientation.
    this.body.setFlipX(dir === "left");
    if (this.activity === "WALKING" && changed) {
      this.playWalk();
    }
  }

  /** Play (or restart) the walk cycle for the current facing, if available. */
  private playWalk() {
    const animKey = `walk-${this.role}-${this.direction}`;
    if (this.scene.anims.exists(animKey)) {
      if (this.body.anims.getName() !== animKey || !this.body.anims.isPlaying) {
        this.body.play(animKey, true);
      }
    }
  }

  /** Freeze the body on the first frame of the current facing (idle stand). */
  private restWalkFrame() {
    const animKey = `walk-${this.role}-${this.direction}`;
    const anim = this.scene.anims.get(animKey);
    this.body.stop();
    if (anim && anim.frames.length > 0) {
      this.body.setFrame(anim.frames[0].frame.name);
    }
  }

  /** Scene calls this each frame for the local player to reflect motion. */
  setMoving(moving: boolean) {
    if (this.activity !== "WALKING") return;
    if (moving) this.playWalk();
    else this.restWalkFrame();
  }

  /** Local movement writes position directly (optimistic, no network wait). */
  setLocalPosition(x: number, y: number) {
    this.container.x = x;
    this.container.y = y;
    this.container.setDepth(y);
  }

  /** Called from the scene's update() to smooth remote players to their target. */
  interpolate() {
    if (this.isLocal) return;
    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, 0.2);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, 0.2);
    this.container.setDepth(this.container.y);
    // Animate the walk only while actually closing distance to the target so a
    // standing remote monk doesn't march in place.
    if (this.activity === "WALKING") {
      this.setMoving(Math.hypot(dx, dy) > 1.5);
    }
  }

  /** Switch animation + prop for a new activity, with a small entry flourish. */
  private applyActivity(activity: ActivityId, initial: boolean) {
    this.activity = activity;
    const behaviour = animFor(activity);

    // Reset any ongoing motion tweens from the previous activity.
    this.bobTween?.remove();
    this.bobTween = undefined;
    this.pulseTween?.remove();
    this.pulseTween = undefined;
    this.body.stop();
    this.body.setAngle(0);
    this.body.y = 0;
    // Seated/standing poses are never mirrored; only walking mirrors for left.
    if (behaviour.style !== "walk") this.body.setFlipX(false);

    // Swap the body texture to the activity's sheet (falls back to walk).
    const key = this.textureKey(this.role, activity);
    if (this.body.texture.key !== key) this.body.setTexture(key);

    // Directional walk cycle (one 2-frame step per facing). Start on the
    // current facing's resting frame; the scene calls setMoving(true) to make
    // the legs actually cycle while the player is moving.
    const atlas = activityAtlas(this.role, activity);
    if (behaviour.style === "walk" && atlas && atlas.frames > 1) {
      this.restWalkFrame();
    }

    // Gentle vertical bob for "loop" activities so they read as alive.
    if (behaviour.bob > 0 && behaviour.style === "loop") {
      this.bobTween = this.scene.tweens.add({
        targets: this.body,
        y: -behaviour.bob,
        duration: 1000 / behaviour.fps,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    // Repetitive "strike" motion (wooden fish / bell): a quick dip + recover.
    if (behaviour.style === "strike" && behaviour.pulseMs) {
      this.pulseTween = this.scene.tweens.add({
        targets: this.body,
        y: behaviour.bob,
        angle: this.direction === "left" ? 4 : -4,
        duration: behaviour.pulseMs * 0.35,
        yoyo: true,
        repeat: -1,
        repeatDelay: behaviour.pulseMs * 0.3,
        ease: "Quad.out",
      });
    }

    this.applyProp(activity);

    // Entry flourish: a soft scale pop so activity changes have feedback.
    if (behaviour.entryPop && !initial) {
      this.body.setScale(1.18);
      this.scene.tweens.add({
        targets: this.body,
        scale: 1,
        duration: 220,
        ease: "Back.out",
      });
      this.emitSparkle();
    }
  }

  /** Attach/replace the activity's prop, placed per its PropPlacement. */
  private applyProp(activity: ActivityId) {
    this.prop?.destroy();
    this.prop = undefined;

    const placement = animFor(activity).prop;
    if (placement === "none") return;

    const propKey = ACTIVITIES[activity].prop;
    if (!propKey) return;
    const texKey = `prop-${propKey}`;
    if (!this.scene.textures.exists(texKey)) return;

    if (placement === "seat") {
      // A ground item the character sits on (meditation cushion). Draw it
      // behind the body and anchored under the feet so the monk sits ON it,
      // never over his face.
      this.prop = this.scene.add.image(0, 2, texKey);
      this.prop.setOrigin(0.5, 1).setScale(0.6);
      // Place just above the shadow (index 0) but below the body.
      this.container.addAt(this.prop, 1);
    } else {
      // Held in front at hand/chest height.
      this.prop = this.scene.add.image(CELL_SIZE * 0.34, -CELL_SIZE * 0.42, texKey);
      this.prop.setOrigin(0.5, 1).setScale(0.45);
      // Insert just under the label so it sits in front of the body.
      this.container.addAt(this.prop, this.container.length - 1);
    }
  }

  /** Small, non-gamified visual feedback: a few rising motes on change. */
  private emitSparkle() {
    for (let i = 0; i < 4; i++) {
      const dot = this.scene.add.circle(
        Phaser.Math.Between(-10, 10),
        -CELL_SIZE * 0.6,
        2,
        0xf3e4b0,
        0.9
      );
      this.container.add(dot);
      this.scene.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(18, 34),
        alpha: 0,
        duration: Phaser.Math.Between(500, 850),
        ease: "Sine.out",
        delay: i * 60,
        onComplete: () => dot.destroy(),
      });
    }
  }

  destroy() {
    this.bobTween?.remove();
    this.pulseTween?.remove();
    this.container.destroy();
  }
}
