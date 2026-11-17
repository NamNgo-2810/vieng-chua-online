import { describe, it, expect } from "vitest";
import {
  APPEARANCE_IDS,
  APPEARANCES,
  appearancesForRole,
  defaultAppearance,
  resolveAppearance,
  appearanceMatchesRole,
} from "@/config/appearances";
import { ROLE_IDS } from "@/config/roles";
import { ACTIVITY_IDS } from "@/config/activities";
import { playerSchema } from "@/lib/validation";
import { walkFrameRanges } from "@/config/asset-manifest";
import {
  ACTIVITY_POSE,
  WALK_FRAMES,
  PLACEHOLDER_WALK_DIRS,
  SPRITE_CELL,
  paintCharacter,
  type PaintTarget,
} from "@/game/sprite-painter";
import { LocalPresence } from "@/lib/local-presence";
import { makePlayer } from "./helpers";

describe("appearances: role → looks", () => {
  it("every role has at least one look, and its default is one of them", () => {
    for (const role of ROLE_IDS) {
      const looks = appearancesForRole(role);
      expect(looks.length).toBeGreaterThan(0);
      expect(looks).toContain(defaultAppearance(role));
    }
  });

  it("gives the Visitor role the lay looks plus three pilgrims, and the monk role Đường Tăng too", () => {
    expect(appearancesForRole("KHACH_THAP_PHUONG")).toEqual([
      "LAY_WOMAN",
      "LAY_MAN",
      "LAY_ELDER",
      "LAY_CHILD",
      "WUKONG",
      "BAJIE",
      "SHA_SENG",
    ]);
    expect(appearancesForRole("HOA_THUONG")).toEqual(["MONK", "TANG_MONK"]);
    expect(appearancesForRole("TRU_TRI")).toEqual(["ABBOT"]);
  });

  it("the Abbot no longer shares the monk's look", () => {
    expect(defaultAppearance("TRU_TRI")).not.toBe(defaultAppearance("HOA_THUONG"));
  });

  it("every look belongs to exactly the role it declares", () => {
    for (const id of APPEARANCE_IDS) {
      expect(appearanceMatchesRole(APPEARANCES[id].role, id)).toBe(true);
    }
  });
});

describe("appearances: resolveAppearance", () => {
  it("keeps a valid look for its role", () => {
    expect(resolveAppearance("KHACH_THAP_PHUONG", "LAY_ELDER")).toBe("LAY_ELDER");
  });

  it("falls back to the role default when absent (older clients)", () => {
    expect(resolveAppearance("KHACH_THAP_PHUONG", undefined)).toBe("LAY_WOMAN");
    expect(resolveAppearance("HOA_THUONG", null)).toBe("MONK");
  });

  it("ignores a look that belongs to another role", () => {
    expect(resolveAppearance("HOA_THUONG", "LAY_CHILD")).toBe("MONK");
  });

  it("ignores an unknown value", () => {
    expect(resolveAppearance("TRU_TRI", "DRAGON")).toBe("ABBOT");
  });
});

describe("appearances: player validation", () => {
  it("accepts a player without appearance (backward compatible)", () => {
    expect(playerSchema.safeParse(makePlayer()).success).toBe(true);
  });

  it("accepts a known appearance", () => {
    const p = makePlayer({ role: "KHACH_THAP_PHUONG", appearance: "LAY_MAN" });
    expect(playerSchema.safeParse(p).success).toBe(true);
  });

  it("rejects an unknown appearance", () => {
    const p = { ...makePlayer(), appearance: "DRAGON" };
    expect(playerSchema.safeParse(p).success).toBe(false);
  });

  it("does not drop a player whose look mismatches the role (drawn as default)", () => {
    const p = makePlayer({ role: "HOA_THUONG", appearance: "LAY_CHILD" });
    expect(playerSchema.safeParse(p).success).toBe(true);
  });
});

describe("appearances: offline join stores a resolved look", () => {
  const noop = { onConnection: () => {}, onPlayers: () => {}, onTakenOver: () => {} };

  it("stores the chosen look", async () => {
    const lp = new LocalPresence(noop);
    await lp.join({ displayName: "Lan", role: "KHACH_THAP_PHUONG", appearance: "LAY_CHILD", spawnX: 0, spawnY: 0 });
    expect(lp.getLocal()?.appearance).toBe("LAY_CHILD");
    lp.dispose();
  });

  it("replaces a look from another role with the role default", async () => {
    const lp = new LocalPresence(noop);
    await lp.join({ displayName: "An", role: "HOA_THUONG", appearance: "LAY_CHILD", spawnX: 0, spawnY: 0 });
    expect(lp.getLocal()?.appearance).toBe("MONK");
    lp.dispose();
  });
});

describe("placeholder sprites: pose data", () => {
  it("defines a pose for every activity", () => {
    for (const a of ACTIVITY_IDS) expect(ACTIVITY_POSE[a]).toBeDefined();
  });

  it("walk descriptor covers all four directions within the frame strip", () => {
    const ranges = walkFrameRanges(PLACEHOLDER_WALK_DIRS);
    for (const dir of ["down", "up", "left", "right"] as const) {
      const r = ranges[dir];
      expect(r).toBeDefined();
      expect(r!.start).toBeGreaterThanOrEqual(0);
      expect(r!.end).toBeLessThan(WALK_FRAMES.length);
    }
  });

  it("left reuses right-facing frames (the game mirrors left)", () => {
    const ranges = walkFrameRanges(PLACEHOLDER_WALK_DIRS);
    expect(WALK_FRAMES[ranges.left!.start].facing).toBe("right");
  });
});

describe("placeholder sprites: painter", () => {
  /** Records fillRect calls instead of drawing. */
  function recorder() {
    const rects: { x: number; y: number; w: number; h: number; color: string }[] = [];
    const ctx: PaintTarget = {
      fillStyle: "",
      fillRect(x, y, w, h) {
        rects.push({ x, y, w, h, color: String(this.fillStyle) });
      },
    };
    return { ctx, rects };
  }

  it("draws every look x activity inside its 64px cell", () => {
    for (const look of APPEARANCE_IDS) {
      for (const a of ACTIVITY_IDS) {
        const { ctx, rects } = recorder();
        paintCharacter(ctx, APPEARANCES[look].palette, ACTIVITY_POSE[a]);
        expect(rects.length).toBeGreaterThan(10);
        for (const r of rects) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.y).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(SPRITE_CELL);
          expect(r.y + r.h).toBeLessThanOrEqual(SPRITE_CELL);
        }
      }
    }
  });

  it("uses each look's own robe colour", () => {
    for (const look of APPEARANCE_IDS) {
      const { ctx, rects } = recorder();
      const palette = APPEARANCES[look].palette;
      paintCharacter(ctx, palette, ACTIVITY_POSE.WALKING);
      expect(rects.some((r) => r.color === palette.robe)).toBe(true);
    }
  });

  it("draws the child smaller than an adult", () => {
    const height = (look: "LAY_MAN" | "LAY_CHILD") => {
      const { ctx, rects } = recorder();
      paintCharacter(ctx, APPEARANCES[look].palette, ACTIVITY_POSE.WALKING);
      return SPRITE_CELL - Math.min(...rects.map((r) => r.y));
    };
    expect(height("LAY_CHILD")).toBeLessThan(height("LAY_MAN"));
  });

  it("offsets a frame by its strip position", () => {
    const { ctx, rects } = recorder();
    paintCharacter(ctx, APPEARANCES.MONK.palette, ACTIVITY_POSE.WALKING, SPRITE_CELL * 2, 0);
    expect(Math.min(...rects.map((r) => r.x))).toBeGreaterThanOrEqual(SPRITE_CELL * 2);
  });
});

describe("art style: every character is code-drawn", () => {
  it("no look points at painted manifest art", () => {
    for (const id of APPEARANCE_IDS) expect(APPEARANCES[id].art, id).toBeUndefined();
  });

  it("draws the held item into offering, wooden fish and bell poses", () => {
    const itemColour = { OFFERING: "#8a2a1e", WOODEN_FISH: "#b8322a", RING_BELL: "#7a5230" } as const;
    for (const [activity, colour] of Object.entries(itemColour)) {
      const rects: string[] = [];
      const ctx: PaintTarget = { fillStyle: "", fillRect() { rects.push(String(this.fillStyle)); } };
      paintCharacter(ctx, APPEARANCES.MONK.palette, ACTIVITY_POSE[activity as keyof typeof itemColour]);
      expect(rects, activity).toContain(colour);
    }
  });
});

describe("regression: second area scene must not mistake drawn textures for painted art", () => {
  it("a look without configured art never counts as having real walk art, even if its texture exists", async () => {
    const { hasRealWalkArt } = await import("@/config/appearances");
    for (const id of APPEARANCE_IDS) expect(hasRealWalkArt(id, true), id).toBe(false);
  });
});
