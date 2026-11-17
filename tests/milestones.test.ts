import { describe, it, expect } from "vitest";
import { unlockedMilestones, isUnlocked, nextMilestone, newlyUnlocked } from "@/lib/milestones-core";
import { MILESTONES } from "@/config/milestones";

const T = (id: string) => MILESTONES.find((m) => m.id === id)!.threshold;

describe("milestones: data", () => {
  it("is listed in ascending threshold order with unique ids", () => {
    const t = MILESTONES.map((m) => m.threshold);
    expect([...t].sort((a, b) => a - b)).toEqual(t);
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
  });

  it("opens decor before the new area", () => {
    const firstArea = MILESTONES.findIndex((m) => m.kind === "area");
    expect(firstArea).toBeGreaterThan(0);
    expect(MILESTONES.slice(0, firstArea).every((m) => m.kind === "decor")).toBe(true);
  });
});

describe("milestones: unlocking", () => {
  it("unlocks nothing at zero", () => expect(unlockedMilestones(0)).toEqual([]));

  it("unlocks a milestone exactly at its threshold", () => {
    expect(isUnlocked("LOTUS_BLOOM", T("LOTUS_BLOOM") - 1)).toBe(false);
    expect(isUnlocked("LOTUS_BLOOM", T("LOTUS_BLOOM"))).toBe(true);
  });

  it("unlocks everything past the last threshold", () => {
    expect(unlockedMilestones(1_000_000)).toHaveLength(MILESTONES.length);
  });
});

describe("milestones: next", () => {
  it("measures progress from the previous threshold", () => {
    const [a, b] = [MILESTONES[0], MILESTONES[1]];
    const mid = (a.threshold + b.threshold) / 2;
    const n = nextMilestone(mid)!;
    expect(n.milestone.id).toBe(b.id);
    expect(n.remaining).toBe(b.threshold - mid);
    expect(n.progress).toBeCloseTo(0.5);
  });

  it("starts from zero for the first milestone", () => {
    expect(nextMilestone(MILESTONES[0].threshold / 2)!.progress).toBeCloseTo(0.5);
  });

  it("is null once all are unlocked", () => {
    expect(nextMilestone(1_000_000)).toBeNull();
  });
});

describe("milestones: newly unlocked", () => {
  it("reports each threshold crossed, in order", () => {
    const [a, b, c] = MILESTONES;
    expect(newlyUnlocked(a.threshold - 1, b.threshold).map((m) => m.id)).toEqual([a.id, b.id]);
    expect(newlyUnlocked(a.threshold - 1, b.threshold).some((m) => m.id === c.id)).toBe(false);
  });

  it("reports nothing when the threshold was already passed", () => {
    const [a, b] = MILESTONES;
    expect(newlyUnlocked(a.threshold, b.threshold - 1)).toEqual([]);
  });

  it("is paced for a small group (first unlock within a couple of visits)", () => {
    expect(MILESTONES[0].threshold).toBeLessThanOrEqual(20);
    expect(MILESTONES[MILESTONES.length - 1].threshold).toBeLessThanOrEqual(500);
  });

  it("reports nothing when the total did not grow", () => {
    expect(newlyUnlocked(60, 40)).toEqual([]);
  });
});
