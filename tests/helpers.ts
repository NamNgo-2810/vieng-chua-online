import type { Player } from "@/lib/types";
import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";
import type { HistoryEvent } from "@/lib/validation";

let counter = 0;

/** Build a valid Player, overridable per field. */
export function makePlayer(over: Partial<Player> = {}): Player {
  const now = Date.now();
  return {
    sessionId: over.sessionId ?? `sess-${++counter}`,
    displayName: over.displayName ?? "Khách",
    role: (over.role ?? "HOA_THUONG") as RoleId,
    currentActivity: (over.currentActivity ?? "WALKING") as ActivityId,
    positionX: over.positionX ?? 100,
    positionY: over.positionY ?? 100,
    direction: over.direction ?? "down",
    joinedAt: over.joinedAt ?? now,
    lastActiveAt: over.lastActiveAt ?? now,
    isOnline: over.isOnline ?? true,
  };
}

/** Build a valid HistoryEvent. */
export function makeEvent(over: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    eventId: over.eventId ?? crypto.randomUUID(),
    eventType: over.eventType ?? "JOIN",
    sessionId: over.sessionId ?? `sess-${++counter}`,
    displayName: over.displayName ?? "Khách",
    role: (over.role ?? "HOA_THUONG") as RoleId,
    activity: (over.activity ?? "WALKING") as ActivityId | null,
    timestamp: over.timestamp ?? new Date().toISOString(),
  };
}
