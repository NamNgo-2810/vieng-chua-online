import type { Player, Direction, ConnectionStatus } from "@/lib/types";
import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";
import type { AppearanceId } from "@/config/appearances";
import type { AreaId } from "@/config/areas";
import type { EmoteId } from "@/config/emotes";

/**
 * Shared contract for a presence backend. The store depends only on this, so it
 * can swap between the real Firebase PresenceManager and the offline
 * LocalPresence without any other code changing.
 */
export interface PresenceCallbacks {
  onConnection: (status: ConnectionStatus, error?: string) => void;
  onPlayers: (players: Record<string, Player>) => void;
  onTakenOver: () => void;
}

export interface JoinOptions {
  displayName: string;
  role: RoleId;
  /** Chosen look; resolved to the role's default when absent or not the role's. */
  appearance?: AppearanceId;
  /** Area to arrive in (the Tam quan for new visitors). */
  area?: AreaId;
  spawnX: number;
  spawnY: number;
}

export interface IPresence {
  authenticate(): Promise<string>;
  join(opts: JoinOptions): Promise<void>;
  changeActivity(activity: ActivityId): Promise<boolean>;
  /** Move to another area at (x, y): resets the activity to walking. */
  /** Move to another area, arriving at (x, y). `fly`: by cân đẩu vân rather than a gate. */
  changeArea(area: AreaId, x: number, y: number, dir: Direction, fly?: boolean): Promise<boolean>;
  /** Show a greeting over this player's head to everyone nearby. */
  emote(emote: EmoteId): Promise<boolean>;
  move(x: number, y: number, dir: Direction): void;
  getSessionId(): string | null;
  getLocal(): Player | null;
  leave(): Promise<void>;
  dispose(): void;
}
