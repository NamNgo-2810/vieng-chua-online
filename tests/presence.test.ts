import { describe, it, expect } from "vitest";
import {
  reconcilePlayers,
  onlineCount,
  resolveTakeover,
  PRESENCE_TTL_MS,
} from "@/lib/presence-core";
import { makePlayer } from "./helpers";

describe("multiplayer: shared visitor collection", () => {
  it("two simultaneous visitors both appear in the online collection", () => {
    const a = makePlayer({ sessionId: "a", displayName: "An" });
    const b = makePlayer({ sessionId: "b", displayName: "Bình" });
    const players = reconcilePlayers({ a, b });
    expect(Object.keys(players).sort()).toEqual(["a", "b"]);
    expect(onlineCount(players)).toBe(2);
  });

  it("supports different roles in the same scene", () => {
    const monk = makePlayer({ sessionId: "m", role: "HOA_THUONG" });
    const abbot = makePlayer({ sessionId: "t", role: "TRU_TRI" });
    const guest = makePlayer({ sessionId: "g", role: "KHACH_THAP_PHUONG" });
    const players = reconcilePlayers({ m: monk, t: abbot, g: guest });
    expect(players.m.role).toBe("HOA_THUONG");
    expect(players.t.role).toBe("TRU_TRI");
    expect(players.g.role).toBe("KHACH_THAP_PHUONG");
  });

  it("multiple players performing the same activity are all kept", () => {
    const players = reconcilePlayers({
      a: makePlayer({ sessionId: "a", currentActivity: "CHANTING" }),
      b: makePlayer({ sessionId: "b", currentActivity: "CHANTING" }),
      c: makePlayer({ sessionId: "c", currentActivity: "CHANTING" }),
    });
    expect(onlineCount(players)).toBe(3);
    expect(Object.values(players).every((p) => p.currentActivity === "CHANTING")).toBe(true);
  });

  it("reflects an activity change in the reconciled collection", () => {
    const before = reconcilePlayers({ a: makePlayer({ sessionId: "a", currentActivity: "WALKING" }) });
    expect(before.a.currentActivity).toBe("WALKING");
    const after = reconcilePlayers({ a: makePlayer({ sessionId: "a", currentActivity: "OFFER_INCENSE" }) });
    expect(after.a.currentActivity).toBe("OFFER_INCENSE");
  });
});

describe("presence: disconnection does not linger", () => {
  it("drops a player explicitly marked offline (normal departure)", () => {
    const players = reconcilePlayers({
      a: makePlayer({ sessionId: "a", isOnline: true }),
      gone: makePlayer({ sessionId: "gone", isOnline: false }),
    });
    expect(players.a).toBeDefined();
    expect(players.gone).toBeUndefined();
  });

  it("drops a stale player whose heartbeat expired (lost onDisconnect / network loss)", () => {
    const now = Date.now();
    const stale = makePlayer({
      sessionId: "stale",
      isOnline: true,
      lastActiveAt: now - PRESENCE_TTL_MS - 1000,
    });
    const fresh = makePlayer({ sessionId: "fresh", isOnline: true, lastActiveAt: now });
    const players = reconcilePlayers({ stale, fresh }, { now });
    expect(players.fresh).toBeDefined();
    expect(players.stale).toBeUndefined();
  });

  it("keeps a player who is within the heartbeat window (reconnection kept alive)", () => {
    const now = Date.now();
    const p = makePlayer({ sessionId: "p", lastActiveAt: now - 5_000 });
    const players = reconcilePlayers({ p }, { now });
    expect(players.p).toBeDefined();
  });

  it("ignores malformed nodes instead of crashing", () => {
    const players = reconcilePlayers({
      good: makePlayer({ sessionId: "good" }),
      // deliberately invalid: missing required fields / wrong types
      bad: { displayName: 123 } as never,
    });
    expect(players.good).toBeDefined();
    expect(players.bad).toBeUndefined();
  });
});

describe("presence: duplicate session (tab takeover)", () => {
  const MY = "tab-token-123";

  it("yields ownership when another tab's token is present", () => {
    expect(resolveTakeover("other-tab-token", MY)).toBe(true);
  });

  it("retains ownership for our own token", () => {
    expect(resolveTakeover(MY, MY)).toBe(false);
  });

  it("retains ownership when no token is set yet", () => {
    expect(resolveTakeover(null, MY)).toBe(false);
    expect(resolveTakeover("", MY)).toBe(false);
  });
});
