"use client";

/**
 * Fire-and-forget client for the Google Sheets history API route. Failures are
 * swallowed (logged only) so history never blocks or breaks gameplay — Sheets
 * is a secondary store, RTDB is the source of truth.
 */

import type { RoleId } from "@/config/roles";
import type { ActivityId } from "@/config/activities";

type EventType = "JOIN" | "ACTIVITY_CHANGE" | "LEAVE";

interface HistoryPayload {
  eventId: string;
  eventType: EventType;
  sessionId: string;
  displayName: string;
  role: RoleId;
  activity: ActivityId | null;
  timestamp: string; // ISO 8601
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (older browsers).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function recordEvent(
  eventType: EventType,
  data: { sessionId: string; displayName: string; role: RoleId; activity: ActivityId | null }
): void {
  const payload: HistoryPayload = {
    eventId: uuid(),
    eventType,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const secret = process.env.NEXT_PUBLIC_HISTORY_API_SECRET ?? "";

  // Prefer sendBeacon for LEAVE so it survives tab close.
  const body = JSON.stringify(payload);
  if (eventType === "LEAVE" && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify({ ...payload, secret })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/history", blob);
      return;
    } catch {
      // fall through to fetch
    }
  }

  void fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-history-secret": secret },
    body,
    keepalive: true,
  }).catch((err) => {
    console.warn("[history] failed to record event (non-fatal):", err);
  });
}
