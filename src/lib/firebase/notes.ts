"use client";

/**
 * Guestbook and wish notes over Firebase RTDB.
 *
 *  notes/{kind}/{pushId}       { sessionId, displayName, text, createdAt }
 *  notesThrottle/{uid}/{kind}  server time of that user's last note of that kind
 *
 * Written in one multi-location update so the rules can enforce the gap
 * (src/lib/merit-rules.ts notesRules, generated into database.rules.json).
 */

import { ref, push, update, query, limitToLast, onChildAdded, serverTimestamp, type Database, type Unsubscribe } from "firebase/database";
import { getFirebase } from "./client";
import { NOTES, NOTE_KINDS, type NoteKind } from "@/config/notes";
import { parseNote } from "@/lib/notes-core";
import type { INotes, NotesCallbacks } from "@/lib/notes-types";

export class FirebaseNotes implements INotes {
  private db: Database;
  private unsubs: Unsubscribe[] = [];

  constructor(private cbs: NotesCallbacks) {
    this.db = getFirebase().db;
  }

  start(): void {
    for (const kind of NOTE_KINDS) {
      const q = query(ref(this.db, `notes/${kind}`), limitToLast(NOTES.keep));
      this.unsubs.push(
        onChildAdded(q, (snap) => {
          const n = snap.key ? parseNote(snap.key, kind, snap.val()) : null;
          if (n) this.cbs.onNote(n);
        })
      );
    }
  }

  async add(kind: NoteKind, sessionId: string, displayName: string, text: string): Promise<boolean> {
    const key = push(ref(this.db, `notes/${kind}`)).key;
    if (!key) return false;
    try {
      await update(ref(this.db), {
        [`notes/${kind}/${key}`]: { sessionId, displayName, text, createdAt: serverTimestamp() },
        [`notesThrottle/${sessionId}/${kind}`]: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn("[notes] refused:", err);
      return false;
    }
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}
