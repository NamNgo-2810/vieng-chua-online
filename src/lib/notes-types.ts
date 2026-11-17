import type { Note } from "@/lib/notes-core";
import type { NoteKind } from "@/config/notes";

export interface NotesCallbacks {
  /** A note arrived (stored history on start, then live), already validated. */
  onNote: (note: Note) => void;
}

/** A notes backend: local server, Firebase, or offline. */
export interface INotes {
  start(): void;
  /** Add an already-prepared note (see prepareNote). False if refused. */
  add(kind: NoteKind, sessionId: string, displayName: string, text: string): Promise<boolean>;
  dispose(): void;
}
