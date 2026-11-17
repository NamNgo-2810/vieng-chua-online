import { describe, it, expect } from "vitest";
import {
  canStand,
  resolveMove,
  findSpawn,
  nearestSpot,
  activityAllowedAt,
  spotOffering,
  walkMapFor,
  type WalkMap,
} from "@/game/placement";
import { RITUAL_SPOTS, SPOTS_BY_ID, spotsIn } from "@/config/ritual-spots";
import { SPAWN_AREA } from "@/config/temple-map";
import { ACTIVITY_IDS } from "@/config/activities";

/** A tiny map: a 100x100 room with a 20x20 pillar in the middle. */
const ROOM: WalkMap = {
  walkable: [{ x: 0, y: 0, w: 100, h: 100, label: "room" }],
  blockers: [{ x: 40, y: 40, w: 20, h: 20, label: "pillar" }],
};

describe("placement: canStand", () => {
  it("allows open floor", () => expect(canStand(10, 10, ROOM)).toBe(true));
  it("refuses a blocker", () => expect(canStand(50, 50, ROOM)).toBe(false));
  it("refuses outside every walkable area", () => expect(canStand(150, 10, ROOM)).toBe(false));
});

describe("placement: resolveMove", () => {
  it("takes a free step in full", () => {
    expect(resolveMove(10, 10, 15, 12, ROOM)).toEqual({ x: 15, y: 12 });
  });

  it("slides along a wall when the diagonal step is blocked", () => {
    // Moving down-right into the pillar's left face: x is blocked, y is free.
    expect(resolveMove(38, 30, 42, 34, ROOM)).toEqual({ x: 42, y: 34 }); // above the pillar: free
    expect(resolveMove(38, 45, 42, 48, ROOM)).toEqual({ x: 38, y: 48 });
  });

  it("stops at the edge of the walkable area", () => {
    expect(resolveMove(99, 99, 105, 105, ROOM)).toEqual({ x: 99, y: 99 });
  });

  it("lets a player stuck inside a blocker walk out", () => {
    expect(resolveMove(50, 50, 52, 50, ROOM)).toEqual({ x: 52, y: 50 });
  });
});

describe("placement: findSpawn", () => {
  it("returns a walkable point inside the spawn area (real temple map)", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) {
      const p = findSpawn(random);
      expect(canStand(p.x, p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(SPAWN_AREA.x);
      expect(p.x).toBeLessThanOrEqual(SPAWN_AREA.x + SPAWN_AREA.w);
    }
  });

  it("falls back to a grid scan when random picks only blocked points", () => {
    const area = { x: 35, y: 35, w: 30, h: 30, label: "around pillar" };
    const p = findSpawn(() => 0.5, area, ROOM); // centre (50,50) is the pillar
    expect(canStand(p.x, p.y, ROOM)).toBe(true);
  });
});

describe("ritual spots: data", () => {
  it("every spot's stand point is walkable", () => {
    for (const s of RITUAL_SPOTS) expect(canStand(s.standX, s.standY, walkMapFor(s.area)), s.id).toBe(true);
  });

  it("standing at a spot's stand point keeps you at that spot (no neighbour wins)", () => {
    for (const s of RITUAL_SPOTS) expect(nearestSpot(s.standX, s.standY, spotsIn(s.area))?.id, s.id).toBe(s.id);
  });

  it("every spot's stand point is within its own radius", () => {
    for (const s of RITUAL_SPOTS) {
      expect(Math.hypot(s.x - s.standX, s.y - s.standY), s.id).toBeLessThanOrEqual(s.radius);
    }
  });

  it("every activity except walking has a place", () => {
    for (const a of ACTIVITY_IDS) {
      if (a === "WALKING") continue;
      expect(spotOffering(a), a).not.toBeNull();
    }
  });

  it("the spawn area is not inside any spot (new players start walking)", () => {
    const p = findSpawn(() => 0.5);
    expect(nearestSpot(p.x, p.y)).toBeNull();
  });
});

describe("ritual spots: reach", () => {
  it("finds the burner when standing at its stand point", () => {
    const b = SPOTS_BY_ID.BURNER;
    expect(nearestSpot(b.standX, b.standY)?.id).toBe("BURNER");
  });

  it("reaches the wooden fish from the gap between the altar tables (pillar stops you at ~800,386)", () => {
    expect(nearestSpot(800, 386)?.id).toBe("WOODEN_FISH");
  });

  it("finds nothing far from every spot", () => {
    expect(nearestSpot(150, 700)).toBeNull();
  });

  it("allows walking anywhere", () => {
    expect(activityAllowedAt("WALKING", null)).toBe(true);
  });

  it("refuses a ritual away from its spot", () => {
    expect(activityAllowedAt("OFFER_INCENSE", null)).toBe(false);
    expect(activityAllowedAt("OFFER_INCENSE", SPOTS_BY_ID.BELL)).toBe(false);
  });

  it("allows a ritual at its spot", () => {
    expect(activityAllowedAt("RING_BELL", SPOTS_BY_ID.BELL)).toBe(true);
    expect(activityAllowedAt("MEDITATION", SPOTS_BY_ID.CUSHION_RIGHT)).toBe(true);
  });
});
