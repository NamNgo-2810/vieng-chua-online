import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeEvent } from "./helpers";

/**
 * Exercises the /api/history route handler directly. The Sheets writer is
 * mocked so no real credentials are needed and we can assert the route's
 * contract: reject bad JSON / invalid payloads, enforce the shared secret,
 * rate-limit floods, and always return 200 for valid events (history is
 * best-effort and must never block gameplay).
 */

// Mock the Sheets writer so the route never touches Google.
vi.mock("@/lib/sheets", () => ({
  recordHistory: vi.fn().mockResolvedValue(true),
  isSheetsConfigured: () => false,
}));

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function load() {
  // Re-import fresh each time so the route's module-level rate limiter resets.
  vi.resetModules();
  delete process.env.HISTORY_API_SECRET;
  const mod = await import("@/app/api/history/route");
  return mod.POST;
}

describe("POST /api/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects malformed JSON with 400", async () => {
    const POST = await load();
    const res = await POST(req("{not json"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid payload with 400", async () => {
    const POST = await load();
    const res = await POST(req({ foo: "bar" }));
    expect(res.status).toBe(400);
  });

  it("accepts a valid event with 200", async () => {
    const POST = await load();
    const res = await POST(req(makeEvent({ sessionId: "ok-1" })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("enforces the shared secret when configured (401 on mismatch)", async () => {
    vi.resetModules();
    process.env.HISTORY_API_SECRET = "s3cret";
    const { POST } = await import("@/app/api/history/route");
    const res = await POST(req(makeEvent({ sessionId: "sec-1" }), { "x-history-secret": "wrong" }));
    expect(res.status).toBe(401);
    delete process.env.HISTORY_API_SECRET;
  });

  it("rate-limits a flood from one session with 429", async () => {
    const POST = await load();
    const sessionId = "flooder";
    let got429 = false;
    // Burst well beyond the capacity (20) to trip the limiter.
    for (let i = 0; i < 30; i++) {
      const res = await POST(req(makeEvent({ sessionId })));
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });
});
