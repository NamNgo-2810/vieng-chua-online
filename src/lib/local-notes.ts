"use client";

/**
 * Offline notes: kept in this browser's localStorage, so the single-player
 * demo still has a guestbook and a wish tree. Never used online.
 */

import { NOTE_KINDS, type NoteKind } from "@/config/notes";
import { addNote, emptyNotes, parseNote, type NotesByKind } from "@/lib/notes-core";
import type { INotes, NotesCallbacks } from "@/lib/notes-types";

const KEY = "chua-online:notes";

export class LocalNotes implements INotes {
  private notes: NotesByKind = emptyNotes();
  private counter = 0;

  constructor(private cbs: NotesCallbacks) {}

  start(): void {
    try {
      const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<NotesByKind> | null;
      for (const kind of NOTE_KINDS) {
        for (const n of raw?.[kind] ?? []) {
          const note = parseNote(String(n.id), kind, n);
          if (note) this.notes = addNote(this.notes, note);
        }
      }
    } catch {
      // storage unavailable or unreadable: start empty
    }
    for (const kind of NOTE_KINDS) this.notes[kind].forEach((n) => this.cbs.onNote(n));
  }

  async add(kind: NoteKind, sessionId: string, displayName: string, text: string): Promise<boolean> {
    const note = { id: `local-${Date.now()}-${++this.counter}`, kind, sessionId, displayName, text, createdAt: Date.now() };
    this.notes = addNote(this.notes, note);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.notes));
    } catch {
      // keep in memory for this visit
    }
    this.cbs.onNote(note);
    return true;
  }

  dispose(): void {}
}
