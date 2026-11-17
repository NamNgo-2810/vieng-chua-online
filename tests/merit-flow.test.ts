import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGameStore } from "@/state/store";
import { SPOTS_BY_ID } from "@/config/ritual-spots";
import { MERIT } from "@/config/merit";

/** Offline mode (no Firebase env in tests): LocalPresence + LocalMerit. */
async function enterAtBurner() {
  const s = useGameStore.getState();
  await s.enterTemple("Minh", "TRU_TRI");
  await useGameStore.getState().enterArea("COURTYARD"); // arrive at the Tam quan, walk in
  const b = SPOTS_BY_ID.BURNER;
  useGameStore.getState().move(b.standX, b.standY, "up");
}

describe("merit flow (store, offline)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    await useGameStore.getState().leave();
    vi.useRealTimers();
  });

  it("awards merit after holding a ritual for ritualMs", async () => {
    await enterAtBurner();
    await useGameStore.getState().changeActivity("OFFER_INCENSE");
    expect(useGameStore.getState().merit.total).toBe(0);

    await vi.advanceTimersByTimeAsync(MERIT.ritualMs + 500);

    const { merit, templeMerit, meritPulse } = useGameStore.getState();
    expect(merit.total).toBe(MERIT.values.OFFER_INCENSE + 1); // + first-of-day streak bonus
    expect(merit.streak.count).toBe(1);
    expect(templeMerit).toBe(merit.total);
    expect(meritPulse?.amount).toBe(merit.total);
  });

  it("awards nothing when the player walks off before ritualMs", async () => {
    await enterAtBurner();
    await useGameStore.getState().changeActivity("OFFER_INCENSE");
    await vi.advanceTimersByTimeAsync(MERIT.ritualMs / 2);
    await useGameStore.getState().changeActivity("WALKING");
    await vi.advanceTimersByTimeAsync(MERIT.ritualMs * 2);
    expect(useGameStore.getState().merit.total).toBe(0);
  });

  it("does not award the same ritual again inside its cooldown, and says why", async () => {
    await enterAtBurner();
    await useGameStore.getState().changeActivity("OFFER_INCENSE");
    await vi.advanceTimersByTimeAsync(MERIT.ritualMs + 500);
    const after1 = useGameStore.getState().merit.total;

    await useGameStore.getState().changeActivity("WALKING");
    await useGameStore.getState().changeActivity("OFFER_INCENSE");
    await vi.advanceTimersByTimeAsync(MERIT.ritualMs + 500);

    expect(useGameStore.getState().merit.total).toBe(after1);
    expect(useGameStore.getState().meritNote).toMatch(/vừa được ghi công đức/);
  });

  it("clears merit state on leave", async () => {
    await enterAtBurner();
    await useGameStore.getState().changeActivity("OFFER_INCENSE");
    await vi.advanceTimersByTimeAsync(MERIT.ritualMs + 500);
    await useGameStore.getState().leave();
    expect(useGameStore.getState().merit.total).toBe(0);
    expect(useGameStore.getState().templeMerit).toBe(0);
  });
});
