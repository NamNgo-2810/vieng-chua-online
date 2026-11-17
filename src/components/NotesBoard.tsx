"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { NOTE_KIND_INFO, type NoteKind } from "@/config/notes";
import { areaOf, type AreaId } from "@/config/areas";

/** Which board can be read in which area. */
const BOARD_IN: Partial<Record<AreaId, NoteKind>> = { TAM_QUAN: "guestbook", QUAN_AM_HILL: "wish" };

function when(ts: number): string {
  return new Date(ts).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * The guestbook (at the front gate) and wish tree (on Quan Âm hill) to read:
 * a button in the corner of those areas opens the list, newest first.
 */
export default function NotesBoard() {
  const area = useGameStore((s) => (s.localPlayer ? areaOf(s.localPlayer) : null));
  const notes = useGameStore((s) => s.notes);
  const [open, setOpen] = useState(false);
  const kind = area ? BOARD_IN[area] : undefined;
  if (!kind) return null;
  const info = NOTE_KIND_INFO[kind];
  const list = [...notes[kind]].reverse();

  return (
    <div className="pointer-events-auto absolute left-3 top-44 w-[min(88vw,320px)]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-xl bg-temple-ink/85 px-3 py-2 text-xs text-temple-sand shadow backdrop-blur hover:bg-temple-ink"
      >
        {info.icon} {info.title} ({notes[kind].length})
      </button>
      {open && (
        <div className="mt-2 max-h-[45vh] overflow-y-auto rounded-xl bg-temple-ink/90 p-3 text-xs text-temple-sand shadow-xl backdrop-blur" aria-label={info.title}>
          {list.length === 0 ? (
            <p className="text-temple-sand/60">Chưa có ai viết. Hãy là người đầu tiên!</p>
          ) : (
            list.map((n) => (
              <div key={n.id} className="mb-2 border-b border-white/10 pb-2 last:border-0">
                <p className="leading-snug">“{n.text}”</p>
                <p className="mt-0.5 text-[10px] text-temple-gold/80">— {n.displayName} · {when(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
