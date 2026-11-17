import { describe, it, expect } from "vitest";
import { ACTIVITY_IDS } from "@/config/activities";
import { AREA_IDS } from "@/config/areas";
import { ACTIVITY_CUES, AREA_AMBIENCE, EVENT_SOUNDS } from "@/config/sound-design";
import { activityAudio } from "@/config/activity-audio";
import { singingBowl, handBell, teaPour, waterPlop, chime, whoosh, pop, birdCall, noiseBed } from "@/lib/sound-library";
import { Ambience } from "@/lib/ambience";

describe("sound design: rituals", () => {
  it("every ritual makes a sound (a start cue or lasting audio)", () => {
    for (const a of ACTIVITY_IDS) {
      if (a === "WALKING") continue;
      expect(ACTIVITY_CUES[a] !== null || activityAudio(a) !== null, a).toBe(true);
    }
  });

  it("no ritual's sound is doubled (a cue on top of lasting audio)", () => {
    for (const a of ACTIVITY_IDS) {
      if (activityAudio(a)) expect(ACTIVITY_CUES[a], a).toBeNull();
    }
  });

  it("walking is silent", () => {
    expect(ACTIVITY_CUES.WALKING).toBeNull();
    expect(activityAudio("WALKING")).toBeNull();
  });
});

describe("sound design: places", () => {
  it("every area has an ambience entry", () => {
    for (const a of AREA_IDS) expect(AREA_AMBIENCE[a], a).toBeDefined();
  });

  it("the indoor halls carry no outdoor sounds", () => {
    for (const a of ["MAIN_HALL", "ANCESTOR_HALL"] as const) expect(AREA_AMBIENCE[a]).toEqual({});
  });

  it("water areas sound like water", () => {
    expect(AREA_AMBIENCE.LOTUS_GARDEN.water).toBeGreaterThan(0);
    expect(AREA_AMBIENCE.BAMBOO_GROVE.stream).toBeGreaterThan(0);
  });

  it("event chimes rise in pitch", () => {
    for (const notes of [EVENT_SOUNDS.merit, EVENT_SOUNDS.unlock]) {
      for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1]);
    }
  });
});

describe("sound library: safe without Web Audio (server, tests)", () => {
  it("every sound is a quiet no-op", () => {
    const calls = [
      () => singingBowl(1), () => handBell(1), () => teaPour(1), () => waterPlop(1),
      () => chime(1, [440, 880]), () => whoosh(1), () => pop(1), () => birdCall(1),
    ];
    for (const c of calls) expect(c).not.toThrow();
    expect(typeof noiseBed(1, "stream")).toBe("function");
  });

  it("ambience can be set and stopped", () => {
    const amb = new Ambience();
    expect(() => amb.set("BAMBOO_GROVE", 0.7)).not.toThrow();
    expect(() => amb.set(null, 0.7)).not.toThrow();
    expect(() => amb.stop()).not.toThrow();
  });
});
