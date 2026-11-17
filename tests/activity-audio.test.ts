import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ACTIVITY_AUDIO, activityAudio } from "@/config/activity-audio";
import { ACTIVITY_ANIM } from "@/game/anim";

describe("activity audio: config", () => {
  it("chanting loops the requested track", () => {
    expect(activityAudio("CHANTING")?.track).toBe("/assets/All_money_back_my_home.mp3");
  });

  it("every track file exists under public/", () => {
    for (const [activity, a] of Object.entries(ACTIVITY_AUDIO)) {
      if (!a?.track) continue;
      expect(existsSync(join(__dirname, "..", "public", a.track)), `${activity}: ${a.track}`).toBe(true);
    }
  });

  it("the wooden fish knocks once per strike of its animation", () => {
    expect(activityAudio("WOODEN_FISH")?.repeat).toEqual({ everyMs: ACTIVITY_ANIM.WOODEN_FISH.pulseMs, sound: "woodKnock" });
  });

  it("the great bell tolls once per swing, and everyone hears it", () => {
    const a = activityAudio("STRIKE_GREAT_BELL");
    expect(a?.repeat).toEqual({ everyMs: ACTIVITY_ANIM.STRIKE_GREAT_BELL.pulseMs, sound: "greatBell" });
    expect(a?.heardByAll).toBe(true);
  });

  it("only the great bell carries to other players", () => {
    for (const [activity, a] of Object.entries(ACTIVITY_AUDIO)) {
      if (activity !== "STRIKE_GREAT_BELL") expect(a?.heardByAll ?? false, activity).toBe(false);
    }
  });

  it("has no lasting audio for walking or when there is no activity", () => {
    expect(activityAudio("WALKING")).toBeNull();
    expect(activityAudio(null)).toBeNull();
  });
});
