import { describe, it, expect } from "vitest";
import {
  validateDisplayName,
  sanitizeDisplayName,
  playerSchema,
  historyEventSchema,
  DISPLAY_NAME_MAX,
} from "@/lib/validation";
import { canPerform, allowedActivities } from "@/config/permissions";
import { makePlayer, makeEvent } from "./helpers";

describe("security: display-name sanitization + length", () => {
  it("strips HTML/script tags", () => {
    expect(sanitizeDisplayName("<script>alert(1)</script>Minh")).toBe("alert(1)Minh");
    expect(sanitizeDisplayName("<b>An</b>")).toBe("An");
  });

  it("collapses whitespace and control chars", () => {
    expect(sanitizeDisplayName("  An   \n\t  Nhiên ")).toBe("An Nhiên");
  });

  it("rejects an empty name", () => {
    const r = validateDisplayName("   ");
    expect(r.ok).toBe(false);
  });

  it("rejects a name longer than the limit", () => {
    const r = validateDisplayName("x".repeat(DISPLAY_NAME_MAX + 5));
    expect(r.ok).toBe(false);
  });

  it("accepts and returns a clean name", () => {
    const r = validateDisplayName("  Quảng Minh  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Quảng Minh");
  });

  it("rejects profanity", () => {
    expect(validateDisplayName("shit happens").ok).toBe(false);
  });
});

describe("security: role + activity validation on the player node", () => {
  it("accepts a well-formed player", () => {
    expect(playerSchema.safeParse(makePlayer()).success).toBe(true);
  });

  it("rejects an unknown role", () => {
    const p = { ...makePlayer(), role: "HACKER" };
    expect(playerSchema.safeParse(p).success).toBe(false);
  });

  it("rejects an unknown activity", () => {
    const p = { ...makePlayer(), currentActivity: "FLYING" };
    expect(playerSchema.safeParse(p).success).toBe(false);
  });

  it("rejects an invalid direction", () => {
    const p = { ...makePlayer(), direction: "diagonal" };
    expect(playerSchema.safeParse(p).success).toBe(false);
  });

  it("rejects non-finite coordinates", () => {
    const p = { ...makePlayer(), positionX: Number.POSITIVE_INFINITY };
    expect(playerSchema.safeParse(p).success).toBe(false);
  });
});

describe("security: invalid activity requests (role permissions)", () => {
  it("a Visitor cannot ring the bell or chant", () => {
    expect(canPerform("KHACH_THAP_PHUONG", "RING_BELL")).toBe(false);
    expect(canPerform("KHACH_THAP_PHUONG", "CHANTING")).toBe(false);
  });

  it("a Senior Monk cannot ring the bell but can chant", () => {
    expect(canPerform("HOA_THUONG", "RING_BELL")).toBe(false);
    expect(canPerform("HOA_THUONG", "CHANTING")).toBe(true);
  });

  it("the Abbot can do everything", () => {
    expect(canPerform("TRU_TRI", "RING_BELL")).toBe(true);
    expect(canPerform("TRU_TRI", "WOODEN_FISH")).toBe(true);
  });

  it("allowedActivities never includes a disallowed one", () => {
    for (const a of allowedActivities("KHACH_THAP_PHUONG")) {
      expect(canPerform("KHACH_THAP_PHUONG", a)).toBe(true);
    }
  });
});

describe("security: history event payload validation", () => {
  it("accepts a valid JOIN event", () => {
    expect(historyEventSchema.safeParse(makeEvent({ eventType: "JOIN" })).success).toBe(true);
  });

  it("rejects a non-uuid event id", () => {
    expect(historyEventSchema.safeParse(makeEvent({ eventId: "not-a-uuid" })).success).toBe(false);
  });

  it("rejects an invalid event type", () => {
    const e = { ...makeEvent(), eventType: "HACK" };
    expect(historyEventSchema.safeParse(e).success).toBe(false);
  });

  it("rejects a non-ISO timestamp", () => {
    expect(historyEventSchema.safeParse(makeEvent({ timestamp: "yesterday" })).success).toBe(false);
  });

  it("allows a null activity (for JOIN/LEAVE without activity)", () => {
    expect(historyEventSchema.safeParse(makeEvent({ activity: null })).success).toBe(true);
  });
});
