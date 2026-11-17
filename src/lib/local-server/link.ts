"use client";

/**
 * The browser's connection to the local temple server (backend mode "local"):
 * actions go out as POSTs to /api/local/action, and live updates arrive on one
 * EventSource from /api/local/stream. Presence, chat and merit share one link.
 *
 * The last value of each event is remembered, so a backend that subscribes
 * after the stream opened still gets the current state right away.
 */

const SECRET_KEY = "chua-online:local-secret";

/** A private per-browser secret (merit is saved under its hash on the server). */
function browserSecret(): string {
  const fresh = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `${crypto.randomUUID()}-${crypto.randomUUID()}`
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  try {
    const existing = window.localStorage.getItem(SECRET_KEY);
    if (existing && existing.length >= 16) return existing;
    const s = fresh();
    window.localStorage.setItem(SECRET_KEY, s);
    return s;
  } catch {
    return fresh(); // storage blocked: merit lasts this visit only
  }
}

type Handler = (data: unknown) => void;
type Status = "connecting" | "online" | "reconnecting";

export class LocalLink {
  sessionId: string | null = null;
  private token: string | null = null;
  private source: EventSource | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private latest = new Map<string, unknown>();
  private statusHandlers = new Set<(s: Status) => void>();

  /** Start a visit (POST hello). Resolves with the public session id. */
  async hello(): Promise<string> {
    const r = await this.post<{ sessionId: string; token: string }>("hello", { secret: browserSecret() }, false);
    this.sessionId = r.sessionId;
    this.token = r.token;
    return r.sessionId;
  }

  /** POST an action; resolves with the result or throws with the server's error. */
  async post<T = object>(type: string, fields: Record<string, unknown> = {}, authed = true): Promise<T> {
    const body = authed ? { type, sessionId: this.sessionId, token: this.token, ...fields } : { type, ...fields };
    const res = await fetch("/api/local/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: type === "leave",
    });
    const json = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as { ok: boolean; error?: string } & T;
    if (!json.ok) throw new Error(json.error ?? "request failed");
    return json;
  }

  /**
   * Tell the server this visit is over even while the page is closing
   * (sendBeacon survives unload; a normal fetch may be cut off).
   */
  beaconLeave() {
    if (!this.sessionId || !this.token || typeof navigator === "undefined" || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon("/api/local/action", JSON.stringify({ type: "leave", sessionId: this.sessionId, token: this.token }));
    } catch {
      // the stream closing still removes the visit after the grace period
    }
  }

  /** Same as post but never throws (for fire-and-forget updates like movement). */
  async tryPost(type: string, fields: Record<string, unknown> = {}): Promise<boolean> {
    try {
      await this.post(type, fields);
      return true;
    } catch {
      return false;
    }
  }

  /** Open the event stream (after hello + join). */
  open() {
    if (this.source || !this.sessionId || !this.token) return;
    const q = new URLSearchParams({ sessionId: this.sessionId, token: this.token });
    const es = new EventSource(`/api/local/stream?${q}`);
    this.source = es;
    this.setStatus("connecting");
    es.onopen = () => this.setStatus("online");
    es.onerror = () => this.setStatus("reconnecting"); // EventSource retries by itself
    for (const event of ["players", "chat", "chatHistory", "temple", "merit", "note", "notesHistory", "takenOver", "gone"]) {
      es.addEventListener(event, (e) => {
        let data: unknown = null;
        try {
          data = JSON.parse((e as MessageEvent).data);
        } catch {
          return;
        }
        if (event === "gone") this.close(); // the server no longer knows this visit
        this.latest.set(event, data);
        for (const h of this.handlers.get(event) ?? []) h(data);
      });
    }
  }

  /** Subscribe to a server event; replays its latest value if there is one. */
  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    if (this.latest.has(event) && event !== "chat" && event !== "note") handler(this.latest.get(event));
    return () => this.handlers.get(event)?.delete(handler);
  }

  onStatus(handler: (s: Status) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private setStatus(s: Status) {
    for (const h of this.statusHandlers) h(s);
  }

  close() {
    this.source?.close();
    this.source = null;
  }
}
