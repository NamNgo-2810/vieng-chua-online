import { describe, it, expect } from "vitest";
import { ROLE_IDS, ENABLED_ROLE_IDS, DEFAULT_ROLE, withRolePrefix } from "@/config/roles";
import { allowedActivities } from "@/config/permissions";
import { isActivityEnabled } from "@/config/activities";
import { appearancesForRole } from "@/config/appearances";

describe("roles: availability", () => {
  it("offers all three roles at join", () => {
    expect([...ENABLED_ROLE_IDS].sort()).toEqual([...ROLE_IDS].sort());
  });

  it("keeps the Senior Monk as the default role", () => {
    expect(DEFAULT_ROLE).toBe("HOA_THUONG");
  });

  it("gives every enabled role at least one activity button", () => {
    for (const role of ENABLED_ROLE_IDS) {
      const buttons = allowedActivities(role).filter(isActivityEnabled);
      expect(buttons.length, role).toBeGreaterThan(0);
    }
  });

  it("gives every enabled role its own look", () => {
    for (const role of ENABLED_ROLE_IDS) expect(appearancesForRole(role).length, role).toBeGreaterThan(0);
  });

  it("gives the Visitor lay rituals but no chanting, wooden fish or bell", () => {
    const buttons = allowedActivities("KHACH_THAP_PHUONG").filter(isActivityEnabled);
    expect(buttons).toEqual(expect.arrayContaining(["OFFER_INCENSE", "OFFERING", "MEDITATION", "PRAYING", "LISTENING"]));
    for (const clergy of ["CHANTING", "WOODEN_FISH", "RING_BELL"] as const) expect(buttons).not.toContain(clergy);
  });

  it("reserves the bell for the Abbot", () => {
    expect(allowedActivities("TRU_TRI")).toContain("RING_BELL");
    expect(allowedActivities("HOA_THUONG")).not.toContain("RING_BELL");
  });

  it("prefixes monk names with Thích but not visitor names", () => {
    expect(withRolePrefix("TRU_TRI", "Tâm")).toBe("Thích Tâm");
    expect(withRolePrefix("KHACH_THAP_PHUONG", "Lan")).toBe("Lan");
  });
});
