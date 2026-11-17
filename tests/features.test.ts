import { describe, it, expect } from "vitest";
import { prepareNote, parseNote, addNote, emptyNotes, type Note } from "@/lib/notes-core";
import { NOTES, NOTE_ACTIVITY } from "@/config/notes";
import { SUTRA_VERSES, FORTUNES, pick } from "@/config/verses";
import { EMOTES, EMOTE_IDS, isEmoteId } from "@/config/emotes";
import { phaseAt, lightingFor, vnHour, debugHour, INDOOR } from "@/lib/daytime";
import { ACTIVITY_IDS } from "@/config/activities";
import { spotOffering } from "@/game/placement";

const note = (id: string, createdAt: number, kind: Note["kind"] = "guestbook"): Note => ({
  id, kind, sessionId: "s", displayName: "Lan", text: "an yên", createdAt,
});

describe("notes: guestbook and wishes", () => {
  it("cleans and masks what a player wrote", () => {
    expect(prepareNote("  <b>an</b>  yên ", null, 0)).toEqual({ ok: true, text: "an yên" });
    expect(prepareNote("shit happens", null, 0)).toEqual({ ok: true, text: "**** happens" });
  });

  it("refuses an empty or too-long note", () => {
    expect(prepareNote("   ", null, 0).ok).toBe(false);
    expect(prepareNote("a".repeat(NOTES.maxLength + 1), null, 0).ok).toBe(false);
  });

  it("allows one note per kind per gap", () => {
    expect(prepareNote("hi", 1000, 1000 + NOTES.minGapMs - 1).ok).toBe(false);
    expect(prepareNote("hi", 1000, 1000 + NOTES.minGapMs).ok).toBe(true);
  });

  it("validates notes from the network and re-masks them", () => {
    expect(parseNote("n1", "wish", { sessionId: "s", displayName: "A", text: "shit", createdAt: 1 })?.text).toBe("****");
    expect(parseNote("n1", "wish", { text: "x" })).toBeNull();
  });

  it("keeps each kind separate, ordered and capped", () => {
    let n = emptyNotes();
    for (let i = 0; i < NOTES.keep + 5; i++) n = addNote(n, note(`g${i}`, i));
    n = addNote(n, note("w1", 1, "wish"));
    expect(n.guestbook).toHaveLength(NOTES.keep);
    expect(n.guestbook[0].id).toBe("g5");
    expect(n.wish.map((x) => x.id)).toEqual(["w1"]);
    expect(addNote(n, note("w1", 1, "wish"))).toBe(n); // duplicate ignored
  });

  it("each note ritual has a place", () => {
    for (const a of Object.keys(NOTE_ACTIVITY)) expect(spotOffering(a as never), a).not.toBeNull();
  });
});

describe("verses: sutra reading and fortune sticks", () => {
  it("has enough to not repeat at once, all short enough to read", () => {
    expect(SUTRA_VERSES.length).toBeGreaterThanOrEqual(12);
    expect(FORTUNES.length).toBeGreaterThanOrEqual(10);
    for (const v of [...SUTRA_VERSES.map((x) => x.text), ...FORTUNES.map((x) => x.text)]) expect(v.length).toBeLessThanOrEqual(140);
  });

  it("picks within the list for any random value", () => {
    expect(pick(SUTRA_VERSES, () => 0)).toBe(SUTRA_VERSES[0]);
    expect(pick(SUTRA_VERSES, () => 0.999999)).toBe(SUTRA_VERSES[SUTRA_VERSES.length - 1]);
  });
});

describe("emotes", () => {
  it("each greeting has its own key", () => {
    const keys = EMOTE_IDS.map((e) => EMOTES[e].key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("recognises known greetings only", () => {
    expect(isEmoteId("VAI")).toBe(true);
    expect(isEmoteId("DANCE")).toBe(false);
  });
});

describe("day and night (Vietnam time)", () => {
  it("reads the hour in Vietnam, not UTC", () => {
    expect(vnHour(Date.UTC(2026, 10, 16, 13, 30))).toBeCloseTo(20.5); // 13:30 UTC = 20:30 in Vietnam
  });

  it("splits the day into phases", () => {
    expect(phaseAt(4.9)).toBe("night");
    expect(phaseAt(6)).toBe("dawn");
    expect(phaseAt(12)).toBe("day");
    expect(phaseAt(18)).toBe("dusk");
    expect(phaseAt(22)).toBe("night");
  });

  it("darkens outdoors at night more than indoors, and lights the lamps", () => {
    expect(lightingFor("COURTYARD", "night").alpha).toBeGreaterThan(lightingFor("MAIN_HALL", "night").alpha);
    expect(lightingFor("COURTYARD", "night").lightsOn).toBe(true);
    expect(lightingFor("COURTYARD", "day").alpha).toBe(0);
    expect(INDOOR).toContain("SUTRA_LIBRARY");
  });

  it("reads the testing aid only when valid", () => {
    expect(debugHour("?debugHour=21")).toBe(21);
    expect(debugHour("?debugHour=99")).toBeNull();
    expect(debugHour("")).toBeNull();
  });
});

describe("new rituals all have a place", () => {
  it("every activity except walking can be done somewhere", () => {
    for (const a of ACTIVITY_IDS) if (a !== "WALKING") expect(spotOffering(a), a).not.toBeNull();
  });
});
