/**
 * Backend-agnostic history recording core. This holds the parts that must be
 * correct regardless of the storage backend (Google Sheets today): event
 * idempotency and the "never let a write failure block gameplay" contract.
 *
 * It is pure/injectable so it can be unit-tested without real Google
 * credentials: pass a `writer` that appends rows, and (in tests) one that
 * throws to simulate an API outage.
 */

import type { HistoryEvent } from "@/lib/validation";

/** Bounded set of recently-seen event IDs for duplicate suppression. */
export class EventDedup {
  private seen = new Set<string>();
  private limit: number;

  constructor(limit = 5000) {
    this.limit = limit;
  }

  /** Returns true if this id is new (and records it); false if duplicate. */
  claim(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    if (this.seen.size > this.limit) {
      const first = this.seen.values().next().value;
      if (first) this.seen.delete(first);
    }
    return true;
  }

  /** Release an id so a failed write can be retried later. */
  release(id: string): void {
    this.seen.delete(id);
  }

  has(id: string): boolean {
    return this.seen.has(id);
  }

  get count(): number {
    return this.seen.size;
  }
}

/** A backend writer: persists one validated event. May throw on failure. */
export type HistoryWriter = (ev: HistoryEvent) => Promise<void>;

export interface RecordResult {
  written: boolean;
  /** Why it wasn't written, when applicable. */
  reason?: "duplicate" | "writer-failed" | "not-configured";
}

/**
 * Record one event through `writer`, enforcing idempotency and swallowing
 * writer failures (returning written:false rather than throwing). On failure
 * the event id is released so a later retry can succeed. This is the function
 * tests exercise for the idempotency + failure-isolation requirements.
 */
export async function recordWithDedup(
  ev: HistoryEvent,
  dedup: EventDedup,
  writer: HistoryWriter
): Promise<RecordResult> {
  if (!dedup.claim(ev.eventId)) {
    return { written: false, reason: "duplicate" };
  }
  try {
    await writer(ev);
    return { written: true };
  } catch {
    dedup.release(ev.eventId);
    return { written: false, reason: "writer-failed" };
  }
}
