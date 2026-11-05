import type { Player, Direction, ConnectionStatus } from "@/lib/types";
import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";

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
  spawnX: number;
  spawnY: number;
}

export interface IPresence {
  authenticate(): Promise<string>;
  join(opts: JoinOptions): Promise<void>;
  changeActivity(activity: ActivityId): Promise<boolean>;
  move(x: number, y: number, dir: Direction): void;
  getSessionId(): string | null;
  getLocal(): Player | null;
  leave(): Promise<void>;
  dispose(): void;
}
