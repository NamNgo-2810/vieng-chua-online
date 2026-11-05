import { describe, it, expect, vi } from "vitest";
import { EventDedup, recordWithDedup } from "@/lib/history-core";
import { RateLimiter } from "@/lib/rate-limit";
import { makeEvent } from "./helpers";

describe("history: idempotency / duplicate writes", () => {
  it("writes a new event exactly once", async () => {
    const dedup = new EventDedup();
    const writer = vi.fn().mockResolvedValue(undefined);
    const ev = makeEvent();
    const r = await recordWithDedup(ev, dedup, writer);
    expect(r.written).toBe(true);
    expect(writer).toHaveBeenCalledTimes(1);
  });

  it("drops a duplicate event id (idempotent)", async () => {
    const dedup = new EventDedup();
    const writer = vi.fn().mockResolvedValue(undefined);
    const ev = makeEvent({ eventId: "11111111-1111-4111-8111-111111111111" });
    await recordWithDedup(ev, dedup, writer);
    const second = await recordWithDedup(ev, dedup, writer);
    expect(second.written).toBe(false);
    expect(second.reason).toBe("duplicate");
    expect(writer).toHaveBeenCalledTimes(1); // not written twice
  });

  it("different event ids are written independently", async () => {
    const dedup = new EventDedup();
    const writer = vi.fn().mockResolvedValue(undefined);
    await recordWithDedup(makeEvent(), dedup, writer);
    await recordWithDedup(makeEvent(), dedup, writer);
    expect(writer).toHaveBeenCalledTimes(2);
  });

  it("bounds the dedup set size", () => {
    const dedup = new EventDedup(3);
    for (let i = 0; i < 10; i++) dedup.claim(`id-${i}`);
    expect(dedup.count).toBeLessThanOrEqual(3);
  });
});

describe("history: Google Sheets failure does not block, and allows retry", () => {
  it("returns written:false on writer failure without throwing", async () => {
    const dedup = new EventDedup();
    const writer = vi.fn().mockRejectedValue(new Error("Sheets API 503"));
    const ev = makeEvent();
    const r = await recordWithDedup(ev, dedup, writer);
    expect(r.written).toBe(false);
    expect(r.reason).toBe("writer-failed");
  });

  it("releases the event id after a failure so a retry can succeed", async () => {
    const dedup = new EventDedup();
    const ev = makeEvent({ eventId: "22222222-2222-4222-8222-222222222222" });

    const failing = vi.fn().mockRejectedValue(new Error("down"));
    const first = await recordWithDedup(ev, dedup, failing);
    expect(first.written).toBe(false);
    expect(dedup.has(ev.eventId)).toBe(false); // released

    const ok = vi.fn().mockResolvedValue(undefined);
    const retry = await recordWithDedup(ev, dedup, ok);
    expect(retry.written).toBe(true);
    expect(ok).toHaveBeenCalledTimes(1);
  });
});

describe("security: per-session rate limiting", () => {
  it("allows a normal burst then blocks a flood", () => {
    let t = 0;
    const rl = new RateLimiter({ capacity: 5, refillPerSec: 1, now: () => t });
    const key = "sess-x";
    // 5 allowed from the full bucket.
    for (let i = 0; i < 5; i++) expect(rl.allow(key)).toBe(true);
    // 6th is blocked (bucket empty, no time passed).
    expect(rl.allow(key)).toBe(false);
  });

  it("refills over time", () => {
    let t = 0;
    const rl = new RateLimiter({ capacity: 2, refillPerSec: 1, now: () => t });
    expect(rl.allow("k")).toBe(true);
    expect(rl.allow("k")).toBe(true);
    expect(rl.allow("k")).toBe(false);
    t += 1000; // one second -> +1 token
    expect(rl.allow("k")).toBe(true);
  });

  it("limits are per-key (per session)", () => {
    let t = 0;
    const rl = new RateLimiter({ capacity: 1, refillPerSec: 1, now: () => t });
    expect(rl.allow("a")).toBe(true);
    expect(rl.allow("a")).toBe(false);
    expect(rl.allow("b")).toBe(true); // different session unaffected
  });
});
