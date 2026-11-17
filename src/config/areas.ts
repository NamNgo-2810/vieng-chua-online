/**
 * Areas of the temple. The courtyard is the painted temple; every other area
 * is code-drawn (game/area-worlds.ts) and opens at its milestone. Each area has
 * its own walk map, ritual spots (ritual-spots.ts) and gates.
 *
 *   Courtyard ─┬─ terrace doors ─── Chánh điện (main hall) ── side door ── Tàng kinh các (sutra library)
 *              ├─ moon gate, right ─ Vườn sen (lotus garden) ── bamboo gate ── Rừng trúc (bamboo grove)
 *              ├─ steps, left ────── Tháp chuông (bell tower) ── hill path ── Đồi Quan Âm (Quan Âm hill)
 *              ├─ side stairs ────── Nhà Tổ (ancestors' hall)
 *              └─ bottom path ────── Tam quan (front gate, always open) ── Hồ phóng sinh (release pond)
 * Unlock levels are in config/milestones.ts.
 *
 * World px, feet coordinates; every area uses the same 1376x768 world.
 * Layout objects below are shared by the walk maps and the drawings, so the
 * picture always matches what blocks you.
 * Design: design/game-brief.md — Build order 5 (areas unlocked by merit).
 */

import type { Rect } from "./temple-map";
import { WALKABLE, BLOCKERS } from "./temple-map";
import type { MilestoneId } from "./milestones";
import type { Direction } from "@/lib/types";

export const AREA_IDS = [
  "COURTYARD", "MAIN_HALL", "LOTUS_GARDEN", "BELL_TOWER", "ANCESTOR_HALL", "BAMBOO_GROVE",
  "TAM_QUAN", "RELEASE_POND", "SUTRA_LIBRARY", "QUAN_AM_HILL", "HOA_QUA_SON",
] as const;
export type AreaId = (typeof AREA_IDS)[number];

/** A doorway: walking into `trigger` takes you to `to`, placed at `arrive`. */
export interface Gate {
  trigger: Rect;
  to: AreaId;
  arrive: { x: number; y: number; facing: Direction };
}

export interface AreaDef {
  id: AreaId;
  label: string;
  /** Milestone that must be unlocked to enter (none = always open). */
  unlock?: MilestoneId;
  /** Indoors: sandals left and hands/feet washed first (config/purity.ts). */
  requiresPurity?: boolean;
  walkable: Rect[];
  blockers: Rect[];
  gates: Gate[];
}

const r = (x: number, y: number, w: number, h: number, label: string): Rect => ({ x, y, w, h, label });

/** Lotus garden layout (drawn from these numbers in game/garden-world.ts). */
export const GARDEN = {
  pond: { x: 510, y: 340, w: 500, h: 270 },
  bridge: { y: 448, h: 44 },
  bodhi: { trunkX: 300, trunkY: 330 },
  pavilion: { x: 1080, y: 360, w: 210, h: 140 },
  moonGate: { x: 40, y: 330, w: 70, h: 150 },
} as const;

/** Main hall interior layout (game/areas/main-hall.ts). */
export const MAIN_HALL = {
  altar: { x: 400, y: 150, w: 576, h: 150 },
  pillars: [[240, 380], [1136, 380], [240, 640], [1136, 640]] as [number, number][],
  bell: { x: 330, y: 330 },
  woodfish: { x: 1046, y: 330 },
  cushions: { x: 470, y: 430, w: 436, h: 160 },
  door: { x: 630, w: 116 },
} as const;

/** Bell tower layout (game/areas/bell-tower.ts). */
export const BELL_TOWER = {
  platform: { x: 380, y: 200, w: 616, h: 440 },
  bell: { x: 688, top: 300, bottom: 440, w: 150 },
  pillars: [[400, 230], [976, 230], [400, 620], [976, 620]] as [number, number][],
  shrine: { x: 900, y: 460 },
  pines: [[170, 260], [220, 600], [1200, 280], [1160, 620], [120, 430], [1260, 450]] as [number, number][],
} as const;

/** Ancestors' hall layout (game/areas/ancestor-hall.ts). */
export const ANCESTOR_HALL = {
  altar: { x: 488, y: 170, w: 400, h: 130 },
  teaTable: { x: 300, y: 470, w: 120, h: 50 },
  benches: { x: 940, y: 470, w: 140, h: 40 },
  pillars: [[200, 360], [1176, 360], [200, 640], [1176, 640]] as [number, number][],
} as const;

/** Bamboo grove layout (game/areas/bamboo-grove.ts). */
export const BAMBOO_GROVE = {
  stream: { x: 400, y: 600, w: 900, h: 50 },
  bridge: { x: 560, w: 80 },
  seat: { x: 300, y: 300 },
  clumps: [[220, 200], [520, 240], [880, 220], [1120, 320], [200, 520], [1180, 520], [460, 460], [980, 420]] as [number, number][],
} as const;

/** Tam quan (front gate) layout (game/areas/tam-quan.ts). */
export const TAM_QUAN = {
  /** Just inside the gate: the sandal rack (left) and the wash basin (right). */
  shoeRack: { x: 560, y: 270 },
  washBasin: { x: 816, y: 270 },
  gate: { x: 440, y: 60, w: 496, h: 150 },
  doors: { x: 630, w: 116 },
  pondLeft: { x: 120, y: 330, w: 300, h: 230 },
  pondRight: { x: 956, y: 330, w: 300, h: 230 },
  guestbook: { x: 470, y: 640 },
  donation: { x: 906, y: 640 },
  trees: [[110, 250], [1266, 250], [100, 680], [1276, 690]] as [number, number][],
} as const;

/** Hồ phóng sinh (release pond) layout (game/areas/release-pond.ts). */
export const RELEASE_POND = {
  pond: { x: 300, y: 240, w: 800, h: 320 },
  pier: { x: 640, w: 96, top: 480 },
  willows: [[180, 260], [1220, 260], [160, 560], [1240, 560]] as [number, number][],
} as const;

/** Tàng kinh các (sutra library) layout (game/areas/sutra-library.ts). */
export const SUTRA_LIBRARY = {
  backShelves: { x: 80, y: 150, w: 1216, h: 160 },
  islands: [{ x: 250, y: 420, w: 260, h: 50 }, { x: 866, y: 420, w: 260, h: 50 }],
  desk: { x: 610, y: 520, w: 156, h: 40 },
  lampCorner: { x: 300, y: 620 },
  /** Như Ý Kim Cô Bổng on its stand (config/journey.ts). */
  staffStand: { x: 688, y: 400 },
} as const;

/** Đồi Quan Âm (Quan Âm hill) layout (game/areas/quan-am-hill.ts). */
export const QUAN_AM_HILL = {
  statue: { x: 688, y: 290, w: 140, h: 110 },
  wishTree: { x: 380, y: 400 },
  bench: { x: 1050, y: 480 },
  frangipani: [[200, 330], [1180, 330], [1240, 620]] as [number, number][],
} as const;

/** Hoa Quả Sơn layout (game/areas/hoa-qua-son.ts): the Thủy Liêm waterfall and its pool at the top, the immortal peach tree, the monkeys' rock. */
export const HOA_QUA_SON = {
  pool: { x: 540, y: 300, w: 296, h: 80 },
  peachTree: { x: 330, y: 470 },
  monkeyRock: { x: 1030, y: 470 },
  rocks: [[200, 660], [1190, 660], [1230, 340], [150, 360]] as [number, number][],
} as const;

/** Where visitors arrive: the path at the bottom of the Tam quan. */
export const ENTRY = {
  area: "TAM_QUAN" as AreaId,
  spawn: { x: 600, y: 630, w: 176, h: 70, label: "arrival on the approach path" },
};

/** The infant Buddha bathing basin, in the courtyard before the main hall (left of the drums). */
export const BATHING_BUDDHA = { x: 372, y: 540 } as const;

/** Blockers for a list of [x, y] posts of a given size (pillars, trees). */
const posts = (list: readonly (readonly [number, number])[], size: number, label: string): Rect[] =>
  list.map(([x, y]) => r(x - size / 2, y - size / 2, size, size, label));

/** The usual "back to the courtyard" door at the bottom centre of an interior. */
const bottomDoorBack = (arrive: Gate["arrive"]): Gate => ({
  trigger: r(630, 722, 116, 24, "door back"),
  to: "COURTYARD",
  arrive,
});

export const AREAS: Record<AreaId, AreaDef> = {
  COURTYARD: {
    id: "COURTYARD",
    label: "Sân chùa",
    walkable: WALKABLE,
    blockers: [...BLOCKERS, r(BATHING_BUDDHA.x - 34, BATHING_BUDDHA.y - 18, 68, 30, "Tắm Phật basin")],
    gates: [
      {
        // Moon gate in the right garden wall (drawn when the garden unlocks).
        trigger: r(1300, 300, 30, 80, "moon gate to the lotus garden"),
        to: "LOTUS_GARDEN",
        arrive: { x: 150, y: 430, facing: "right" },
      },
      {
        // The hall's centre doors, at the back of the terrace.
        trigger: r(640, 345, 96, 8, "main hall doors"),
        to: "MAIN_HALL",
        arrive: { x: 688, y: 690, facing: "up" },
      },
      {
        // The stone steps at the top of the left garden.
        trigger: r(150, 275, 100, 10, "steps up to the bell tower"),
        to: "BELL_TOWER",
        arrive: { x: 688, y: 690, facing: "up" },
      },
      {
        // The side stairs on the left of the courtyard.
        trigger: r(100, 505, 25, 70, "side stairs to the ancestors' hall"),
        to: "ANCESTOR_HALL",
        arrive: { x: 688, y: 690, facing: "up" },
      },
      {
        // The open path at the bottom of the courtyard, out to the front gate.
        trigger: r(480, 740, 110, 15, "path down to the front gate"),
        to: "TAM_QUAN",
        arrive: { x: 688, y: 260, facing: "down" },
      },
    ],
  },
  MAIN_HALL: {
    id: "MAIN_HALL",
    label: "Chánh điện",
    unlock: "MAIN_HALL",
    requiresPurity: true,
    walkable: [r(60, 300, 1256, 445, "hall floor")],
    blockers: [
      r(MAIN_HALL.altar.x, MAIN_HALL.altar.y, MAIN_HALL.altar.w, MAIN_HALL.altar.h + 10, "Buddha altar"),
      ...posts(MAIN_HALL.pillars, 28, "pillar"),
      r(MAIN_HALL.bell.x - 30, MAIN_HALL.bell.y - 30, 60, 30, "bell frame"),
      r(MAIN_HALL.woodfish.x - 26, MAIN_HALL.woodfish.y - 30, 52, 30, "great wooden fish"),
    ],
    gates: [
      bottomDoorBack({ x: 688, y: 385, facing: "down" }),
      {
        // A side door in the right wall, to the sutra library.
        trigger: r(1296, 600, 20, 90, "side door to the sutra library"),
        to: "SUTRA_LIBRARY",
        arrive: { x: 150, y: 645, facing: "right" },
      },
    ],
  },
  LOTUS_GARDEN: {
    id: "LOTUS_GARDEN",
    label: "Vườn sen",
    unlock: "LOTUS_GARDEN",
    walkable: [r(60, 170, 1270, 570, "garden lawn")],
    blockers: [
      r(GARDEN.pond.x, GARDEN.pond.y, GARDEN.pond.w, GARDEN.bridge.y - GARDEN.pond.y, "pond (north of the bridge)"),
      r(GARDEN.pond.x, GARDEN.bridge.y + GARDEN.bridge.h, GARDEN.pond.w, GARDEN.pond.y + GARDEN.pond.h - (GARDEN.bridge.y + GARDEN.bridge.h), "pond (south of the bridge)"),
      r(GARDEN.bodhi.trunkX - 22, GARDEN.bodhi.trunkY - 30, 44, 34, "bodhi tree trunk"),
      r(GARDEN.pavilion.x, GARDEN.pavilion.y - 10, 16, 16, "pavilion pillar"),
      r(GARDEN.pavilion.x + GARDEN.pavilion.w - 16, GARDEN.pavilion.y - 10, 16, 16, "pavilion pillar"),
      r(GARDEN.pavilion.x, GARDEN.pavilion.y + GARDEN.pavilion.h - 6, 16, 16, "pavilion pillar"),
      r(GARDEN.pavilion.x + GARDEN.pavilion.w - 16, GARDEN.pavilion.y + GARDEN.pavilion.h - 6, 16, 16, "pavilion pillar"),
      r(200, 600, 30, 34, "stone lantern"),
      r(1180, 610, 30, 34, "stone lantern"),
    ],
    gates: [
      {
        trigger: r(40, 380, 50, 100, "moon gate back to the courtyard"),
        to: "COURTYARD",
        arrive: { x: 1250, y: 345, facing: "left" },
      },
      {
        // A bamboo gate in the garden's right wall, below the pavilion.
        trigger: r(1300, 540, 30, 80, "bamboo gate to the grove"),
        to: "BAMBOO_GROVE",
        arrive: { x: 140, y: 430, facing: "right" },
      },
    ],
  },
  BELL_TOWER: {
    id: "BELL_TOWER",
    label: "Tháp chuông",
    unlock: "BELL_TOWER",
    walkable: [r(60, 160, 1256, 585, "tower grounds")],
    blockers: [
      r(BELL_TOWER.bell.x - BELL_TOWER.bell.w / 2 + 5, BELL_TOWER.bell.top + 30, BELL_TOWER.bell.w - 10, BELL_TOWER.bell.bottom - BELL_TOWER.bell.top - 30, "great bell"),
      ...posts(BELL_TOWER.pillars, 32, "tower pillar"),
      r(BELL_TOWER.shrine.x - 30, BELL_TOWER.shrine.y - 40, 60, 40, "incense shrine"),
      ...posts(BELL_TOWER.pines, 30, "pine trunk"),
    ],
    gates: [
      bottomDoorBack({ x: 200, y: 300, facing: "down" }),
      {
        // The hill path behind the pines, up to Quan Âm hill.
        trigger: r(100, 160, 100, 12, "hill path up to Quan Âm"),
        to: "QUAN_AM_HILL",
        arrive: { x: 200, y: 690, facing: "up" },
      },
    ],
  },
  ANCESTOR_HALL: {
    id: "ANCESTOR_HALL",
    label: "Nhà Tổ",
    unlock: "ANCESTOR_HALL",
    requiresPurity: true,
    walkable: [r(80, 310, 1216, 435, "hall floor")],
    blockers: [
      r(ANCESTOR_HALL.altar.x, ANCESTOR_HALL.altar.y, ANCESTOR_HALL.altar.w, ANCESTOR_HALL.altar.h + 10, "ancestors' altar"),
      r(ANCESTOR_HALL.teaTable.x, ANCESTOR_HALL.teaTable.y, ANCESTOR_HALL.teaTable.w, ANCESTOR_HALL.teaTable.h, "tea table"),
      r(ANCESTOR_HALL.benches.x, ANCESTOR_HALL.benches.y, ANCESTOR_HALL.benches.w, ANCESTOR_HALL.benches.h, "low bench"),
      ...posts(ANCESTOR_HALL.pillars, 26, "pillar"),
    ],
    gates: [bottomDoorBack({ x: 160, y: 540, facing: "right" })],
  },
  BAMBOO_GROVE: {
    id: "BAMBOO_GROVE",
    label: "Rừng trúc",
    unlock: "BAMBOO_GROVE",
    walkable: [r(70, 180, 1240, 560, "grove clearing")],
    blockers: [
      r(BAMBOO_GROVE.stream.x, BAMBOO_GROVE.stream.y, BAMBOO_GROVE.bridge.x - BAMBOO_GROVE.stream.x, BAMBOO_GROVE.stream.h, "stream"),
      r(BAMBOO_GROVE.bridge.x + BAMBOO_GROVE.bridge.w, BAMBOO_GROVE.stream.y, BAMBOO_GROVE.stream.x + BAMBOO_GROVE.stream.w - (BAMBOO_GROVE.bridge.x + BAMBOO_GROVE.bridge.w), BAMBOO_GROVE.stream.h, "stream"),
      ...posts(BAMBOO_GROVE.clumps, 44, "bamboo clump"),
      r(BAMBOO_GROVE.seat.x - 30, BAMBOO_GROVE.seat.y - 20, 60, 20, "stone seat"),
    ],
    gates: [
      {
        trigger: r(50, 380, 40, 100, "bamboo gate back to the lotus garden"),
        to: "LOTUS_GARDEN",
        arrive: { x: 1250, y: 580, facing: "left" },
      },
    ],
  },
  TAM_QUAN: {
    id: "TAM_QUAN",
    label: "Tam quan",
    walkable: [r(60, 200, 1256, 545, "approach")],
    blockers: [
      r(TAM_QUAN.gate.x, TAM_QUAN.gate.y + 90, TAM_QUAN.doors.x - TAM_QUAN.gate.x - 4, 60, "gate (left)"),
      r(TAM_QUAN.doors.x + TAM_QUAN.doors.w + 4, TAM_QUAN.gate.y + 90, TAM_QUAN.gate.x + TAM_QUAN.gate.w - (TAM_QUAN.doors.x + TAM_QUAN.doors.w + 4), 60, "gate (right)"),
      r(TAM_QUAN.pondLeft.x, TAM_QUAN.pondLeft.y, TAM_QUAN.pondLeft.w, TAM_QUAN.pondLeft.h, "lotus pond (left)"),
      r(TAM_QUAN.pondRight.x, TAM_QUAN.pondRight.y, TAM_QUAN.pondRight.w, TAM_QUAN.pondRight.h, "lotus pond (right)"),
      r(TAM_QUAN.guestbook.x - 24, TAM_QUAN.guestbook.y - 30, 48, 30, "guestbook stand"),
      r(TAM_QUAN.shoeRack.x - 40, TAM_QUAN.shoeRack.y - 20, 80, 30, "sandal rack"),
      r(TAM_QUAN.washBasin.x - 40, TAM_QUAN.washBasin.y - 20, 80, 30, "wash basin"),
      r(TAM_QUAN.donation.x - 22, TAM_QUAN.donation.y - 30, 44, 30, "donation box"),
      ...posts(TAM_QUAN.trees, 36, "banyan trunk"),
    ],
    gates: [
      {
        // Through the centre doors of the gate, back into the temple.
        trigger: r(TAM_QUAN.doors.x, 190, TAM_QUAN.doors.w, 20, "gate doors back to the courtyard"),
        to: "COURTYARD",
        arrive: { x: 535, y: 690, facing: "up" },
      },
      {
        // The path along the right, to the release pond.
        trigger: r(1300, 600, 30, 100, "path to the release pond"),
        to: "RELEASE_POND",
        arrive: { x: 140, y: 650, facing: "right" },
      },
    ],
  },
  RELEASE_POND: {
    id: "RELEASE_POND",
    label: "Hồ phóng sinh",
    unlock: "RELEASE_POND",
    walkable: [r(60, 170, 1256, 575, "pond banks")],
    blockers: [
      r(RELEASE_POND.pond.x, RELEASE_POND.pond.y, RELEASE_POND.pier.x - RELEASE_POND.pond.x, RELEASE_POND.pond.h, "pond (west of the pier)"),
      r(RELEASE_POND.pier.x + RELEASE_POND.pier.w, RELEASE_POND.pond.y, RELEASE_POND.pond.x + RELEASE_POND.pond.w - (RELEASE_POND.pier.x + RELEASE_POND.pier.w), RELEASE_POND.pond.h, "pond (east of the pier)"),
      r(RELEASE_POND.pier.x, RELEASE_POND.pond.y, RELEASE_POND.pier.w, RELEASE_POND.pier.top - RELEASE_POND.pond.y, "pond (beyond the pier)"),
      ...posts(RELEASE_POND.willows, 34, "willow trunk"),
    ],
    gates: [
      {
        trigger: r(60, 600, 30, 100, "path back to the front gate"),
        to: "TAM_QUAN",
        arrive: { x: 1250, y: 650, facing: "left" },
      },
    ],
  },
  SUTRA_LIBRARY: {
    id: "SUTRA_LIBRARY",
    label: "Tàng kinh các",
    unlock: "SUTRA_LIBRARY",
    requiresPurity: true,
    walkable: [r(80, 300, 1216, 445, "library floor")],
    blockers: [
      r(SUTRA_LIBRARY.backShelves.x, SUTRA_LIBRARY.backShelves.y, SUTRA_LIBRARY.backShelves.w, SUTRA_LIBRARY.backShelves.h + 10, "back shelves"),
      ...SUTRA_LIBRARY.islands.map((i) => r(i.x, i.y, i.w, i.h, "shelf island")),
      r(SUTRA_LIBRARY.desk.x, SUTRA_LIBRARY.desk.y, SUTRA_LIBRARY.desk.w, SUTRA_LIBRARY.desk.h, "reading desk"),
      r(SUTRA_LIBRARY.staffStand.x - 70, SUTRA_LIBRARY.staffStand.y - 20, 140, 30, "golden staff stand"),
    ],
    gates: [
      {
        trigger: r(80, 600, 20, 90, "door back to the main hall"),
        to: "MAIN_HALL",
        arrive: { x: 1240, y: 645, facing: "left" },
      },
    ],
  },
  QUAN_AM_HILL: {
    id: "QUAN_AM_HILL",
    label: "Đồi Quan Âm",
    unlock: "QUAN_AM_HILL",
    walkable: [r(70, 250, 1236, 495, "hilltop")],
    blockers: [
      r(QUAN_AM_HILL.statue.x - QUAN_AM_HILL.statue.w / 2, QUAN_AM_HILL.statue.y - QUAN_AM_HILL.statue.h, QUAN_AM_HILL.statue.w, QUAN_AM_HILL.statue.h, "Quan Âm statue"),
      r(QUAN_AM_HILL.wishTree.x - 20, QUAN_AM_HILL.wishTree.y - 30, 40, 30, "wish tree trunk"),
      r(QUAN_AM_HILL.bench.x - 40, QUAN_AM_HILL.bench.y - 14, 80, 14, "stone bench"),
      ...posts(QUAN_AM_HILL.frangipani, 30, "frangipani trunk"),
    ],
    gates: [
      {
        trigger: r(100, 722, 100, 24, "path back down to the bell tower"),
        to: "BELL_TOWER",
        arrive: { x: 150, y: 200, facing: "down" },
      },
      {
        trigger: r(1286, 430, 20, 100, "mountain trail up to Hoa Quả Sơn"),
        to: "HOA_QUA_SON",
        arrive: { x: 150, y: 560, facing: "right" },
      },
    ],
  },
  HOA_QUA_SON: {
    id: "HOA_QUA_SON",
    label: "Hoa Quả Sơn",
    unlock: "HOA_QUA_SON",
    walkable: [r(70, 300, 1236, 445, "mountain meadow")],
    blockers: [
      r(HOA_QUA_SON.pool.x, HOA_QUA_SON.pool.y, HOA_QUA_SON.pool.w, HOA_QUA_SON.pool.h, "waterfall pool"),
      r(HOA_QUA_SON.peachTree.x - 22, HOA_QUA_SON.peachTree.y - 30, 44, 30, "peach tree trunk"),
      r(HOA_QUA_SON.monkeyRock.x - 60, HOA_QUA_SON.monkeyRock.y - 40, 120, 40, "monkeys' rock"),
      ...posts(HOA_QUA_SON.rocks, 50, "boulder"),
    ],
    gates: [
      {
        trigger: r(70, 500, 20, 110, "trail back down to Quan Âm hill"),
        to: "QUAN_AM_HILL",
        arrive: { x: 1230, y: 480, facing: "left" },
      },
    ],
  },
};

/**
 * Where the cân đẩu vân sets a rider down in an area: the arrival point of the
 * first gate (in AREA_IDS order) that leads into it.
 */
export function landingFor(area: AreaId): Gate["arrive"] {
  for (const from of AREA_IDS) {
    const gate = AREAS[from].gates.find((g) => g.to === area);
    if (gate) return gate.arrive;
  }
  throw new Error(`no gate leads into ${area}`);
}

export function isAreaId(v: unknown): v is AreaId {
  return typeof v === "string" && (AREA_IDS as readonly string[]).includes(v);
}

/** The area a player is in; players from older clients have none (courtyard). */
export function areaOf(p: { area?: string | null }): AreaId {
  return isAreaId(p.area) ? p.area : "COURTYARD";
}
