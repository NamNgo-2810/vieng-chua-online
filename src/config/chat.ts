/**
 * Real-time public chat settings. Messages show as a bubble over the
 * speaker's head and in a short shared log. No private messages.
 *
 * Design: design/game-brief.md — Features: real-time public chat with bubbles.
 * Firebase rules mirror maxLength and minGapMs (database.rules.json, `chat`).
 */
export const CHAT = {
  /** Longest message, in characters (also enforced by the RTDB rules). */
  maxLength: 120,
  /** Minimum time between two messages from one person (also in the rules). */
  minGapMs: 2000,
  /** How long a speech bubble stays over the speaker's head. */
  bubbleMs: 6000,
  /** Messages kept in the log (and loaded for latecomers). */
  historySize: 30,
  /** Messages older than this may be deleted by any client (keeps RTDB small). */
  retentionMs: 60 * 60 * 1000,
} as const;
