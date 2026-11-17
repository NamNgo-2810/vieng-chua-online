import * as Phaser from "phaser";
import { CELL_SIZE } from "@/config/asset-manifest";
import type { RoleId } from "@/config/roles";
import type { AppearanceId } from "@/config/appearances";
import { ACTIVITIES, type ActivityId } from "@/config/activities";
import type { Direction } from "@/lib/types";
import { animFor, PROP_DEFAULTS } from "./anim";
import { lookTextureKey, walkAnimKey } from "./placeholder-sprites";

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
  /** How the character looks (resolved from role + stored appearance). */
  appearance: AppearanceId;
  /** Sandals left at the Tam quan: drawn barefoot. */
  barefoot?: boolean;
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
  private look: AppearanceId;
  private barefoot: boolean;
  private activity: ActivityId;
  private direction: Direction = "down";
  private isLocal: boolean;

  // Smoothing targets for remote movement.
  targetX: number;
  targetY: number;

  // Speech bubble (chat). Lives outside the container at a high depth so other
  // characters never cover it; syncBubble() keeps it over the head.
  private bubble?: Phaser.GameObjects.Text;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  /** Greeting icon over the head (chắp tay, vái, vẫy tay). */
  private emoteIcon?: Phaser.GameObjects.Text;
  /** Golden ring shown while practising together with others (đồng tu). */
  private groupRing?: Phaser.GameObjects.Ellipse;

  // Animation helpers (tweens we must stop on activity change).
  private bobTween?: Phaser.Tweens.Tween;
  private pulseTween?: Phaser.Tweens.Tween;

  constructor(init: CharacterInit) {
    this.scene = init.scene;
    this.sessionId = init.sessionId;
    this.role = init.role;
    this.look = init.appearance;
    this.barefoot = init.barefoot ?? false;
    this.activity = init.activity;
    this.isLocal = init.isLocal;
    this.targetX = init.x;
    this.targetY = init.y;

    const s = init.scene;

    // Soft contact shadow for grounding (cozy, readable depth).
    this.shadow = s.add
      .ellipse(0, -2, CELL_SIZE * 0.5, CELL_SIZE * 0.18, 0x000000, 0.22)
      .setOrigin(0.5, 0.5);

    this.body = s.add.sprite(0, 0, this.textureKey(init.activity));
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

  private textureKey(activity: ActivityId): string {
    const key = lookTextureKey(this.look, activity, this.barefoot);
    if (this.scene.textures.exists(key)) return key;
    return lookTextureKey(this.look, "WALKING", this.barefoot);
  }

  /** The networked state changed; reconcile only what differs. */
  update(opts: {
    displayName: string;
    role: RoleId;
    appearance: AppearanceId;
    barefoot?: boolean;
    activity: ActivityId;
    direction: Direction;
    x: number;
    y: number;
  }) {
    if (this.label.text !== opts.displayName) this.label.setText(opts.displayName);

    const bare = opts.barefoot ?? false;
    if (opts.activity !== this.activity || opts.role !== this.role || opts.appearance !== this.look || bare !== this.barefoot) {
      this.role = opts.role;
      this.look = opts.appearance;
      this.barefoot = bare;
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
    const animKey = walkAnimKey(this.look, this.direction, this.barefoot);
    if (this.scene.anims.exists(animKey)) {
      if (this.body.anims.getName() !== animKey || !this.body.anims.isPlaying) {
        this.body.play(animKey, true);
      }
    }
  }

  /** Freeze the body on the first frame of the current facing (idle stand). */
  private restWalkFrame() {
    const animKey = walkAnimKey(this.look, this.direction, this.barefoot);
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
    const key = this.textureKey(activity);
    if (this.body.texture.key !== key) this.body.setTexture(key);

    // Directional walk cycle (one 2-frame step per facing). Start on the
    // current facing's resting frame; the scene calls setMoving(true) to make
    // the legs actually cycle while the player is moving.
    if (behaviour.style === "walk" && this.scene.anims.exists(walkAnimKey(this.look, this.direction, this.barefoot))) {
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

    const behaviour = animFor(activity);
    const placement = behaviour.prop;
    if (placement === "none") return;
    const d = PROP_DEFAULTS[placement];
    const scale = behaviour.propScale ?? d.scale;
    const px = (behaviour.propX ?? d.x) * CELL_SIZE;
    const py = (behaviour.propY ?? d.y) * CELL_SIZE;

    const propKey = ACTIVITIES[activity].prop;
    if (!propKey) return;
    const texKey = `prop-${propKey}`;
    if (!this.scene.textures.exists(texKey)) return;

    if (placement === "seat") {
      // A ground item the character sits on (meditation cushion). Draw it
      // behind the body and anchored under the feet so the monk sits ON it,
      // never over his face.
      this.prop = this.scene.add.image(px, py, texKey);
      this.prop.setOrigin(0.5, 1).setScale(scale);
      // Place just above the shadow (index 0) but below the body.
      this.container.addAt(this.prop, 1);
    } else {
      // Held in front at hand/chest height.
      this.prop = this.scene.add.image(px, py, texKey);
      this.prop.setOrigin(0.5, 1).setScale(scale);
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

  /** Show a chat bubble over the head for `ms`, replacing any current one. */
  showBubble(text: string, ms: number) {
    this.clearBubble();
    this.bubble = this.scene.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#2b2119",
        backgroundColor: "#fffaf0f2",
        padding: { x: 6, y: 4 },
        align: "center",
        wordWrap: { width: 170, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 1)
      .setDepth(4500);
    this.syncBubble();
    this.bubbleTimer = this.scene.time.delayedCall(ms, () => this.clearBubble());
  }

  /** Keep the bubble and greeting above the name label (call every frame). */
  syncBubble() {
    if (this.bubble) this.bubble.setPosition(this.container.x, this.container.y - CELL_SIZE - 26);
    if (this.emoteIcon) this.emoteIcon.setPosition(this.container.x + 22, this.container.y - CELL_SIZE + 4);
  }

  /** Show a greeting: an icon by the head and a small gesture of the body. */
  showEmote(icon: string, kind: "bow" | "wave" | "hands", ms: number) {
    this.emoteIcon?.destroy();
    this.emoteIcon = this.scene.add.text(0, 0, icon, { fontSize: "20px" }).setOrigin(0.5, 1).setDepth(4550);
    this.syncBubble();
    this.scene.tweens.add({ targets: this.emoteIcon, scale: { from: 0.4, to: 1 }, duration: 220, ease: "Back.out" });
    if (kind === "bow") {
      this.scene.tweens.add({ targets: this.body, scaleY: 0.88, y: 2, duration: 260, yoyo: true, hold: 500, ease: "Sine.inOut" });
    } else if (kind === "wave") {
      this.scene.tweens.add({ targets: this.body, angle: 6, duration: 160, yoyo: true, repeat: 3, ease: "Sine.inOut" });
    } else {
      this.scene.tweens.add({ targets: this.body, y: -3, duration: 240, yoyo: true, ease: "Sine.inOut" });
    }
    const icon$ = this.emoteIcon;
    this.scene.time.delayedCall(ms, () => {
      if (this.emoteIcon !== icon$) return;
      this.scene.tweens.add({ targets: icon$, alpha: 0, duration: 300, onComplete: () => icon$.destroy() });
      this.emoteIcon = undefined;
    });
  }

  /** Turn the đồng tu ring on or off. */
  setGroupGlow(on: boolean) {
    if (on && !this.groupRing) {
      this.groupRing = this.scene.add.ellipse(0, -2, CELL_SIZE * 0.9, CELL_SIZE * 0.32).setStrokeStyle(2, 0xf3d27a, 0.9);
      this.container.addAt(this.groupRing, 0);
      this.scene.tweens.add({ targets: this.groupRing, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    } else if (!on && this.groupRing) {
      this.groupRing.destroy();
      this.groupRing = undefined;
    }
  }

  private clearBubble() {
    this.bubbleTimer?.remove();
    this.bubbleTimer = undefined;
    this.bubble?.destroy();
    this.bubble = undefined;
  }

  destroy() {
    this.clearBubble();
    this.emoteIcon?.destroy();
    this.bobTween?.remove();
    this.pulseTween?.remove();
    this.container.destroy();
  }
}
