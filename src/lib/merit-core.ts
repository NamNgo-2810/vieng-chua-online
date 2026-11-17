/**
 * Pure merit rules: Vietnam calendar days, the daily streak, and whether a
 * ritual earns merit now (cooldowns, gap, daily cap, streak bonus). No
 * Firebase, no React — unit tested in tests/merit.test.ts.
 *
 * Settings: config/merit.ts. Design: design/game-brief.md (merit & streak).
 */

import { MERIT } from "@/config/merit";
import type { ActivityId } from "@/config/activities";
import { holyDayAt } from "./lunar";

/** One player's merit record (RTDB `merit/{uid}`, or local storage offline). */
export interface MeritState {
  total: number;
  /** Merit earned on Vietnam day number `day.index` (see vnDay). */
  day: { index: number; earned: number };
  /** Consecutive days with at least one ritual, ending on day `lastIndex`. */
  streak: { count: number; lastIndex: number };
  /** Last award time per ritual (epoch ms). */
  lastAward: Partial<Record<ActivityId, number>>;
  /** Last award time of any ritual (epoch ms), 0 if never. */
  lastAwardAt: number;
}

export function emptyMerit(): MeritState {
  return { total: 0, day: { index: 0, earned: 0 }, streak: { count: 0, lastIndex: 0 }, lastAward: {}, lastAwardAt: 0 };
}

const DAY_MS = 86_400_000;

/**
 * Vietnam day number of `ts`: whole days since 1970-01-01 in UTC+7. A plain
 * integer so the RTDB rules can check it against `now` with arithmetic.
 */
export function vnDay(ts: number, offsetHours: number = MERIT.utcOffsetHours): number {
  return Math.floor((ts + offsetHours * 3600_000) / DAY_MS);
}

/** Streak after a ritual on day `today`: same day keeps it, next day grows it, a gap restarts at 1. */
export function nextStreak(streak: MeritState["streak"], today: number): MeritState["streak"] {
  if (streak.lastIndex === today) return streak;
  if (streak.count > 0 && streak.lastIndex === today - 1) return { count: streak.count + 1, lastIndex: today };
  return { count: 1, lastIndex: today };
}

/** The streak to display at `now`: it lapses once a whole day was missed. */
export function currentStreak(state: MeritState, now: number): number {
  const today = vnDay(now);
  const { count, lastIndex } = state.streak;
  return lastIndex === today || lastIndex === today - 1 ? count : 0;
}

/** Where an award's extra merit came from. */
export interface AwardExtras {
  /** First ritual of the day: min(streak, streakBonusMax). */
  streak: number;
  /** Rằm or mùng một of the lunar month. */
  holiday: number;
  /** Đồng tu: others doing the same ritual in the same area. */
  group: number;
}

export type AwardDecision =
  | { ok: true; amount: number; bonus: number; extras: AwardExtras; next: MeritState }
  | { ok: false; reason: "no-merit" | "cooldown" | "too-soon" | "daily-cap" };

/** Context a single player cannot see in their own record. */
export interface AwardContext {
  /** How many other players are doing this ritual in the same area now. */
  companions?: number;
}

/**
 * Decide whether finishing `activity` at `now` earns merit, and the record
 * after it. Base value plus: on the first ritual of the day a streak bonus; on
 * rằm/mùng một a holiday bonus; with companions doing the same ritual a đồng
 * tu bonus. Clipped to what is left of the daily cap and to maxAward.
 */
export function decideAward(
  state: MeritState,
  activity: ActivityId,
  now: number,
  cfg = MERIT,
  ctx: AwardContext = {}
): AwardDecision {
  const base = cfg.values[activity] ?? 0;
  if (base <= 0) return { ok: false, reason: "no-merit" };
  const last = state.lastAward[activity];
  if (last !== undefined && now - last < cfg.cooldownMs) return { ok: false, reason: "cooldown" };
  if (state.lastAwardAt && now - state.lastAwardAt < cfg.minGapMs) return { ok: false, reason: "too-soon" };

  const today = vnDay(now, cfg.utcOffsetHours);
  const earnedToday = state.day.index === today ? state.day.earned : 0;
  const left = cfg.dailyCap - earnedToday;
  if (left <= 0) return { ok: false, reason: "daily-cap" };

  const firstToday = state.streak.lastIndex !== today;
  const streak = nextStreak(state.streak, today);
  const extras: AwardExtras = {
    streak: firstToday ? Math.min(streak.count, cfg.streakBonusMax) : 0,
    holiday: holyDayAt(now) ? cfg.holidayBonus : 0,
    group: Math.min(Math.max(0, Math.floor(ctx.companions ?? 0)), cfg.groupBonusMax) * cfg.groupBonusPer,
  };
  const amount = Math.min(base + extras.streak + extras.holiday + extras.group, left, cfg.maxAward);

  return {
    ok: true,
    amount,
    extras,
    bonus: Math.max(0, amount - base),
    next: {
      total: state.total + amount,
      day: { index: today, earned: earnedToday + amount },
      streak,
      lastAward: { ...state.lastAward, [activity]: now },
      lastAwardAt: now,
    },
  };
}

/** Coerce a stored record (possibly partial or from an older version) into MeritState. */
export function normalizeMerit(raw: unknown): MeritState {
  const e = emptyMerit();
  if (!raw || typeof raw !== "object") return e;
  const r = raw as Partial<MeritState>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    total: num(r.total),
    day: { index: num(r.day?.index), earned: num(r.day?.earned) },
    streak: { count: num(r.streak?.count), lastIndex: num(r.streak?.lastIndex) },
    lastAward: r.lastAward && typeof r.lastAward === "object" ? { ...r.lastAward } : {},
    lastAwardAt: num(r.lastAwardAt),
  };
}
