import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AREAS, AREA_IDS, GARDEN, ENTRY, areaOf, type AreaId } from "@/config/areas";
import type { Rect } from "@/config/temple-map";
import { spotsIn, SPOTS_BY_ID } from "@/config/ritual-spots";
import { canStand, gateAt, nearestSpot, walkMapFor, spotOffering, findSpawn } from "@/game/placement";
import { MILESTONES } from "@/config/milestones";
import { useGameStore } from "@/state/store";

describe("areas: gates", () => {
  it("every gate leads to an area that has a gate back", () => {
    for (const a of AREA_IDS) {
      for (const g of AREAS[a].gates) {
        expect(AREAS[g.to].gates.some((back) => back.to === a), `${a} → ${g.to}`).toBe(true);
      }
    }
  });

  it("arrival points are walkable in the destination", () => {
    for (const a of AREA_IDS) {
      for (const g of AREAS[a].gates) expect(canStand(g.arrive.x, g.arrive.y, walkMapFor(g.to)), `${a} → ${g.to}`).toBe(true);
    }
  });

  it("an arrival never lands inside the destination's own gate (no bouncing back)", () => {
    for (const a of AREA_IDS) {
      for (const g of AREAS[a].gates) expect(gateAt(g.to, g.arrive.x, g.arrive.y), `${a} → ${g.to}`).toBeNull();
    }
  });

  it("every gate trigger can actually be walked into", () => {
    for (const a of AREA_IDS) {
      for (const g of AREAS[a].gates) {
        const t = g.trigger;
        let reachable = false;
        for (let x = t.x; x <= t.x + t.w && !reachable; x += 2)
          for (let y = t.y; y <= t.y + t.h && !reachable; y += 2) reachable = canStand(x, y, walkMapFor(a));
        expect(reachable, `${a} gate to ${g.to}`).toBe(true);
      }
    }
  });

  it("every gate can be reached on foot from where players arrive (grid walk)", () => {
    /** Breadth-first walk over a 2px grid using the real walk map. */
    const reachable = (area: AreaId, from: { x: number; y: number }, target: Rect) => {
      const map = walkMapFor(area);
      const S = 2; // finer than a frame of walking (~2.7px), so gaps a player cannot cross stay closed
      const key = (x: number, y: number) => `${x},${y}`;
      const start = { x: Math.round(from.x / S) * S, y: Math.round(from.y / S) * S };
      const seen = new Set([key(start.x, start.y)]);
      const queue = [start];
      while (queue.length) {
        const { x, y } = queue.shift()!;
        if (x >= target.x && x <= target.x + target.w && y >= target.y && y <= target.y + target.h) return true;
        for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) {
          const nx = x + dx, ny = y + dy;
          if (seen.has(key(nx, ny)) || !canStand(nx, ny, map)) continue;
          seen.add(key(nx, ny));
          queue.push({ x: nx, y: ny });
        }
      }
      return false;
    };
    const spawn = findSpawn(() => 0.5);
    for (const g of AREAS.COURTYARD.gates) expect(reachable("COURTYARD", spawn, g.trigger), `courtyard spawn → gate to ${g.to}`).toBe(true);
    const arrival = findSpawn(() => 0.5, ENTRY.spawn, walkMapFor(ENTRY.area));
    for (const g of AREAS[ENTRY.area].gates) expect(reachable(ENTRY.area, arrival, g.trigger), `arrival → gate to ${g.to}`).toBe(true);
    for (const id of ["SHOE_RACK", "WASH_BASIN"] as const) {
      const sp = SPOTS_BY_ID[id];
      expect(reachable(ENTRY.area, arrival, { x: sp.standX - 3, y: sp.standY - 3, w: 6, h: 6, label: id }), `arrival → ${id}`).toBe(true);
    }
    for (const a of AREA_IDS) {
      for (const g of AREAS[a].gates) {
        for (const back of AREAS[g.to].gates) {
          expect(reachable(g.to, g.arrive, back.trigger), `${g.to} arrival → gate to ${back.to}`).toBe(true);
        }
      }
    }
  });

  it("every area can be reached from the courtyard through gates", () => {
    const seen = new Set<string>(["COURTYARD"]);
    const queue: AreaId[] = ["COURTYARD"];
    while (queue.length) {
      for (const g of AREAS[queue.shift()!].gates) if (!seen.has(g.to)) { seen.add(g.to); queue.push(g.to); }
    }
    expect([...seen].sort()).toEqual([...AREA_IDS].sort());
  });

  it("an area never unlocks before the area you enter it from (going deeper)", () => {
    const need = (a: AreaId) => {
      const id = AREAS[a].unlock;
      return id ? MILESTONES.find((m) => m.id === id)!.threshold : 0;
    };
    // Steps from the courtyard; gates back towards it are not "entering".
    const depth = new Map<AreaId, number>([["COURTYARD", 0]]);
    const queue: AreaId[] = ["COURTYARD"];
    while (queue.length) {
      const a = queue.shift()!;
      for (const g of AREAS[a].gates) if (!depth.has(g.to)) { depth.set(g.to, depth.get(a)! + 1); queue.push(g.to); }
    }
    for (const a of AREA_IDS) {
      for (const g of AREAS[a].gates) {
        if (depth.get(g.to)! <= depth.get(a)!) continue;
        expect(need(g.to), `${a} → ${g.to}`).toBeGreaterThanOrEqual(need(a));
      }
    }
  });

  it("every area has at least one ritual spot, and every milestone area has an area", () => {
    for (const a of AREA_IDS) expect(spotsIn(a).length, a).toBeGreaterThan(0);
    for (const m of MILESTONES.filter((x) => x.kind === "area")) {
      expect(AREA_IDS.some((a) => AREAS[a].unlock === m.id), m.id).toBe(true);
    }
  });

  it("the garden opens at the LOTUS_GARDEN milestone", () => {
    expect(AREAS.LOTUS_GARDEN.unlock).toBe("LOTUS_GARDEN");
    expect(MILESTONES.find((m) => m.id === "LOTUS_GARDEN")?.kind).toBe("area");
  });
});

describe("areas: lotus garden layout", () => {
  it("the bridge band crosses the pond and is walkable end to end", () => {
    const y = GARDEN.bridge.y + GARDEN.bridge.h / 2;
    for (let x = GARDEN.pond.x; x <= GARDEN.pond.x + GARDEN.pond.w; x += 10) {
      expect(canStand(x, y, walkMapFor("LOTUS_GARDEN")), `bridge at x=${x}`).toBe(true);
    }
  });

  it("the pond itself is not walkable", () => {
    expect(canStand(GARDEN.pond.x + 50, GARDEN.pond.y + 30, walkMapFor("LOTUS_GARDEN"))).toBe(false);
  });

  it("the lantern ritual exists only in the garden", () => {
    expect(spotOffering("RELEASE_LANTERN")?.area).toBe("LOTUS_GARDEN");
    expect(spotsIn("COURTYARD").some((s) => s.activities.includes("RELEASE_LANTERN"))).toBe(false);
  });

  it("garden spots never answer for courtyard positions (shared coordinates)", () => {
    const p = SPOTS_BY_ID.PAVILION; // lies over the courtyard's right garden
    expect(nearestSpot(p.standX, p.standY, spotsIn("COURTYARD"))?.id).not.toBe("PAVILION");
    expect(nearestSpot(p.standX, p.standY, spotsIn("LOTUS_GARDEN"))?.id).toBe("PAVILION");
  });

  it("treats a player with no stored area as in the courtyard", () => {
    expect(areaOf({})).toBe("COURTYARD");
    expect(areaOf({ area: "LOTUS_GARDEN" })).toBe("LOTUS_GARDEN");
    expect(areaOf({ area: "MOON" })).toBe("COURTYARD");
  });
});

describe("areas: entering through the store (offline)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    await useGameStore.getState().leave();
    vi.useRealTimers();
  });

  it("refuses the garden while the temple is below its milestone", async () => {
    await useGameStore.getState().enterTemple("Lan", "KHACH_THAP_PHUONG");
    await useGameStore.getState().enterArea("COURTYARD"); // arrive at the Tam quan, walk in
    const ok = await useGameStore.getState().enterArea("LOTUS_GARDEN");
    expect(ok).toBe(false);
    expect(areaOf(useGameStore.getState().localPlayer!)).toBe("COURTYARD");
  });

  it("enters the garden once unlocked, at the arrival point, walking", async () => {
    await useGameStore.getState().enterTemple("Lan", "KHACH_THAP_PHUONG");
    await useGameStore.getState().enterArea("COURTYARD"); // arrive at the Tam quan, walk in
    useGameStore.setState({ templeMerit: MILESTONES.find((m) => m.id === "LOTUS_GARDEN")!.threshold });
    const ok = await useGameStore.getState().enterArea("LOTUS_GARDEN");
    const me = useGameStore.getState().localPlayer!;
    const arrive = AREAS.COURTYARD.gates[0].arrive;
    expect(ok).toBe(true);
    expect(areaOf(me)).toBe("LOTUS_GARDEN");
    expect([me.positionX, me.positionY]).toEqual([arrive.x, arrive.y]);
    expect(me.currentActivity).toBe("WALKING");
  });

  it("allows the garden's lantern ritual there, but not in the courtyard", async () => {
    await useGameStore.getState().enterTemple("Lan", "KHACH_THAP_PHUONG");
    await useGameStore.getState().enterArea("COURTYARD"); // arrive at the Tam quan, walk in
    const shore = SPOTS_BY_ID.LANTERN_SHORE;
    useGameStore.getState().move(shore.standX, shore.standY, "up");
    await useGameStore.getState().changeActivity("RELEASE_LANTERN");
    expect(useGameStore.getState().localPlayer!.currentActivity).toBe("WALKING"); // courtyard: refused

    useGameStore.setState({ templeMerit: MILESTONES.find((m) => m.id === "LOTUS_GARDEN")!.threshold });
    await useGameStore.getState().enterArea("LOTUS_GARDEN");
    useGameStore.getState().move(shore.standX, shore.standY, "up");
    await useGameStore.getState().changeActivity("RELEASE_LANTERN");
    expect(useGameStore.getState().localPlayer!.currentActivity).toBe("RELEASE_LANTERN");
  });
});
