/**
 * Player roles. IDs are stable strings stored in RTDB and Google Sheets.
 * Labels are the Vietnamese display names shown in the UI.
 */

export const ROLE_IDS = ["TRU_TRI", "HOA_THUONG", "KHACH_THAP_PHUONG"] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export interface RoleDef {
  id: RoleId;
  label: string;
  /** Short description shown in the onboarding role picker. */
  description: string;
  /**
   * Dharma-name prefix prepended to the player's entered name for display
   * (e.g. a monk's name shows as "Thích <name>"). Empty for lay roles.
   */
  namePrefix: string;
}

export const ROLES: Record<RoleId, RoleDef> = {
  TRU_TRI: {
    id: "TRU_TRI",
    label: "Trụ trì",
    description: "Trụ trì chùa — chủ trì mọi nghi lễ.",
    namePrefix: "Thích",
  },
  HOA_THUONG: {
    id: "HOA_THUONG",
    label: "Hòa thượng",
    description: "Hòa thượng — tụng kinh, thiền định, gõ mõ.",
    namePrefix: "Thích",
  },
  KHACH_THAP_PHUONG: {
    id: "KHACH_THAP_PHUONG",
    label: "Khách thập phương",
    description: "Khách đến vãn cảnh, dâng hương, cầu nguyện.",
    namePrefix: "",
  },
};

/** Apply a role's display prefix to an already-sanitized name. */
export function withRolePrefix(role: RoleId, name: string): string {
  const prefix = ROLES[role]?.namePrefix ?? "";
  return prefix ? `${prefix} ${name}` : name;
}

export const ROLE_LIST: RoleDef[] = ROLE_IDS.map((id) => ROLES[id]);

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && (ROLE_IDS as readonly string[]).includes(value);
}

/**
 * Roles currently offered to players. Temporarily limited to the Monk while we
 * iterate; the other role definitions above stay intact so they can be
 * re-enabled by just adding their IDs back here.
 */
export const ENABLED_ROLE_IDS: readonly RoleId[] = ["HOA_THUONG"] as const;

export const ENABLED_ROLES: RoleDef[] = ENABLED_ROLE_IDS.map((id) => ROLES[id]);

/** The role a player gets when selection is hidden (single-role mode). */
export const DEFAULT_ROLE: RoleId = ENABLED_ROLE_IDS[0];
