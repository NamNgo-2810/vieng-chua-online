/**
 * Pure rules for the guestbook and wish notes: preparing what a player wrote,
 * validating notes from the network, and the kept list. Unit tested in
 * tests/notes.test.ts. Backends: local hub, Firebase, offline.
 */

import { z } from "zod";
import { NOTES, NOTE_KINDS, type NoteKind } from "@/config/notes";
import { sanitizeChatText, maskProfanity } from "./chat-core";

export interface Note {
  id: string;
  kind: NoteKind;
  sessionId: string;
  displayName: string;
  text: string;
  createdAt: number;
}

export type NotesByKind = Record<NoteKind, Note[]>;

export function emptyNotes(): NotesByKind {
  return { guestbook: [], wish: [] };
}

export function isNoteKind(v: unknown): v is NoteKind {
  return typeof v === "string" && (NOTE_KINDS as readonly string[]).includes(v);
}

/** Clean, mask and check a note; one per kind per NOTES.minGapMs. */
export function prepareNote(
  raw: string,
  lastAt: number | null,
  now: number,
  cfg: { maxLength: number; minGapMs: number } = NOTES
): { ok: true; text: string } | { ok: false; error: string } {
  const text = maskProfanity(sanitizeChatText(raw));
  if (!text) return { ok: false, error: "Hãy viết đôi dòng." };
  if (text.length > cfg.maxLength) return { ok: false, error: `Tối đa ${cfg.maxLength} ký tự.` };
  if (lastAt !== null && now - lastAt < cfg.minGapMs) {
    return { ok: false, error: `Mỗi người ghi một lần mỗi ${Math.round(cfg.minGapMs / 1000)} giây.` };
  }
  return { ok: true, text };
}

const incoming = z.object({
  sessionId: z.string().min(1),
  displayName: z.string().min(1).max(24),
  text: z.string().min(1).max(NOTES.maxLength),
  createdAt: z.number().finite(),
});

/** Validate a note from the network (re-cleaned and re-masked on the way in). */
export function parseNote(id: string, kind: NoteKind, node: unknown): Note | null {
  const r = incoming.safeParse(node);
  if (!r.success) return null;
  const text = maskProfanity(sanitizeChatText(r.data.text));
  return text ? { id, kind, ...r.data, text } : null;
}

/** Add a note to its kind's list: no duplicates, newest last, capped at NOTES.keep. */
export function addNote(notes: NotesByKind, note: Note, keep: number = NOTES.keep): NotesByKind {
  const list = notes[note.kind];
  if (list.some((n) => n.id === note.id)) return notes;
  const next = [...list, note].sort((a, b) => a.createdAt - b.createdAt);
  return { ...notes, [note.kind]: next.length > keep ? next.slice(next.length - keep) : next };
}
