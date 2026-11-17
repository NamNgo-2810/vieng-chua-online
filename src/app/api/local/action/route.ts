import { NextResponse } from "next/server";
import { getHub, localModeEnabled } from "@/server/hub-instance";
import { RateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Movement sends ~8 updates a second; this allows that with room to spare and
// stops a client hammering the server. Hello is limited per IP.
const perSession = new RateLimiter({ capacity: 60, refillPerSec: 25 });
// Friends behind one router (or without a proxy header) share this bucket.
const perIp = new RateLimiter({ capacity: 30, refillPerSec: 2 });

/**
 * POST /api/local/action — every change a player makes in local mode:
 * { type: "hello" | "join" | "move" | "activity" | "area" | "chat" | "award" | "note" | "emote" | "leave",
 *   sessionId, token, ...fields }. The hub validates everything.
 */
export async function POST(req: Request) {
  if (!localModeEnabled()) return NextResponse.json({ ok: false, error: "local mode is off" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const hub = getHub();
  const { type, sessionId, token } = body;

  if (type === "hello") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!perIp.allow(ip)) return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
    return NextResponse.json(hub.hello(body.secret));
  }
  if (typeof sessionId !== "string" || !perSession.allow(sessionId)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  switch (type) {
    case "join": return NextResponse.json(hub.join(sessionId, token, body));
    case "move": return NextResponse.json(hub.move(sessionId, token, body));
    case "activity": return NextResponse.json(hub.activity(sessionId, token, body));
    case "area": return NextResponse.json(hub.area(sessionId, token, body));
    case "chat": return NextResponse.json(hub.sendChat(sessionId, token, body));
    case "award": return NextResponse.json(hub.award(sessionId, token, body));
    case "note": return NextResponse.json(hub.note(sessionId, token, body));
    case "emote": return NextResponse.json(hub.emote(sessionId, token, body));
    case "leave": return NextResponse.json(hub.leave(sessionId, token));
    default: return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }
}
