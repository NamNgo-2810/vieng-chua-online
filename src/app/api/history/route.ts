import { NextResponse } from "next/server";
import { historyEventSchema } from "@/lib/validation";
import { recordHistory } from "@/lib/sheets";
import { RateLimiter } from "@/lib/rate-limit";

// This route needs the Node runtime (googleapis uses Node APIs).
export const runtime = "nodejs";

// Per-session rate limit: burst of 20, refilling 2/sec. A normal session emits
// one JOIN, a handful of ACTIVITY_CHANGE events, and one LEAVE, so this never
// trips for real use but blocks a client spamming the endpoint.
const limiter = new RateLimiter({ capacity: 20, refillPerSec: 2 });

/**
 * POST /api/history — records a visitor history event to Google Sheets.
 *
 * Security: requires a shared secret (header `x-history-secret` or `secret` in
 * the body for sendBeacon). Validates + sanitizes the payload server-side.
 * Always returns 200 for well-formed requests so the client never blocks on
 * Sheets being down (history is best-effort).
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const expected = process.env.HISTORY_API_SECRET ?? "";
  const headerSecret = req.headers.get("x-history-secret") ?? "";
  const bodySecret =
    typeof json === "object" && json !== null && "secret" in json
      ? String((json as Record<string, unknown>).secret ?? "")
      : "";
  const provided = headerSecret || bodySecret;

  // If a secret is configured, require it. If not configured (local dev),
  // allow through but the Sheets writer will no-op without credentials.
  if (expected && provided !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = historyEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "invalid payload" },
      { status: 400 }
    );
  }

  // Rate-limit per session so a client cannot flood the Sheets backend.
  if (!limiter.allow(parsed.data.sessionId)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  // Record (best-effort). Swallow Sheets failures so gameplay is never blocked.
  const written = await recordHistory(parsed.data).catch((err) => {
    console.error("[history] unexpected error:", err);
    return false;
  });

  return NextResponse.json({ ok: true, written });
}
