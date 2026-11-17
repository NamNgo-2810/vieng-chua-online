import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { meritRules, playerFieldRules, notesRules, spotBoxCondition, lastAwardRule, MERIT_ACTIVITIES } from "@/lib/merit-rules";
import { ACTIVITY_IDS } from "@/config/activities";
import { MERIT } from "@/config/merit";
import { MILESTONES } from "@/config/milestones";

const rules = JSON.parse(readFileSync(join(__dirname, "..", "database.rules.json"), "utf8")).rules;

describe("merit rules: in sync with the game config", () => {
  it("database.rules.json matches what the config builds (run `npm run rules:gen` if not)", () => {
    const built = meritRules();
    expect(rules.merit).toEqual(built.merit);
    expect(rules.templeMerit).toEqual(built.templeMerit);
  });

  it("players' currentActivity and area rules match the config (run `npm run rules:gen` if not)", () => {
    const built = playerFieldRules();
    expect(rules.players.$sessionId.currentActivity).toEqual(built.currentActivity);
    expect(rules.players.$sessionId.area).toEqual(built.area);
    expect(rules.players.$sessionId.emote).toEqual(built.emote);
    expect(rules.players.$sessionId.emoteAt).toEqual(built.emoteAt);
    expect(rules.players.$sessionId.shoesOff).toEqual(built.shoesOff);
    expect(rules.players.$sessionId.washed).toEqual(built.washed);
  });

  it("notes rules match the config (run `npm run rules:gen` if not)", () => {
    const built = notesRules();
    expect(rules.notes).toEqual(built.notes);
    expect(rules.notesThrottle).toEqual(built.notesThrottle);
  });

  it("accepts every activity in the config, including the garden's lantern ritual", () => {
    const re = rules.players.$sessionId.currentActivity[".validate"] as string;
    for (const a of ACTIVITY_IDS) expect(re, a).toContain(a);
  });

  it("refuses the lotus garden until the temple reaches its milestone", () => {
    const garden = MILESTONES.find((m) => m.id === "LOTUS_GARDEN")!.threshold;
    expect(rules.players.$sessionId.area[".validate"]).toContain(`(newData.val() === 'LOTUS_GARDEN' && root.child('templeMerit').child('total').val() >= ${garden})`);
  });

  it("the indoor halls need sandals off and hands/feet washed", () => {
    const area = rules.players.$sessionId.area[".validate"] as string;
    expect(area).toMatch(/newData\.val\(\) === 'MAIN_HALL'[^|]*shoesOff[^|]*washed/);
    expect(area).not.toMatch(/newData\.val\(\) === 'TAM_QUAN'[^|]*shoesOff/);
  });

  it("checks the ritual's area as well as its position", () => {
    expect(spotBoxCondition("RELEASE_LANTERN")).toContain("val() === 'LOTUS_GARDEN'");
    expect(spotBoxCondition("OFFER_INCENSE")).toContain("val() === 'COURTYARD'");
  });

  it("every merit-earning ritual has a spot box (none may fall back to false)", () => {
    for (const a of MERIT_ACTIVITIES) expect(spotBoxCondition(a), a).not.toBe("false");
  });

  it("walking earns nothing, so it is not in the award rule", () => {
    expect(MERIT_ACTIVITIES).not.toContain("WALKING");
    expect(lastAwardRule()).not.toContain("'WALKING'");
  });

  it("carries the config's numbers", () => {
    const text = JSON.stringify(rules.merit);
    expect(text).toContain(`data.val() + ${MERIT.cooldownMs}`);
    expect(text).toContain(`data.val() + ${MERIT.minGapMs}`);
    expect(text).toContain(`<= ${MERIT.dailyCap}`);
  });
});
