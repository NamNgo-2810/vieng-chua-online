/**
 * Pure chat rules shared by the Firebase and offline chat backends: cleaning
 * and masking text, the per-person send gap, parsing incoming nodes, and the
 * rolling history. No Firebase, no React — unit tested in tests/chat.test.ts.
 */

import { z } from "zod";
import { CHAT } from "@/config/chat";
import { BANNED_WORDS } from "@/lib/validation";

/** One chat message as shown in the log and the bubbles. */
export interface ChatMessage {
  id: string;
  sessionId: string;
  displayName: string;
  text: string;
  /** Epoch ms (server time for Firebase messages). */
  createdAt: number;
}

/** Strip tags and control characters, collapse whitespace, trim. */
export function sanitizeChatText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Replace banned words with asterisks of the same length (case-insensitive). */
export function maskProfanity(text: string, words: readonly string[] = BANNED_WORDS): string {
  let out = text;
  for (const w of words) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, (m) => "*".repeat(m.length));
  }
  return out;
}

export type PrepareResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * Turn what the player typed into a message that may be sent: cleaned,
 * masked, length-checked, and not sooner than `minGapMs` after their last one.
 */
export function prepareOutgoing(
  raw: string,
  lastSentAt: number | null,
  now: number,
  cfg: { maxLength: number; minGapMs: number } = CHAT
): PrepareResult {
  const text = maskProfanity(sanitizeChatText(raw));
  if (!text) return { ok: false, error: "Tin nhắn trống." };
  if (text.length > cfg.maxLength) {
    return { ok: false, error: `Tin nhắn tối đa ${cfg.maxLength} ký tự.` };
  }
  if (lastSentAt !== null && now - lastSentAt < cfg.minGapMs) {
    return { ok: false, error: "Chậm lại một chút nhé." };
  }
  return { ok: true, text };
}

const incomingSchema = z.object({
  sessionId: z.string().min(1),
  displayName: z.string().min(1).max(24),
  text: z.string().min(1).max(CHAT.maxLength),
  createdAt: z.number().finite(),
});

/**
 * Validate a node received from the network. Text is re-cleaned and re-masked
 * on display too, since a tampered client could skip its own filter.
 */
export function parseIncoming(id: string, node: unknown): ChatMessage | null {
  const r = incomingSchema.safeParse(node);
  if (!r.success) return null;
  const text = maskProfanity(sanitizeChatText(r.data.text));
  if (!text) return null;
  return { id, ...r.data, text };
}

/** Add a message to the history: no duplicates, ordered by time, capped. */
export function appendHistory(
  history: ChatMessage[],
  msg: ChatMessage,
  size: number = CHAT.historySize
): ChatMessage[] {
  if (history.some((m) => m.id === msg.id)) return history;
  const next = [...history, msg].sort((a, b) => a.createdAt - b.createdAt);
  return next.length > size ? next.slice(next.length - size) : next;
}

/** True while a message should still show as a bubble at `now`. */
export function bubbleVisible(msg: ChatMessage, now: number, bubbleMs: number = CHAT.bubbleMs): boolean {
  return now - msg.createdAt < bubbleMs;
}
