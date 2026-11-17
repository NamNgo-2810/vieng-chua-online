import * as Phaser from "phaser";
import { useGameStore } from "@/state/store";
import { TEMPLE } from "@/game/world";
import {
  backgroundUrl,
  activityAtlas,
  characterManifest,
  walkFrameRanges,
} from "@/config/asset-manifest";
import { ACTIVITIES, type ActivityId } from "@/config/activities";
import { APPEARANCE_IDS, APPEARANCES, resolveAppearance } from "@/config/appearances";
import type { Player, Direction } from "@/lib/types";
import { Character } from "./Character";
import { ensurePlaceholderTextures, lookTextureKey, walkAnimKey } from "./placeholder-sprites";
import { PLACEHOLDER_WALK_DIRS } from "./sprite-painter";
import { resolveMove, nearestSpot, walkMapFor, gateAt } from "./placement";
import { SPOTS_BY_ID, spotsIn, type RitualSpot } from "@/config/ritual-spots";
import { AREAS, areaOf, type AreaId } from "@/config/areas";
import { floatLantern } from "./garden-world";
import { AREA_WORLDS } from "./area-worlds";
import type { KoiPond } from "./areas/release-pond";
import { drawWishRibbons } from "./areas/quan-am-hill";
import { AREA_LIGHTS } from "@/config/lights";
import { phaseAt, lightingFor, vnHour, debugHour } from "@/lib/daytime";
import { holyDayAt } from "@/lib/lunar";
import { EMOTES, EMOTE_IDS, EMOTE_TIMING, type EmoteId } from "@/config/emotes";
import { buildPurificationStation, drawSandalPairs, buildBathingBuddha, pourOverBuddha } from "./purification";
import type { MonkeyTroop } from "./areas/hoa-qua-son";
import { landingCloud } from "./journey-decor";
import { CLOUD } from "@/config/journey";
import { isPurified, PURITY_TEXT } from "@/config/purity";
import { MILESTONES } from "@/config/milestones";
import { canPerform } from "@/config/permissions";
import { isActivityEnabled } from "@/config/activities";
import { preloadDecor, createDecor } from "./decor";
import { virtualInput, uiFocus } from "./input";
import { CHAT } from "@/config/chat";
import { bubbleVisible, type ChatMessage } from "@/lib/chat-core";
import { buildMilestoneDecor, DECOR_MILESTONES } from "./milestone-decor";
import { isUnlocked } from "@/lib/milestones-core";
import type { MilestoneId } from "@/config/milestones";

const SPEED = 160; // px/sec for local movement
const IDLE_ACTIVITIES_WHILE_STILL = false; // moving auto-switches to WALKING

/** Phaser scene key for an area's scene. */
export function sceneKeyFor(area: AreaId): string {
  return `area-${area}`;
}

/** Fade time when walking through a gate (ms). */
const GATE_FADE_MS = 250;

/**
 * One area of the temple (one scene instance per area: the painted courtyard
 * and the code-drawn lotus garden). Responsibilities are intentionally narrow:
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
  private interactKey!: Phaser.Input.Keyboard.Key;
  private lastSnapSeq = 0;
  /** In-world hint over the ritual spot in reach ("E · Dâng hương"). */
  private spotHint?: Phaser.GameObjects.Container;
  private spotHintText?: Phaser.GameObjects.Text;
  /** Chat messages already handled (bubbled or too old to bubble). */
  private seenChat = new Set<string>();
  /** Milestone decor already built in this scene. */
  private builtMilestones = new Set<MilestoneId>();
  /** Last merit award shown as floating text. */
  private lastMeritSeq = 0;
  /** True while key capture is off because the player is typing in chat. */
  private captureOff = false;
  /** `?debug=walk`: overlay the walk map and publish the local feet position. */
  private debugWalk = false;
  /** Which area this scene shows. */
  readonly area: AreaId;
  /** Set while fading out to another area (stops input and double switches). */
  private switching = false;
  /** Last activity seen per player (to notice a lantern being released). */
  private lastActivity = new Map<string, ActivityId>();
  /** What the area builder returned (the koi, in the release pond). */
  private areaWorld: unknown = null;
  /** Last greeting time seen per player. */
  private lastEmoteAt = new Map<string, number>();
  /** Wish ribbons on the tree (Quan Âm hill), and how many were drawn. */
  private wishRibbons?: Phaser.GameObjects.Graphics;
  private wishCount = -1;
  /** Day/night overlay and the lights that shine through it. */
  private nightOverlay?: Phaser.GameObjects.Rectangle;
  private nightLights: Phaser.GameObjects.Image[] = [];
  /** Sandal pairs on the Tam quan rack, and how many were drawn. */
  private sandalPairs: Phaser.GameObjects.Image[] = [];
  private sandalCount = -1;

  constructor(area: AreaId = "COURTYARD") {
    super(sceneKeyFor(area));
    this.area = area;
  }

  preload() {
    if (!this.textures.exists("bg")) this.load.image("bg", backgroundUrl());

    // Real art: one texture per look+activity the manifest actually has (no
    // fallback to WALKING here — a missing pose gets a code-drawn placeholder
    // in create()). Multi-frame strips load as spritesheets.
    for (const look of APPEARANCE_IDS) {
      const artRole = APPEARANCES[look].art;
      if (!artRole) continue;
      const activities = characterManifest(artRole).activities;
      for (const activity of Object.keys(ACTIVITIES) as ActivityId[]) {
        const atlas = activities[activity];
        if (!atlas) continue;
        const key = lookTextureKey(look, activity);
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

  /**
   * Phaser reuses this scene object every time the area is entered again, but
   * the previous visit's game objects were destroyed on shutdown. Forget them so
   * characters and milestone decor are rebuilt instead of touching dead objects.
   * (Seen chat ids are kept, so old messages do not bubble again.)
   */
  private resetForVisit() {
    this.gateMarkers = [];
    this.areaWorld = null;
    this.lastEmoteAt.clear();
    this.wishRibbons = undefined;
    this.wishCount = -1;
    this.nightOverlay = undefined;
    this.nightLights = [];
    this.sandalPairs = [];
    this.sandalCount = -1;
    this.characters.clear();
    this.lastActivity.clear();
    this.builtMilestones.clear();
    this.builtOnce = false;
    this.switching = false;
    this.captureOff = false;
    this.spotHint = undefined;
    this.spotHintText = undefined;
  }

  create() {
    this.resetForVisit();

    // Pixel-perfect: no smoothing on any texture.
    for (const key of this.textures.getTextureKeys()) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // World: the painted courtyard, or the code-drawn lotus garden.
    if (this.area === "COURTYARD") {
      const bg = this.add.image(0, 0, "bg").setOrigin(0, 0).setDepth(-1000);
      bg.setDisplaySize(TEMPLE.width, TEMPLE.height);
    } else {
      this.areaWorld = AREA_WORLDS[this.area](this);
    }
    this.cameras.main.setBounds(0, 0, TEMPLE.width, TEMPLE.height);
    this.cameras.main.fadeIn(GATE_FADE_MS);

    // Soft warm vignette for cozy lighting.
    this.addVignette();

    // Per-direction walk cycles. The sheet is NOT a single same-facing loop:
    // each direction (down/up/left/right) has its own 2-frame step packed into
    // the WALKING strip. We create one looping animation per direction so the
    // monk steps in place for the way he's facing instead of cycling through
    // all four facings (which looked like he kept turning left/right).
    // Looks without real art (or missing poses) get code-drawn placeholders.
    const realWalk = ensurePlaceholderTextures(this);
    for (const barefoot of [false, true])
    for (const look of APPEARANCE_IDS) {
      const key = lookTextureKey(look, "WALKING", barefoot);
      if (!this.textures.exists(key)) continue;
      const artRole = APPEARANCES[look].art;
      const walkDirs =
        realWalk.has(look) && artRole ? characterManifest(artRole).walkDirs : PLACEHOLDER_WALK_DIRS;
      if (realWalk.has(look) && (activityAtlas(artRole!, "WALKING")?.frames ?? 1) <= 1) continue;
      const ranges = walkFrameRanges(walkDirs);
      for (const dir of ["down", "up", "left", "right"] as Direction[]) {
        const r = ranges[dir];
        if (!r) continue;
        const animKey = walkAnimKey(look, dir, barefoot);
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
    if (this.area === "COURTYARD") {
      createDecor(this);
      buildBathingBuddha(this);
    }
    if (this.area === "TAM_QUAN") buildPurificationStation(this);

    // Input.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactKey.on("down", () => this.interact());
    // Capture the movement keys so arrow keys don't scroll the page.
    this.input.keyboard!.addCapture("UP,DOWN,LEFT,RIGHT,W,A,S,D,E");

    this.createSpotHint();
    this.createGateMarkers();
    this.createLighting();
    // Greetings: keys 1–3 (EMOTES config).
    for (const id of EMOTE_IDS) {
      const code = Phaser.Input.Keyboard.KeyCodes[(["ONE", "TWO", "THREE"] as const)[EMOTE_IDS.indexOf(id)]];
      this.input.keyboard!.addKey(code).on("down", () => {
        if (!uiFocus.typing) void useGameStore.getState().greet(id);
      });
    }
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "walk") {
      this.debugWalk = true;
      this.drawWalkDebug();
    }

    // Subscribe to the store and sync characters.
    const store = useGameStore.getState();
    this.localId = store.localSessionId;
    // The game boots into the courtyard, but visitors arrive at the Tam quan:
    // hand over at once when the player is already elsewhere.
    if (this.followLocalArea(store.localPlayer)) return;
    // A new scene starts from the current snap/award, never replays old ones.
    this.lastSnapSeq = store.localSnap?.seq ?? 0;
    this.lastMeritSeq = store.meritPulse?.seq ?? 0;
    this.syncCharacters(store.players);
    // Arrived by cân đẩu vân: the cloud sets the rider down, then flies off.
    if (store.flight && Date.now() - store.flight.at < CLOUD.landingMs * 2 && store.localPlayer) {
      landingCloud(this, store.localPlayer.positionX, store.localPlayer.positionY);
    }
    this.syncChat(store.chat);
    this.syncMilestones(store.templeMerit, false);
    this.unsub = useGameStore.subscribe((s) => {
      this.localId = s.localSessionId;
      if (this.followLocalArea(s.localPlayer)) return;
      this.syncCharacters(s.players);
      const everyone = { ...s.players, ...(s.localPlayer && s.localSessionId ? { [s.localSessionId]: s.localPlayer } : {}) };
      this.syncGroupRings(everyone);
      this.syncSandals(everyone);
      this.applySnap(s.localSnap);
      this.syncChat(s.chat);
      this.showMerit(s.meritPulse);
      this.syncMilestones(s.templeMerit, s.templeLoaded);
      this.updateGateMarkers(s.templeMerit);
      this.syncWishes(s.notes.wish.length);
    });
    this.syncWishes(store.notes.wish.length);
    this.updateGateMarkers(store.templeMerit);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
  }

  /**
   * When the local player has moved to another area, fade out and hand over to
   * that area's scene. Returns true while switching.
   */
  private followLocalArea(local: Player | null): boolean {
    if (this.switching) return true;
    if (!local || areaOf(local) === this.area) return false;
    this.switching = true;
    const target = sceneKeyFor(areaOf(local));
    this.cameras.main.fadeOut(GATE_FADE_MS);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(target));
    return true;
  }

  /**
   * Reconcile the Character map with the store's players in this area. The
   * local player is drawn from the store's localPlayer (updated immediately),
   * since the shared player map can lag one network round trip behind.
   */
  private syncCharacters(remotePlayers: Record<string, Player>) {
    const local = useGameStore.getState().localPlayer;
    const players: Record<string, Player> = { ...remotePlayers };
    if (local && this.localId) players[this.localId] = { ...players[this.localId], ...local };
    const here = (p: Player | undefined) => !!p && p.isOnline && areaOf(p) === this.area;
    for (const [id, c] of this.characters) {
      if (!here(players[id])) {
        c.destroy();
        this.characters.delete(id);
        this.lastActivity.delete(id);
      }
    }
    for (const [id, p] of Object.entries(players)) {
      if (!here(p)) continue;
      // Rituals that change the world when someone starts them here.
      const was = this.lastActivity.get(id);
      const started = was !== undefined && was !== p.currentActivity;
      if (started && this.area === "LOTUS_GARDEN" && p.currentActivity === "RELEASE_LANTERN") floatLantern(this, p.positionX);
      const koi = this.area === "RELEASE_POND" ? (this.areaWorld as KoiPond | null) : null;
      if (started && koi && p.currentActivity === "FEED_FISH") koi.gather(p.positionX, p.positionY);
      if (started && koi && p.currentActivity === "RELEASE_FISH") koi.release(p.positionX, p.positionY);
      if (started && this.area === "COURTYARD" && p.currentActivity === "BATHE_BUDDHA") pourOverBuddha(this);
      const monkeys = this.area === "HOA_QUA_SON" ? (this.areaWorld as MonkeyTroop | null) : null;
      if (started && monkeys && p.currentActivity === "FEED_MONKEYS") monkeys.gather(p.positionX, p.positionY);
      this.lastActivity.set(id, p.currentActivity);
      let c = this.characters.get(id);
      if (!c) {
        c = new Character({
          scene: this,
          sessionId: id,
          role: p.role,
          appearance: resolveAppearance(p.role, p.appearance),
          barefoot: p.shoesOff === true,
          displayName: p.displayName,
          activity: p.currentActivity,
          x: p.positionX,
          y: p.positionY,
          isLocal: id === this.localId,
        });
        this.characters.set(id, c);
      }
      this.syncEmote(id, c, p);
      c.update({
        displayName: p.displayName,
        role: p.role,
        appearance: resolveAppearance(p.role, p.appearance),
        barefoot: p.shoesOff === true,
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

    // Smooth remote characters; keep speech bubbles over every head.
    for (const [id, c] of this.characters) {
      if (id !== localId) c.interpolate();
      c.syncBubble();
    }

    if (!localId || this.switching) return;
    const me = this.characters.get(localId);
    if (!me) return;

    // Typing in chat: let keys reach the text box and stand still.
    if (uiFocus.typing) {
      if (!this.captureOff) {
        this.input.keyboard!.disableGlobalCapture();
        this.input.keyboard!.resetKeys();
        this.captureOff = true;
      }
      me.setMoving(false);
      return;
    }
    if (this.captureOff) {
      this.input.keyboard!.enableGlobalCapture();
      this.input.keyboard!.resetKeys();
      this.captureOff = false;
    }

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
      // Walk map: slide along tables, pillars and the pond instead of
      // passing through them (config/temple-map.ts).
      const next = resolveMove(
        me.container.x,
        me.container.y,
        me.container.x + (dx / len) * step,
        me.container.y + (dy / len) * step,
        walkMapFor(this.area)
      );
      const nx = next.x;
      const ny = next.y;
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

      // Walking into an open gate takes you to the next area.
      const gate = gateAt(this.area, nx, ny);
      if (gate) void store.enterArea(gate.to);
    } else {
      // No input: stop the legs on the current facing's resting frame.
      me.setMoving(false);
    }
    void IDLE_ACTIVITIES_WHILE_STILL;

    // Debug readout for tuning the map and for scripted walk-throughs.
    if (this.debugWalk) {
      document.body.dataset.playerPos = `${Math.round(me.container.x)},${Math.round(me.container.y)}`;
    }

    // Which ritual spot is in reach (drives the dock buttons and the hint).
    const spot = nearestSpot(me.container.x, me.container.y, spotsIn(this.area));
    store.setNearbySpot(spot?.id ?? null);
    this.updateSpotHint(spot, store.localPlayer?.role ?? null);
  }

  /** Rituals the local player may start at `spot` (role + enabled filter). */
  private spotActivities(spot: RitualSpot, role: Player["role"]): ActivityId[] {
    return spot.activities.filter((a) => canPerform(role, a) && isActivityEnabled(a));
  }

  /**
   * E key: start the spot's first ritual; pressing again cycles through the
   * spot's rituals (e.g. meditation → chanting → listening on a cushion).
   */
  private interact() {
    if (uiFocus.typing) return;
    const store = useGameStore.getState();
    const me = store.localPlayer;
    const id = store.nearbySpotId;
    if (!me || !id) return;
    const options = this.spotActivities(SPOTS_BY_ID[id], me.role);
    if (options.length === 0) return;
    const i = options.indexOf(me.currentActivity);
    void store.changeActivity(options[(i + 1) % options.length]);
  }

  /**
   * Bubble new chat messages over their speakers. History that arrives with
   * the first sync only bubbles while still fresh; later messages always do.
   */
  private syncChat(messages: ChatMessage[]) {
    const now = Date.now();
    for (const m of messages) {
      if (this.seenChat.has(m.id)) continue;
      this.seenChat.add(m.id);
      const c = this.characters.get(m.sessionId);
      if (!c) continue;
      if (!bubbleVisible(m, now)) continue; // old history, not live
      // Server clocks can run slightly ahead; never show for less than 1.5s.
      const age = Math.max(0, now - m.createdAt);
      c.showBubble(m.text, Math.max(1500, CHAT.bubbleMs - age));
    }
  }

  /**
   * Build decor for every unlocked milestone not built yet. Unlocks seen live
   * (after the temple total first loaded) fade in; ones open on arrival don't.
   */
  private syncMilestones(total: number, celebrate: boolean) {
    if (this.area !== "COURTYARD") return; // milestone decor lives in the courtyard
    // On rằm and mùng một the temple is dressed for the day: flags and lanterns
    // go up even before the temple has earned them.
    const festive = holyDayAt(Date.now()) !== null;
    for (const id of DECOR_MILESTONES) {
      const forHoliday = festive && (id === "PRAYER_FLAGS" || id === "LANTERN_STRING");
      if (this.builtMilestones.has(id) || (!isUnlocked(id, total) && !forHoliday)) continue;
      this.builtMilestones.add(id);
      buildMilestoneDecor(this, id, celebrate && this.builtOnce);
    }
    this.builtOnce = true;
  }
  /** Becomes true after the first milestone sync, so later unlocks celebrate. */
  private builtOnce = false;

  /** Float "+N công đức" up from the local character when merit is awarded. */
  private showMerit(pulse: { amount: number; bonus: number; extras?: { streak: number; holiday: number; group: number }; seq: number } | null) {
    if (!pulse || pulse.seq === this.lastMeritSeq || !this.localId) return;
    this.lastMeritSeq = pulse.seq;
    const me = this.characters.get(this.localId);
    if (!me) return;
    const x = pulse.extras;
    const parts = [
      x?.streak ? `chuỗi +${x.streak}` : "",
      x?.holiday ? `ngày lễ +${x.holiday}` : "",
      x?.group ? `đồng tu +${x.group}` : "",
    ].filter(Boolean);
    const label = `+${pulse.amount} công đức${parts.length ? ` (${parts.join(", ")})` : ""}`;
    const t = this.add
      .text(me.container.x, me.container.y - 90, label, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffe9a8",
        stroke: "#3b2414",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(4600);
    this.tweens.add({
      targets: t,
      y: t.y - 36,
      alpha: 0,
      duration: 1800,
      ease: "Sine.out",
      onComplete: () => t.destroy(),
    });
  }

  /** Show a player's greeting once, when its time changes (not stale ones on arrival). */
  private syncEmote(id: string, c: Character, p: Player) {
    if (!p.emote || !p.emoteAt) return;
    const seen = this.lastEmoteAt.get(id);
    this.lastEmoteAt.set(id, p.emoteAt);
    if (seen === p.emoteAt) return;
    if (seen === undefined && Date.now() - p.emoteAt > EMOTE_TIMING.showMs) return;
    const kind = p.emote === "VAI" ? "bow" : p.emote === "VAY_TAY" ? "wave" : "hands";
    c.showEmote(EMOTES[p.emote as EmoteId].icon, kind, EMOTE_TIMING.showMs);
  }

  /** Đồng tu: a ring under everyone here who shares a ritual with someone else. */
  private syncGroupRings(players: Record<string, Player>) {
    const counts = new Map<ActivityId, number>();
    for (const p of Object.values(players)) {
      if (p.isOnline && areaOf(p) === this.area && p.currentActivity !== "WALKING") counts.set(p.currentActivity, (counts.get(p.currentActivity) ?? 0) + 1);
    }
    for (const [id, c] of this.characters) {
      const p = players[id];
      c.setGroupGlow(!!p && p.currentActivity !== "WALKING" && (counts.get(p.currentActivity) ?? 0) >= 2);
    }
  }

  /** Sandals on the rack: one pair for every visitor walking barefoot. */
  private syncSandals(players: Record<string, Player>) {
    if (this.area !== "TAM_QUAN") return;
    const n = Object.values(players).filter((p) => p.isOnline && p.shoesOff).length;
    if (n === this.sandalCount) return;
    this.sandalCount = n;
    this.sandalPairs = drawSandalPairs(this, n, this.sandalPairs);
  }

  /** Redraw the wish tree's ribbons when the number of wishes changes. */
  private syncWishes(count: number) {
    if (this.area !== "QUAN_AM_HILL" || count === this.wishCount) return;
    this.wishCount = count;
    this.wishRibbons = drawWishRibbons(this, count, this.wishRibbons);
  }

  /** Day/night overlay plus lamp glows above it; refreshed every 30 seconds. */
  private createLighting() {
    const forced = typeof window !== "undefined" ? debugHour(window.location.search) : null;
    this.nightOverlay = this.add.rectangle(0, 0, TEMPLE.width, TEMPLE.height, 0x000000, 0).setOrigin(0, 0).setDepth(4800);
    this.nightLights = AREA_LIGHTS[this.area].map(([x, y, scale]) =>
      this.add.image(x, y, "lantern-glow").setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setDepth(4850).setVisible(false)
    );
    for (const l of this.nightLights) this.tweens.add({ targets: l, alpha: 0.6, duration: 1500 + Math.random() * 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    const apply = () => {
      const light = lightingFor(this.area, phaseAt(forced ?? vnHour(Date.now())));
      this.nightOverlay?.setFillStyle(light.color, light.alpha);
      for (const l of this.nightLights) l.setVisible(light.lightsOn && this.textures.exists("lantern-glow"));
    };
    apply();
    this.time.addEvent({ delay: 30_000, loop: true, callback: apply });
  }

  /** Move the local character when the store places it at a ritual spot. */
  private applySnap(snap: { x: number; y: number; dir: Direction; seq: number } | null) {
    if (!snap || snap.seq === this.lastSnapSeq || !this.localId) return;
    const me = this.characters.get(this.localId);
    if (!me) return;
    this.lastSnapSeq = snap.seq;
    me.setLocalPosition(snap.x, snap.y);
    me.setDirection(snap.dir);
  }

  private createSpotHint() {
    this.spotHintText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#2b2119",
        backgroundColor: "#f3e4b0ee",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1);
    const ring = this.add.ellipse(0, 0, 70, 24).setStrokeStyle(2, 0xf3e4b0, 0.8);
    this.spotHint = this.add.container(0, 0, [ring, this.spotHintText]).setDepth(4000).setVisible(false);
    this.tweens.add({ targets: ring, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  /** One marker per gate of this area: its destination's name, or a lock and the merit it needs. */
  private gateMarkers: { text: Phaser.GameObjects.Text; ring: Phaser.GameObjects.Ellipse; to: AreaId }[] = [];

  private createGateMarkers() {
    for (const gate of AREAS[this.area].gates) {
      const t = gate.trigger;
      const cx = t.x + t.w / 2;
      // Bottom doors would sit under the player dock: lift their label.
      const labelY = Math.min(t.y - 6, 640);
      const ring = this.add
        .ellipse(cx, Math.min(t.y + t.h / 2, 700), Math.max(40, t.w + 16), 18)
        .setStrokeStyle(2, 0xf3e4b0, 0.7)
        .setDepth(-200);
      this.tweens.add({ targets: ring, alpha: 0.3, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      const text = this.add
        .text(cx, labelY, "", { fontFamily: "monospace", fontSize: "11px", color: "#2b2119", backgroundColor: "#f3e4b0dd", padding: { x: 4, y: 1 } })
        .setOrigin(0.5, 1)
        .setDepth(3900);
      this.gateMarkers.push({ text, ring, to: gate.to });
    }
  }

  /** Refresh gate labels when the temple's merit changes (locks open live). */
  private updateGateMarkers(temple: number) {
    const me = useGameStore.getState().localPlayer;
    for (const m of this.gateMarkers) {
      const def = AREAS[m.to];
      const need = def.unlock ? MILESTONES.find((x) => x.id === def.unlock)?.threshold ?? 0 : 0;
      const unlocked = temple >= need;
      const pure = !def.requiresPurity || (me ? isPurified(me) : false);
      const open = unlocked && pure;
      const arrow = m.to === "COURTYARD" || (this.area !== "COURTYARD" && m.to === "LOTUS_GARDEN") ? "↩ " : "";
      const label = !unlocked
        ? `🔒 ${def.label} · ${need} công đức chùa`
        : !pure
          ? `${def.label} · ${PURITY_TEXT.gateLabel}`
          : `${arrow}${def.label}`;
      if (m.text.text !== label) m.text.setText(label);
      m.text.setAlpha(open ? 1 : 0.75);
      m.ring.setVisible(open);
    }
  }

  /** Show "E · <ritual>" over the spot in reach; hide when none or none allowed. */
  private updateSpotHint(spot: RitualSpot | null, role: Player["role"] | null) {
    if (!this.spotHint || !this.spotHintText) return;
    const options = spot && role ? this.spotActivities(spot, role) : [];
    if (!spot || options.length === 0) {
      this.spotHint.setVisible(false);
      return;
    }
    const text = `E · ${options.map((a) => ACTIVITIES[a].label).join(" / ")}`;
    if (this.spotHintText.text !== text) this.spotHintText.setText(text);
    this.spotHint.setPosition(spot.x, spot.y);
    this.spotHintText.setY(-70);
    this.spotHint.setVisible(true);
  }

  /** `?debug=walk`: draw walkable areas (green), blockers (red) and spots (gold). */
  private drawWalkDebug() {
    const g = this.add.graphics().setDepth(6000);
    // G hides/shows the overlay, for clean screenshots while debugging.
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G).on("down", () => g.setVisible(!g.visible));
    const map = walkMapFor(this.area);
    g.fillStyle(0x30d050, 0.18);
    for (const r of map.walkable) g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle(0xe03030, 0.35);
    for (const r of map.blockers) g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle(0x3080ff, 0.35);
    for (const gt of AREAS[this.area].gates) g.fillRect(gt.trigger.x, gt.trigger.y, gt.trigger.w, gt.trigger.h);
    g.lineStyle(2, 0xffd060, 0.9);
    for (const s of spotsIn(this.area)) {
      g.strokeCircle(s.x, s.y, s.radius);
      g.fillStyle(0xffd060, 1);
      g.fillCircle(s.standX, s.standY, 4);
    }
  }
}
