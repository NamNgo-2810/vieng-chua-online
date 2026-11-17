import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";
import type { AppearanceId } from "@/config/appearances";
import type { AreaId } from "@/config/areas";
import type { EmoteId } from "@/config/emotes";

export type Direction = "up" | "down" | "left" | "right";

/** A player node as stored in RTDB and mirrored in the client store. */
export interface Player {
  sessionId: string;
  displayName: string;
  role: RoleId;
  /**
   * Character look. Optional: players written by older clients have none and
   * are drawn with their role's default (see resolveAppearance).
   */
  appearance?: AppearanceId;
  currentActivity: ActivityId;
  /**
   * When currentActivity began (server time online). Merit needs a ritual to
   * be held for MERIT.ritualMs; the RTDB rules check it against `now`.
   */
  activityStartedAt?: number;
  /** Which area the player is in; absent (older clients) means the courtyard. */
  area?: AreaId;
  /** Purification at the Tam quan: sandals left on the rack, hands and feet washed. */
  shoesOff?: boolean;
  washed?: boolean;
  /** Last greeting (chắp tay, vái, vẫy tay) and when it was sent. */
  emote?: EmoteId;
  emoteAt?: number;
  positionX: number;
  positionY: number;
  direction: Direction;
  joinedAt: number;
  lastActiveAt: number;
  isOnline: boolean;
}

export type ConnectionStatus =
  | "idle"
  | "authenticating"
  | "connecting"
  | "online"
  | "reconnecting"
  | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  error?: string;
}

export interface AudioState {
  muted: boolean; // mutes background music
  sfxEnabled: boolean; // enables activity sound effects
  musicVolume: number; // 0..1, background music
  sfxVolume: number; // 0..1, sound effects
  started: boolean; // has playback begun after a user gesture
}
