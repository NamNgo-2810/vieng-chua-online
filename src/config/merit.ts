/**
 * Merit (công đức) and daily-streak settings. A ritual earns merit once the
 * player has stayed in it for `ritualMs`; each ritual has its own cooldown;
 * a day's merit is capped at `dailyCap` (108, the beads of a Buddhist rosary).
 *
 * Design: design/game-brief.md — Features: merit, daily streak, shared temple.
 * database.rules.json mirrors ritualMs, cooldownMs, minGapMs, dailyCap,
 * maxAward and the values below — change both together.
 */

import type { ActivityId } from "./activities";

export const MERIT = {
  /** Time a ritual must be held before it earns merit. */
  ritualMs: 5000,
  /** Before the same ritual can earn again. */
  cooldownMs: 60_000,
  /** Minimum time between any two awards. */
  minGapMs: 5000,
  /** Most merit one player can earn per (Vietnam) day. */
  dailyCap: 108,
  /**
   * Largest single award: best ritual 5 + streak 7 + rằm/mùng một 1 + đồng tu 2
   * (the RTDB rules cap each write at this).
   */
  maxAward: 15,
  /** Extra merit per ritual on the 1st and 15th of the lunar month. */
  holidayBonus: 1,
  /** Extra merit per companion doing the same ritual in the same area (đồng tu). */
  groupBonusPer: 1,
  groupBonusMax: 2,
  /** First ritual of the day adds min(streak, streakBonusMax). */
  streakBonusMax: 7,
  /** Days are counted in Vietnam time (UTC+7), whatever the device says. */
  utcOffsetHours: 7,
  /** Merit per ritual. WALKING earns nothing. */
  values: {
    RING_BELL: 5,
    OFFER_INCENSE: 3,
    OFFERING: 3,
    MEDITATION: 3,
    CHANTING: 3,
    PRAYING: 2,
    LISTENING: 2,
    WOODEN_FISH: 2,
    RELEASE_LANTERN: 4,
    STRIKE_GREAT_BELL: 5,
    OFFER_TEA: 3,
    WALKING_MEDITATION: 3,
    SIGN_GUESTBOOK: 2,
    DONATE: 3,
    RELEASE_FISH: 4,
    FEED_FISH: 2,
    READ_SUTRA: 3,
    DRAW_FORTUNE: 2,
    HANG_WISH: 3,
    REMOVE_SHOES: 1,
    WASH_HANDS_FEET: 1,
    BATHE_BUDDHA: 4,
    PICK_PEACH: 3,
    FEED_MONKEYS: 2,
    WALKING: 0,
  } satisfies Record<ActivityId, number>,
} as const;
