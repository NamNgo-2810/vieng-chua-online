/**
 * Tiny in-memory token-bucket rate limiter. Per-key (e.g. per sessionId), it
 * allows up to `capacity` events that refill at `refillPerSec`. Suitable for a
 * single serverless instance / friends-scale traffic; it is not a distributed
 * limiter. Pure and deterministic given a clock, so it is unit-testable.
 */

export interface RateLimiterOptions {
  capacity: number; // max burst
  refillPerSec: number; // tokens added per second
  /** Injectable clock for tests; defaults to Date.now. */
  now?: () => number;
}

interface Bucket {
  tokens: number;
  last: number; // ms timestamp of last refill
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private capacity: number;
  private refillPerMs: number;
  private now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.capacity = opts.capacity;
    this.refillPerMs = opts.refillPerSec / 1000;
    this.now = opts.now ?? Date.now;
  }

  /** Try to consume one token for `key`. Returns true if allowed. */
  allow(key: string): boolean {
    const t = this.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.capacity, last: t };
      this.buckets.set(key, b);
    }
    // Refill based on elapsed time.
    const elapsed = t - b.last;
    if (elapsed > 0) {
      b.tokens = Math.min(this.capacity, b.tokens + elapsed * this.refillPerMs);
      b.last = t;
    }
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Drop stale buckets to bound memory (optional housekeeping). */
  prune(maxIdleMs = 10 * 60 * 1000) {
    const t = this.now();
    for (const [k, b] of this.buckets) {
      if (t - b.last > maxIdleMs) this.buckets.delete(k);
    }
  }

  /** Test/introspection helper. */
  size(): number {
    return this.buckets.size;
  }
}
