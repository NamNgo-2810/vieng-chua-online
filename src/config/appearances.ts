/**
 * Character looks ("appearances"). A role decides what a player may DO; an
 * appearance decides how they LOOK. Each role offers one or more looks (the
 * Visitor role offers several), stored per player in RTDB as `appearance`.
 *
 * Every character is drawn in code by src/game/sprite-painter.ts from the
 * palette below — the project's chosen character style (owner's decision,
 * 2026-11-13). `art` can still point a look at sliced manifest art, but no
 * look uses it now. See design/assets/character-art-spec.md.
 */

import type { RoleId } from "./roles";

export const APPEARANCE_IDS = [
  "MONK",
  "ABBOT",
  "LAY_WOMAN",
  "LAY_MAN",
  "LAY_ELDER",
  "LAY_CHILD",
  // Tây du ký pilgrims (config/journey.ts).
  "TANG_MONK",
  "WUKONG",
  "BAJIE",
  "SHA_SENG",
] as const;

export type AppearanceId = (typeof APPEARANCE_IDS)[number];

export type HairStyle = "bald" | "bun" | "short";

/** Tây du ký costume details drawn on top of the base figure. */
export type Costume = "tang" | "wukong" | "bajie" | "sha";

/** What a pilgrim carries when standing or walking. */
export type Carry = "staff" | "rake" | "spade";

/** Colours (CSS hex) and shape knobs for the code-drawn placeholder sprite. */
export interface LookPalette {
  skin: string;
  /** Hair colour; ignored when `hair` is "bald". */
  hairColor: string;
  hair: HairStyle;
  robe: string;
  robeShade: string;
  /** Kasaya sash (monks) or collar/trim (lay robes). */
  accent: string;
  outline: string;
  /** Draws a band across the chest (abbot's red kasaya). */
  sash: boolean;
  /** Draws prayer beads at the neck. */
  beads: boolean;
  /** Draws white eyebrows (elders). */
  whiteBrows: boolean;
  /** Holds a walking stick when standing idle or walking. */
  stick: boolean;
  /** Overall size relative to an adult (child < 1). */
  scale: number;
  /** Tây du ký costume (crown, circlet, snout, beard...). */
  costume?: Costume;
  /** Carried weapon/tool, drawn like the elder's stick. */
  carry?: Carry;
}

export interface AppearanceDef {
  id: AppearanceId;
  role: RoleId;
  /** Vietnamese label for the look picker. */
  label: string;
  /**
   * Manifest character entry holding real art for this look, if any. Looks
   * without it are fully code-drawn until their Gemini sheet is sliced.
   */
  art?: RoleId;
  palette: LookPalette;
}

const OUTLINE = "#3b2414";

export const APPEARANCES: Record<AppearanceId, AppearanceDef> = {
  MONK: {
    id: "MONK",
    role: "HOA_THUONG",
    label: "Hòa thượng",
    palette: {
      skin: "#e8b98a", hairColor: "#d9a676", hair: "bald",
      robe: "#b5762a", robeShade: "#8a5418", accent: "#6b4a2b", outline: OUTLINE,
      sash: false, beads: false, whiteBrows: false, stick: false, scale: 1,
    },
  },
  ABBOT: {
    id: "ABBOT",
    role: "TRU_TRI",
    label: "Trụ trì",
    palette: {
      skin: "#e3b08a", hairColor: "#d4a27a", hair: "bald",
      robe: "#e6b422", robeShade: "#b88a10", accent: "#9e2a20", outline: OUTLINE,
      sash: true, beads: true, whiteBrows: true, stick: false, scale: 1,
    },
  },
  LAY_WOMAN: {
    id: "LAY_WOMAN",
    role: "KHACH_THAP_PHUONG",
    label: "Phật tử nữ",
    palette: {
      skin: "#f0c49c", hairColor: "#2a1d16", hair: "bun",
      robe: "#8f8f96", robeShade: "#6c6c73", accent: "#4a4a52", outline: OUTLINE,
      sash: false, beads: false, whiteBrows: false, stick: false, scale: 1,
    },
  },
  LAY_MAN: {
    id: "LAY_MAN",
    role: "KHACH_THAP_PHUONG",
    label: "Phật tử nam",
    palette: {
      skin: "#e2ad82", hairColor: "#1f1712", hair: "short",
      robe: "#7a5a3e", robeShade: "#5c412a", accent: "#3e2b1c", outline: OUTLINE,
      sash: false, beads: false, whiteBrows: false, stick: false, scale: 1,
    },
  },
  LAY_ELDER: {
    id: "LAY_ELDER",
    role: "KHACH_THAP_PHUONG",
    label: "Cụ già",
    palette: {
      skin: "#e6b896", hairColor: "#ececec", hair: "bun",
      robe: "#b9b9be", robeShade: "#939399", accent: "#6e6e75", outline: OUTLINE,
      sash: false, beads: true, whiteBrows: true, stick: true, scale: 0.95,
    },
  },
  LAY_CHILD: {
    id: "LAY_CHILD",
    role: "KHACH_THAP_PHUONG",
    label: "Em bé",
    palette: {
      skin: "#f2c8a0", hairColor: "#1f1712", hair: "short",
      robe: "#b08a5c", robeShade: "#8a6a42", accent: "#5e4528", outline: OUTLINE,
      sash: false, beads: false, whiteBrows: false, stick: false, scale: 0.8,
    },
  },
  // Đường Tăng: red kasaya with a gold sash, the five-buddha crown, a ringed staff.
  TANG_MONK: {
    id: "TANG_MONK",
    role: "HOA_THUONG",
    label: "Đường Tăng",
    palette: {
      skin: "#f0c8a0", hairColor: "#e0b088", hair: "bald",
      robe: "#b8322a", robeShade: "#8a2018", accent: "#e6b422", outline: OUTLINE,
      sash: true, beads: true, whiteBrows: false, stick: false, scale: 1,
      costume: "tang",
    },
  },
  // Tôn Ngộ Không: furred face, golden circlet, the red-and-gold staff.
  WUKONG: {
    id: "WUKONG",
    role: "KHACH_THAP_PHUONG",
    label: "Tôn Ngộ Không",
    palette: {
      skin: "#e8c49a", hairColor: "#9a6a36", hair: "short",
      robe: "#d8a020", robeShade: "#a87810", accent: "#b8322a", outline: OUTLINE,
      sash: false, beads: false, whiteBrows: false, stick: false, scale: 0.95,
      costume: "wukong", carry: "staff",
    },
  },
  // Trư Bát Giới: pink face with a snout and big ears, dark robe, the nine-tooth rake.
  BAJIE: {
    id: "BAJIE",
    role: "KHACH_THAP_PHUONG",
    label: "Trư Bát Giới",
    palette: {
      skin: "#f2b8b0", hairColor: "#e8a0a0", hair: "bald",
      robe: "#3d4560", robeShade: "#2a3048", accent: "#c9a24a", outline: OUTLINE,
      sash: false, beads: false, whiteBrows: false, stick: false, scale: 1,
      costume: "bajie", carry: "rake",
    },
  },
  // Sa Tăng: blue-grey skin, red hair and beard, big prayer beads, the crescent spade.
  SHA_SENG: {
    id: "SHA_SENG",
    role: "KHACH_THAP_PHUONG",
    label: "Sa Tăng",
    palette: {
      skin: "#9aaabb", hairColor: "#a8322a", hair: "short",
      robe: "#6b5a3a", robeShade: "#4e4028", accent: "#3e3020", outline: OUTLINE,
      sash: false, beads: true, whiteBrows: false, stick: false, scale: 1,
      costume: "sha", carry: "spade",
    },
  },
};

export function isAppearanceId(value: unknown): value is AppearanceId {
  return typeof value === "string" && (APPEARANCE_IDS as readonly string[]).includes(value);
}

/** Looks a role may choose from, in picker order. */
export function appearancesForRole(role: RoleId): AppearanceId[] {
  return APPEARANCE_IDS.filter((id) => APPEARANCES[id].role === role);
}

/** The look a role gets when none was chosen (or the stored one is invalid). */
export function defaultAppearance(role: RoleId): AppearanceId {
  return appearancesForRole(role)[0] ?? "MONK";
}

/** True when `appearance` is one of `role`'s looks. */
export function appearanceMatchesRole(role: RoleId, appearance: AppearanceId): boolean {
  return APPEARANCES[appearance]?.role === role;
}

/**
 * The look to draw for a player. Older clients store no `appearance`, and a
 * stored look that does not belong to the role is ignored, so every player
 * always resolves to a valid look.
 */
export function resolveAppearance(role: RoleId, appearance?: string | null): AppearanceId {
  if (isAppearanceId(appearance) && appearanceMatchesRole(role, appearance)) return appearance;
  return defaultAppearance(role);
}

/**
 * Whether a look's walk texture is real (manifest) art. Only a look configured
 * with `art` can have it: a texture that merely exists may be a code-drawn one
 * made by another area's scene earlier (that mix-up crashed the second scene
 * when it went looking for manifest art that does not exist).
 */
export function hasRealWalkArt(look: AppearanceId, textureExists: boolean): boolean {
  return textureExists && !!APPEARANCES[look].art;
}
