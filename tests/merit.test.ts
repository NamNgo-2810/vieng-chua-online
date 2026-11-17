import { describe, it, expect } from "vitest";
import {
  vnDay,
  nextStreak,
  currentStreak,
  decideAward,
  emptyMerit,
  normalizeMerit,
  type MeritState,
} from "@/lib/merit-core";
import { MERIT } from "@/config/merit";
import { ACTIVITY_IDS } from "@/config/activities";

/** 2026-11-13 10:00 in Vietnam (03:00 UTC). */
const T0 = Date.UTC(2026, 10, 13, 3, 0, 0);
const DAY = 24 * 3600_000;

const withAward = (s: MeritState, activity: "OFFER_INCENSE" | "MEDITATION" | "RING_BELL", now: number) => {
  const d = decideAward(s, activity, now);
  if (!d.ok) throw new Error(`expected an award, got ${d.reason}`);
  return d;
};

/** Vietnam day number of 2026-11-13. */
const D13 = vnDay(T0);

describe("merit: Vietnam days", () => {
  it("uses Vietnam time, not UTC (23:30 UTC is already tomorrow in Vietnam)", () => {
    expect(vnDay(Date.UTC(2026, 10, 13, 23, 30))).toBe(D13 + 1);
    expect(vnDay(Date.UTC(2026, 10, 13, 16, 59))).toBe(D13);
    expect(vnDay(Date.UTC(2026, 10, 13, 17, 0))).toBe(D13 + 1); // Vietnam midnight
  });

  it("counts whole days, continuous across months", () => {
    expect(vnDay(Date.UTC(2026, 11, 1, 3)) - vnDay(Date.UTC(2026, 10, 30, 3))).toBe(1);
  });
});

describe("merit: streak", () => {
  it("starts at 1", () => {
    expect(nextStreak({ count: 0, lastIndex: 0 }, D13)).toEqual({ count: 1, lastIndex: D13 });
  });

  it("grows on the next day", () => {
    expect(nextStreak({ count: 3, lastIndex: D13 - 1 }, D13)).toEqual({ count: 4, lastIndex: D13 });
  });

  it("stays the same later the same day", () => {
    expect(nextStreak({ count: 3, lastIndex: D13 }, D13)).toEqual({ count: 3, lastIndex: D13 });
  });

  it("restarts at 1 after a missed day", () => {
    expect(nextStreak({ count: 9, lastIndex: D13 - 3 }, D13)).toEqual({ count: 1, lastIndex: D13 });
  });

  it("shows as lapsed (0) once a whole day was missed", () => {
    const s = { ...emptyMerit(), streak: { count: 5, lastIndex: D13 - 2 } };
    expect(currentStreak(s, T0)).toBe(0);
    expect(currentStreak({ ...s, streak: { count: 5, lastIndex: D13 - 1 } }, T0)).toBe(5);
  });
});

describe("merit: awards", () => {
  it("gives the ritual's value plus the first-of-day streak bonus", () => {
    const d = withAward(emptyMerit(), "OFFER_INCENSE", T0);
    expect(d.amount).toBe(MERIT.values.OFFER_INCENSE + 1); // streak 1 → bonus 1
    expect(d.bonus).toBe(1);
    expect(d.next.total).toBe(d.amount);
    expect(d.next.streak).toEqual({ count: 1, lastIndex: D13 });
  });

  it("gives no bonus for later rituals the same day", () => {
    const first = withAward(emptyMerit(), "OFFER_INCENSE", T0);
    const second = withAward(first.next, "MEDITATION", T0 + MERIT.minGapMs);
    expect(second.amount).toBe(MERIT.values.MEDITATION);
    expect(second.bonus).toBe(0);
  });

  it("caps the streak bonus", () => {
    const s = { ...emptyMerit(), streak: { count: 30, lastIndex: D13 - 1 } };
    expect(withAward(s, "OFFER_INCENSE", T0).bonus).toBe(MERIT.streakBonusMax);
  });

  it("refuses the same ritual inside its cooldown", () => {
    const first = withAward(emptyMerit(), "OFFER_INCENSE", T0);
    const again = decideAward(first.next, "OFFER_INCENSE", T0 + MERIT.cooldownMs - 1);
    expect(again).toEqual({ ok: false, reason: "cooldown" });
  });

  it("allows the same ritual once the cooldown has passed", () => {
    const first = withAward(emptyMerit(), "OFFER_INCENSE", T0);
    expect(decideAward(first.next, "OFFER_INCENSE", T0 + MERIT.cooldownMs).ok).toBe(true);
  });

  it("refuses any ritual within the minimum gap", () => {
    const first = withAward(emptyMerit(), "OFFER_INCENSE", T0);
    expect(decideAward(first.next, "MEDITATION", T0 + MERIT.minGapMs - 1)).toEqual({ ok: false, reason: "too-soon" });
  });

  it("gives nothing for walking", () => {
    expect(decideAward(emptyMerit(), "WALKING", T0)).toEqual({ ok: false, reason: "no-merit" });
  });

  it("clips the last award to the daily cap, then refuses", () => {
    const s: MeritState = { ...emptyMerit(), day: { index: D13, earned: MERIT.dailyCap - 1 }, streak: { count: 1, lastIndex: D13 } };
    const d = withAward(s, "RING_BELL", T0);
    expect(d.amount).toBe(1);
    expect(d.next.day.earned).toBe(MERIT.dailyCap);
    expect(decideAward(d.next, "MEDITATION", T0 + MERIT.cooldownMs)).toEqual({ ok: false, reason: "daily-cap" });
  });

  it("resets the daily count on a new Vietnam day", () => {
    const s: MeritState = { ...emptyMerit(), day: { index: D13 - 1, earned: MERIT.dailyCap }, streak: { count: 1, lastIndex: D13 - 1 } };
    const d = withAward(s, "MEDITATION", T0);
    expect(d.next.day).toEqual({ index: D13, earned: d.amount });
    expect(d.next.streak.count).toBe(2);
  });

  it("never exceeds maxAward (what the rules accept per write)", () => {
    const s = { ...emptyMerit(), streak: { count: 30, lastIndex: D13 - 1 } };
    for (const a of ACTIVITY_IDS) {
      const d = decideAward(s, a, T0 + DAY * 0);
      if (d.ok) expect(d.amount, a).toBeLessThanOrEqual(MERIT.maxAward);
    }
  });
});

describe("merit: stored records", () => {
  it("fills missing fields from an older or partial record", () => {
    expect(normalizeMerit({ total: 7 })).toEqual({ ...emptyMerit(), total: 7 });
  });

  it("rejects garbage values", () => {
    expect(normalizeMerit({ total: -5, day: { earned: "x" } }).total).toBe(0);
    expect(normalizeMerit(null)).toEqual(emptyMerit());
  });
});

describe("merit: rằm/mùng một and đồng tu bonuses", () => {
  /** Noon in Vietnam on rằm tháng 8, 2024 (Trung thu). */
  const RAM = Date.UTC(2024, 8, 17, 5, 0, 0);

  it("adds the holiday bonus on rằm", () => {
    const d = decideAward(emptyMerit(), "MEDITATION", RAM);
    if (!d.ok) throw new Error(d.reason);
    expect(d.extras.holiday).toBe(MERIT.holidayBonus);
    expect(d.amount).toBe(MERIT.values.MEDITATION + 1 /* streak */ + MERIT.holidayBonus);
  });

  it("adds nothing for the holiday on an ordinary day", () => {
    const d = decideAward(emptyMerit(), "MEDITATION", T0);
    expect(d.ok && d.extras.holiday).toBe(0);
  });

  it("adds a đồng tu bonus per companion, up to the cap", () => {
    const at = (companions: number) => {
      const d = decideAward(emptyMerit(), "MEDITATION", T0, MERIT, { companions });
      return d.ok ? d.extras.group : -1;
    };
    expect(at(0)).toBe(0);
    expect(at(1)).toBe(MERIT.groupBonusPer);
    expect(at(10)).toBe(MERIT.groupBonusMax * MERIT.groupBonusPer);
  });

  it("the biggest possible award still fits maxAward (what the server accepts)", () => {
    const s = { ...emptyMerit(), streak: { count: 99, lastIndex: vnDay(RAM) - 1 } };
    const best = Math.max(...Object.values(MERIT.values));
    const d = decideAward(s, "STRIKE_GREAT_BELL", RAM, MERIT, { companions: 9 });
    expect(d.ok && d.amount).toBe(best + MERIT.streakBonusMax + MERIT.holidayBonus + MERIT.groupBonusMax * MERIT.groupBonusPer);
    expect(d.ok && d.amount).toBeLessThanOrEqual(MERIT.maxAward);
  });
});
