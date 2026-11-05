/**
 * Shared validation + sanitization. Used both client-side (before writing to
 * RTDB) and server-side (in the history API route). Keeping it in one place
 * means the same rules apply everywhere.
 */

import { z } from "zod";
import { ROLE_IDS } from "@/config/roles";
import { ACTIVITY_IDS } from "@/config/activities";

export const DISPLAY_NAME_MIN = 1;
export const DISPLAY_NAME_MAX = 24;

/** A small, conservative profanity list (extend as needed). */
const BANNED_WORDS = ["fuck", "shit", "bitch", "cunt", "asshole"];

/**
 * Strip HTML/control characters and collapse whitespace. Does NOT enforce
 * length — that is handled by the schema so callers get a clear error.
 */
export function sanitizeDisplayName(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "") // remove any tag-like sequences
    .replace(/[\u0000-\u001F\u007F]/g, "") // control chars
    .replace(/\s+/g, " ")
    .trim();
}

export function containsProfanity(name: string): boolean {
  const lower = name.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
}

export const direction = z.enum(["up", "down", "left", "right"]);
export const roleId = z.enum(ROLE_IDS);
export const activityId = z.enum(ACTIVITY_IDS);

export const displayNameSchema = z
  .string()
  .transform(sanitizeDisplayName)
  .pipe(
    z
      .string()
      .min(DISPLAY_NAME_MIN, "Vui lòng nhập tên hiển thị.")
      .max(DISPLAY_NAME_MAX, `Tên tối đa ${DISPLAY_NAME_MAX} ký tự.`)
  )
  .refine((n) => !containsProfanity(n), "Tên chứa từ ngữ không phù hợp.");

/** Validate + sanitize a display name. Returns the cleaned value or an error. */
export function validateDisplayName(raw: string):
  | { ok: true; value: string }
  | { ok: false; error: string } {
  const result = displayNameSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "Tên không hợp lệ." };
}

/** Shape of a player node in RTDB. */
export const playerSchema = z.object({
  sessionId: z.string().min(1),
  displayName: displayNameSchema,
  role: roleId,
  currentActivity: activityId,
  positionX: z.number().finite(),
  positionY: z.number().finite(),
  direction,
  joinedAt: z.number().int().nonnegative(),
  lastActiveAt: z.number().int().nonnegative(),
  isOnline: z.boolean(),
});

export type ValidatedPlayer = z.infer<typeof playerSchema>;

/** Event types recorded to the Activity Logs sheet. */
export const eventType = z.enum(["JOIN", "ACTIVITY_CHANGE", "LEAVE"]);

/** Payload the client sends to the history API route. */
export const historyEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType,
  sessionId: z.string().min(1),
  displayName: displayNameSchema,
  role: roleId,
  activity: activityId.nullable(),
  timestamp: z.string().datetime(), // ISO 8601
});

export type HistoryEvent = z.infer<typeof historyEventSchema>;
