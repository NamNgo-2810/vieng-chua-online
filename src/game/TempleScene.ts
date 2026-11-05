import * as Phaser from "phaser";
import { useGameStore } from "@/state/store";
import { TEMPLE } from "@/game/world";
import {
  backgroundUrl,
  activityAtlas,
  characterManifest,
  walkFrameRanges,
} from "@/config/asset-manifest";
import { ROLE_IDS, type RoleId } from "@/config/roles";
import { ACTIVITIES, type ActivityId } from "@/config/activities";
import type { Player, Direction } from "@/lib/types";
import { Character } from "./Character";
import { preloadDecor, createDecor } from "./decor";
import { virtualInput } from "./input";

const SPEED = 160; // px/sec for local movement
const IDLE_ACTIVITIES_WHILE_STILL = false; // moving auto-switches to WALKING

/**
 * The shared top-down temple scene. Responsibilities are intentionally narrow:
 *  - load textures (background, per-role/activity character sheets, props)
 *  - build the world (background + decoration layer)
 *  - keep a Character per player in sync with the store
 *  - drive local movement input
 *
 * All per-character animation/visual logic lives in Character; all world
 * dressing lives in decor. The scene just orchestrates.
 */
export class TempleScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private characters = new Map<string, Character>();
  private unsub?: () => void;
  private localId: string | null = null;

  constructor() {
    super("TempleScene");
  }

  preload() {
    this.load.image("bg", backgroundUrl());

    // One texture per role+activity. Multi-frame strips load as spritesheets.
    for (const role of ROLE_IDS) {
      for (const activity of Object.keys(ACTIVITIES) as ActivityId[]) {
        const atlas = activityAtlas(role, activity);
        if (!atlas) continue;
        const key = `char-${role}-${activity}`;
        if (this.textures.exists(key)) continue;
        if (atlas.frames > 1) {
          this.load.spritesheet(key, `/assets/${atlas.file}`, {
            frameWidth: atlas.frameWidth,
            frameHeight: atlas.frameHeight,
          });
        } else {
          this.load.image(key, `/assets/${atlas.file}`);
        }
      }
    }

    preloadDecor(this);
  }

  create() {
    // Pixel-perfect: no smoothing on any texture.
    for (const key of this.textures.getTextureKeys()) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // Background, scaled to fill the world.
    const bg = this.add.image(0, 0, "bg").setOrigin(0, 0).setDepth(-1000);
    bg.setDisplaySize(TEMPLE.width, TEMPLE.height);
    this.cameras.main.setBounds(0, 0, TEMPLE.width, TEMPLE.height);

    // Soft warm vignette for cozy lighting.
    this.addVignette();

    // Per-direction walk cycles. The sheet is NOT a single same-facing loop:
    // each direction (down/up/left/right) has its own 2-frame step packed into
    // the WALKING strip. We create one looping animation per direction so the
    // monk steps in place for the way he's facing instead of cycling through
    // all four facings (which looked like he kept turning left/right).
    for (const role of ROLE_IDS) {
      const atlas = activityAtlas(role, "WALKING");
      const key = `char-${role}-WALKING`;
      if (!atlas || atlas.frames <= 1 || !this.textures.exists(key)) continue;
      const ranges = walkFrameRanges(characterManifest(role).walkDirs);
      for (const dir of ["down", "up", "left", "right"] as Direction[]) {
        const r = ranges[dir];
        if (!r) continue;
        const animKey = `walk-${role}-${dir}`;
        if (this.anims.exists(animKey)) continue;
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(key, { start: r.start, end: r.end }),
          frameRate: 6,
          repeat: -1,
        });
      }
    }

    // Decoration layer (altar, burner, bell, wooden fish, offerings).
    createDecor(this);

    // Input.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Subscribe to the store and sync characters.
    const store = useGameStore.getState();
    this.localId = store.localSessionId;
    this.syncCharacters(store.players);
    this.unsub = useGameStore.subscribe((s) => {
      this.localId = s.localSessionId;
      this.syncCharacters(s.players);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
  }

  /** Reconcile the Character map with the store's player map. */
  private syncCharacters(players: Record<string, Player>) {
    for (const [id, c] of this.characters) {
      if (!players[id] || !players[id].isOnline) {
        c.destroy();
        this.characters.delete(id);
      }
    }
    for (const [id, p] of Object.entries(players)) {
      if (!p.isOnline) continue;
      let c = this.characters.get(id);
      if (!c) {
        c = new Character({
          scene: this,
          sessionId: id,
          role: p.role,
          displayName: p.displayName,
          activity: p.currentActivity,
          x: p.positionX,
          y: p.positionY,
          isLocal: id === this.localId,
        });
        this.characters.set(id, c);
      }
      c.update({
        displayName: p.displayName,
        role: p.role,
        activity: p.currentActivity,
        direction: p.direction,
        x: p.positionX,
        y: p.positionY,
      });
    }
  }

  private addVignette() {
    const g = this.add.graphics().setDepth(5000);
    const w = TEMPLE.width;
    const h = TEMPLE.height;
    // Four soft dark edges via overlapping low-alpha rectangles.
    const edge = 90;
    g.fillStyle(0x2b1b0e, 0.0);
    for (let i = 0; i < edge; i++) {
      const a = (1 - i / edge) * 0.18;
      g.fillStyle(0x201208, a);
      g.fillRect(0, i, w, 1); // top
      g.fillRect(0, h - i - 1, w, 1); // bottom
      g.fillRect(i, 0, 1, h); // left
      g.fillRect(w - i - 1, 0, 1, h); // right
    }
    g.setScrollFactor(0);
  }

  update(_time: number, delta: number) {
    const store = useGameStore.getState();
    const localId = store.localSessionId;

    // Smooth remote characters.
    for (const [id, c] of this.characters) {
      if (id !== localId) c.interpolate();
    }

    if (!localId) return;
    const me = this.characters.get(localId);
    if (!me) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

    // Add touch/virtual input (from the mobile D-pad). It's already normalized.
    dx += virtualInput.x;
    dy += virtualInput.y;

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      const len = Math.hypot(dx, dy) || 1;
      const step = (SPEED * delta) / 1000;
      let nx = me.container.x + (dx / len) * step;
      let ny = me.container.y + (dy / len) * step;
      nx = Phaser.Math.Clamp(nx, 40, TEMPLE.width - 40);
      ny = Phaser.Math.Clamp(ny, TEMPLE.height * 0.45, TEMPLE.height - 20);
      me.setLocalPosition(nx, ny);

      const dir: Direction =
        Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      me.setDirection(dir);

      // Moving means walking.
      if (store.localPlayer && store.localPlayer.currentActivity !== "WALKING") {
        void store.changeActivity("WALKING");
      }
      me.setMoving(true);
      store.move(Math.round(nx), Math.round(ny), dir);
    } else {
      // No input: stop the legs on the current facing's resting frame.
      me.setMoving(false);
    }
    void IDLE_ACTIVITIES_WHILE_STILL;
  }
}
