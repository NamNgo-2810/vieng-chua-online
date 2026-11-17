import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGameStore } from "@/state/store";
import { SPOTS_BY_ID, type SpotId } from "@/config/ritual-spots";
import { MILESTONES } from "@/config/milestones";
import { SUTRA_VERSES } from "@/config/verses";
import { PURITY_TEXT } from "@/config/purity";

/** Offline mode (no Firebase env in tests). */
const s = () => useGameStore.getState();
const standAt = (id: SpotId) => s().move(SPOTS_BY_ID[id].standX, SPOTS_BY_ID[id].standY, "up");

/** At the Tam quan: leave the sandals, then wash hands and feet. */
async function purify() {
  standAt("SHOE_RACK");
  await s().changeActivity("REMOVE_SHOES");
  standAt("WASH_BASIN");
  await s().changeActivity("WASH_HANDS_FEET");
}

describe("new features through the store (offline)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    await s().leave();
    vi.useRealTimers();
  });

  it("signing the guestbook opens the writing box and saves the note", async () => {
    await s().enterTemple("Lan", "KHACH_THAP_PHUONG"); // arrives at the Tam quan
    standAt("GUESTBOOK");
    await s().changeActivity("SIGN_GUESTBOOK");
    expect(s().composer).toBe("guestbook");

    expect(await s().addNote("guestbook", "Lần đầu ghé chùa, an yên.")).toBeNull();
    expect(s().composer).toBeNull();
    expect(s().notes.guestbook.map((n) => n.text)).toEqual(["Lần đầu ghé chùa, an yên."]);
    expect(await s().addNote("guestbook", "lần nữa")).toMatch(/Mỗi người ghi một lần/);
  });

  it("reading a sutra in the library reveals a verse", async () => {
    await s().enterTemple("Minh", "HOA_THUONG");
    useGameStore.setState({ templeMerit: MILESTONES.find((m) => m.id === "SUTRA_LIBRARY")!.threshold });
    await purify();
    expect(await s().enterArea("COURTYARD")).toBe(true);
    expect(await s().enterArea("MAIN_HALL")).toBe(true);
    expect(await s().enterArea("SUTRA_LIBRARY")).toBe(true);
    standAt("READING_DESK");
    await s().changeActivity("READ_SUTRA");
    expect(SUTRA_VERSES.map((v) => v.text)).toContain(s().reveal?.text);
    s().closeReveal();
    expect(s().reveal).toBeNull();
  });

  it("greeting shows on the player, and not twice too quickly", async () => {
    await s().enterTemple("Minh", "HOA_THUONG");
    await s().greet("VAI");
    expect(s().localPlayer?.emote).toBe("VAI");
    await s().greet("VAY_TAY");
    expect(s().localPlayer?.emote).toBe("VAI"); // too soon
    vi.advanceTimersByTime(1600);
    await s().greet("VAY_TAY");
    expect(s().localPlayer?.emote).toBe("VAY_TAY");
  });

  it("visitors arrive at the Tam quan and are welcomed with what to do", async () => {
    await s().enterTemple("Lan", "KHACH_THAP_PHUONG");
    expect(s().localPlayer?.area).toBe("TAM_QUAN");
    expect(s().notice?.text).toBe(PURITY_TEXT.welcome);
  });

  it("the main hall stays shut until sandals are off and hands/feet washed, and says why", async () => {
    await s().enterTemple("Lan", "KHACH_THAP_PHUONG");
    useGameStore.setState({ templeMerit: 100 });
    await s().enterArea("COURTYARD");
    expect(await s().enterArea("MAIN_HALL")).toBe(false);
    expect(s().notice?.text).toBe(PURITY_TEXT.needed);

    await s().enterArea("TAM_QUAN");
    await purify();
    expect(s().localPlayer).toMatchObject({ shoesOff: true, washed: true });
    expect(s().notice?.text).toBe(PURITY_TEXT.done);
    await s().enterArea("COURTYARD");
    expect(await s().enterArea("MAIN_HALL")).toBe(true);
  });

  it("bathing the Buddha happens at its basin before the main hall", async () => {
    await s().enterTemple("Lan", "KHACH_THAP_PHUONG");
    await s().enterArea("COURTYARD");
    standAt("BATHE_BUDDHA");
    await s().changeActivity("BATHE_BUDDHA");
    expect(s().localPlayer?.currentActivity).toBe("BATHE_BUDDHA");
  });
});
