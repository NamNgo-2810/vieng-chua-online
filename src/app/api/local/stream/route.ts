import { getHub, localModeEnabled } from "@/server/hub-instance";
import type { Client } from "@/server/local-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A closed tab is only noticed when the server next writes to it, so ping often:
// a vanished visitor (crash, lost Wi-Fi) disappears within ping + grace time.
const PING_MS = 5_000;

/**
 * GET /api/local/stream?sessionId=…&token=… — Server-Sent Events: the current
 * temple on connect, then live `players`, `chat`, `temple`, `merit` events.
 * An unknown visit gets one `gone` event (the browser then stops reconnecting).
 */
export async function GET(req: Request) {
  if (!localModeEnabled()) return new Response("local mode is off", { status: 404 });
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const hub = getHub();
  const encoder = new TextEncoder();
  let client: Client | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (ping) clearInterval(ping);
    ping = null;
    if (client) hub.disconnect(client);
    client = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const c: Client = { sessionId, send };
      if (!hub.connect(sessionId, token, c)) {
        send("gone", { error: "unknown visit" });
        controller.close();
        return;
      }
      client = c;
      ping = setInterval(() => write(": ping\n\n"), PING_MS);
      req.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel: stop,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps compression from buffering the stream.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
