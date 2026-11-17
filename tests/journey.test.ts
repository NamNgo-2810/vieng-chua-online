import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGameStore } from "@/state/store";
import { AREA_IDS, landingFor } from "@/config/areas";
import { canStand, walkMapFor, gateAt } from "@/game/placement";
import { CLOUD, CLOUD_TEXT } from "@/config/journey";
import { emptyMerit } from "@/lib/merit-core";

const s = () => useGameStore.getState();

describe("cân đẩu vân: landing points", () => {
  it("every area has a landing point where a player can stand, outside any gate", () => {
    for (const a of AREA_IDS) {
      const l = landingFor(a);
      expect(canStand(l.x, l.y, walkMapFor(a)), a).toBe(true);
      expect(gateAt(a, l.x, l.y), a).toBeNull();
    }
  });
});

describe("cân đẩu vân through the store (offline)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    await s().leave();
    vi.useRealTimers();
  });

  it("refuses to fly below the merit it needs, and says why", async () => {
    await s().enterTemple("Lan", "KHACH_THAP_PHUONG");
    useGameStore.setState({ templeMerit: 100, merit: { ...emptyMerit(), total: CLOUD.minMerit - 1 } });
    expect(await s().flyTo("HOA_QUA_SON")).toBe(false);
    expect(s().notice?.text).toBe(CLOUD_TEXT.locked(CLOUD.minMerit));
    expect(s().localPlayer?.area).toBe("TAM_QUAN");
  });

  it("flies from the front gate straight to Hoa Quả Sơn and lands at its landing point", async () => {
    await s().enterTemple("Lan", "KHACH_THAP_PHUONG");
    useGameStore.setState({ templeMerit: 100, merit: { ...emptyMerit(), total: CLOUD.minMerit } });
    expect(await s().flyTo("HOA_QUA_SON")).toBe(true);
    const land = landingFor("HOA_QUA_SON");
    expect(s().localPlayer).toMatchObject({ area: "HOA_QUA_SON", positionX: land.x, positionY: land.y });
    expect(s().flight).not.toBeNull();
  });

  it("walking still needs a gate between neighbouring areas", async () => {
    await s().enterTemple("Lan", "KHACH_THAP_PHUONG");
    useGameStore.setState({ templeMerit: 100 });
    expect(await s().enterArea("HOA_QUA_SON")).toBe(false);
  });
});
