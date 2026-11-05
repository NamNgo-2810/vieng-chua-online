import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";

export type Direction = "up" | "down" | "left" | "right";

/** A player node as stored in RTDB and mirrored in the client store. */
export interface Player {
  sessionId: string;
  displayName: string;
  role: RoleId;
  currentActivity: ActivityId;
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
