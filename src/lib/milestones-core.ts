/**
 * Pure milestone rules: which are unlocked at a temple-merit total, the next
 * one and progress toward it, and which unlocked between two totals.
 * Unit tested in tests/milestones.test.ts.
 */

import { MILESTONES, type Milestone, type MilestoneId } from "@/config/milestones";

/** Milestones unlocked at `total`, in unlock order. */
export function unlockedMilestones(total: number, list: Milestone[] = MILESTONES): Milestone[] {
  return list.filter((m) => total >= m.threshold);
}

export function isUnlocked(id: MilestoneId, total: number, list: Milestone[] = MILESTONES): boolean {
  const m = list.find((x) => x.id === id);
  return !!m && total >= m.threshold;
}

/** The next locked milestone and progress toward it, or null when all are unlocked. */
export function nextMilestone(
  total: number,
  list: Milestone[] = MILESTONES
): { milestone: Milestone; remaining: number; progress: number } | null {
  const sorted = [...list].sort((a, b) => a.threshold - b.threshold);
  const i = sorted.findIndex((m) => total < m.threshold);
  if (i < 0) return null;
  const from = i === 0 ? 0 : sorted[i - 1].threshold;
  const to = sorted[i].threshold;
  return { milestone: sorted[i], remaining: to - total, progress: Math.max(0, Math.min(1, (total - from) / (to - from))) };
}

/** Milestones crossed going from `prev` to `next` (none if the total did not grow). */
export function newlyUnlocked(prev: number, next: number, list: Milestone[] = MILESTONES): Milestone[] {
  if (next <= prev) return [];
  return list.filter((m) => prev < m.threshold && next >= m.threshold);
}
