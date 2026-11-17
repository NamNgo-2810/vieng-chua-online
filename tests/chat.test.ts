import { describe, it, expect, vi, afterEach } from "vitest";
import { LocalChat } from "@/lib/local-chat";
import {
  sanitizeChatText,
  maskProfanity,
  prepareOutgoing,
  parseIncoming,
  appendHistory,
  bubbleVisible,
  type ChatMessage,
} from "@/lib/chat-core";
import { CHAT } from "@/config/chat";

const msg = (id: string, createdAt: number, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id, sessionId: "s1", displayName: "Lan", text: "chào", createdAt, ...over,
});

describe("chat: cleaning", () => {
  it("strips tags and collapses whitespace", () => {
    expect(sanitizeChatText("  <b>chào</b>\n\n  bạn ")).toBe("chào bạn");
  });

  it("masks banned words keeping their length, any case", () => {
    expect(maskProfanity("oh SHIT no")).toBe("oh **** no");
  });

  it("leaves Vietnamese text untouched", () => {
    expect(maskProfanity("Nam mô A Di Đà Phật")).toBe("Nam mô A Di Đà Phật");
  });
});

describe("chat: prepareOutgoing", () => {
  it("accepts a normal message", () => {
    expect(prepareOutgoing("chào mọi người", null, 1000)).toEqual({ ok: true, text: "chào mọi người" });
  });

  it("rejects an empty or whitespace-only message", () => {
    expect(prepareOutgoing("   ", null, 1000).ok).toBe(false);
  });

  it("rejects a message over the length limit", () => {
    expect(prepareOutgoing("a".repeat(CHAT.maxLength + 1), null, 1000).ok).toBe(false);
  });

  it("accepts a message exactly at the length limit", () => {
    expect(prepareOutgoing("a".repeat(CHAT.maxLength), null, 1000).ok).toBe(true);
  });

  it("rejects a message sent too soon after the last one", () => {
    expect(prepareOutgoing("hi", 1000, 1000 + CHAT.minGapMs - 1).ok).toBe(false);
  });

  it("accepts a message once the gap has passed", () => {
    expect(prepareOutgoing("hi", 1000, 1000 + CHAT.minGapMs).ok).toBe(true);
  });

  it("sends the masked text, not the raw one", () => {
    const r = prepareOutgoing("bitch please", null, 0);
    expect(r).toEqual({ ok: true, text: "***** please" });
  });
});

describe("chat: parseIncoming", () => {
  it("accepts a valid node", () => {
    const m = parseIncoming("k1", { sessionId: "s1", displayName: "Lan", text: "chào", createdAt: 5 });
    expect(m).toEqual({ id: "k1", sessionId: "s1", displayName: "Lan", text: "chào", createdAt: 5 });
  });

  it("rejects a node with missing fields", () => {
    expect(parseIncoming("k1", { text: "chào" })).toBeNull();
  });

  it("re-masks text from a client that skipped its own filter", () => {
    const m = parseIncoming("k1", { sessionId: "s1", displayName: "X", text: "shit", createdAt: 5 });
    expect(m?.text).toBe("****");
  });

  it("strips tags from incoming text", () => {
    const m = parseIncoming("k1", { sessionId: "s1", displayName: "X", text: "<img src=x>hi", createdAt: 5 });
    expect(m?.text).toBe("hi");
  });
});

describe("chat: history", () => {
  it("keeps messages in time order", () => {
    const h = appendHistory(appendHistory([], msg("b", 20)), msg("a", 10));
    expect(h.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("ignores a duplicate id", () => {
    const h = appendHistory([msg("a", 10)], msg("a", 10));
    expect(h).toHaveLength(1);
  });

  it("caps the history at its size, dropping the oldest", () => {
    let h: ChatMessage[] = [];
    for (let i = 0; i < 5; i++) h = appendHistory(h, msg(`m${i}`, i), 3);
    expect(h.map((m) => m.id)).toEqual(["m2", "m3", "m4"]);
  });
});

describe("chat: bubbles", () => {
  it("shows a fresh message and hides it after the bubble time", () => {
    const m = msg("a", 1000);
    expect(bubbleVisible(m, 1000 + CHAT.bubbleMs - 1)).toBe(true);
    expect(bubbleVisible(m, 1000 + CHAT.bubbleMs)).toBe(false);
  });
});


describe("chat: offline backend", () => {
  afterEach(() => vi.useRealTimers());

  it("echoes your own message back with your session id", async () => {
    const got: ChatMessage[] = [];
    const c = new LocalChat({ onMessage: (m) => got.push(m) });
    await c.send("me", "Minh", "chào");
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ sessionId: "me", displayName: "Minh", text: "chào" });
    c.dispose();
  });

  it("has the demo visitor greet once after starting", () => {
    vi.useFakeTimers();
    const got: ChatMessage[] = [];
    const c = new LocalChat({ onMessage: (m) => got.push(m) });
    c.start();
    expect(got).toHaveLength(0);
    vi.advanceTimersByTime(5000);
    expect(got).toHaveLength(1);
    expect(got[0].sessionId).toBe("demo-visitor");
    c.dispose();
  });

  it("does not greet after being disposed", () => {
    vi.useFakeTimers();
    const got: ChatMessage[] = [];
    const c = new LocalChat({ onMessage: (m) => got.push(m) });
    c.start();
    c.dispose();
    vi.advanceTimersByTime(5000);
    expect(got).toHaveLength(0);
  });
});
