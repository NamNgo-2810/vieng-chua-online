import { describe, it, expect } from "vitest";
import { MILESTONES } from "@/config/milestones";
import { MERIT } from "@/config/merit";
import { AREAS, AREA_IDS, type AreaId } from "@/config/areas";
import { spotsIn } from "@/config/ritual-spots";
import { canPerform } from "@/config/permissions";
import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";
import { decideAward, emptyMerit } from "@/lib/merit-core";

/** What "one visit" means for this game (design/game-brief.md). */
const VISIT_MS = 10 * 60_000;
/** One ritual: hold it MERIT.ritualMs, plus walking to the next spot. */
const WALK_MS = 10_000;
/** 2026-11-13 10:00 in Vietnam: a fresh day, so the daily cap starts at 0. */
const START = Date.UTC(2026, 10, 13, 3, 0, 0);

const threshold = (id: string | undefined) => (id ? MILESTONES.find((m) => m.id === id)!.threshold : 0);
const lastAreaThreshold = Math.max(...AREA_IDS.map((a) => threshold(AREAS[a].unlock)));

/**
 * One player alone, starting from an empty temple, doing whichever ritual is
 * off cooldown in any area already open, one after another. Returns how long
 * until every map is open (or Infinity if the visit ends first).
 */
function timeToOpenEverything(role: RoleId): { ms: number; earned: number } {
  let merit = emptyMerit();
  let temple = 0;
  let now = START;
  while (now - START <= VISIT_MS) {
    if (temple >= lastAreaThreshold) return { ms: now - START, earned: merit.total };
    const open = AREA_IDS.filter((a: AreaId) => temple >= threshold(AREAS[a].unlock));
    const rituals = new Set<ActivityId>();
    for (const a of open) for (const s of spotsIn(a)) for (const act of s.activities) if (canPerform(role, act)) rituals.add(act);
    let awarded = false;
    for (const act of rituals) {
      const d = decideAward(merit, act, now + MERIT.ritualMs);
      if (!d.ok) continue;
      merit = d.next;
      temple += d.amount;
      now += MERIT.ritualMs + WALK_MS;
      awarded = true;
      break;
    }
    if (!awarded) now += 5_000; // everything on cooldown: wait a little
  }
  return { ms: Infinity, earned: merit.total };
}

describe("one visit opens every map", () => {
  it("a lay visitor alone opens all maps within one visit (the weakest role)", () => {
    const { ms } = timeToOpenEverything("KHACH_THAP_PHUONG");
    expect(ms).toBeLessThanOrEqual(VISIT_MS);
  });

  it("the abbot alone does it at least as fast", () => {
    expect(timeToOpenEverything("TRU_TRI").ms).toBeLessThanOrEqual(timeToOpenEverything("KHACH_THAP_PHUONG").ms);
  });

  it("everything opens well inside one player's daily merit cap", () => {
    expect(lastAreaThreshold).toBeLessThanOrEqual(MERIT.dailyCap / 2);
  });
});
