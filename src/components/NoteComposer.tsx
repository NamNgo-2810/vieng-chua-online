"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/state/store";
import { NOTES, NOTE_KIND_INFO } from "@/config/notes";
import { setTyping } from "@/game/input";

/**
 * Writing box for the guestbook (sổ vàng) and the wish tree, opened when the
 * player starts that ritual. While it is open, keys go to the text box.
 */
export default function NoteComposer() {
  const kind = useGameStore((s) => s.composer);
  const addNote = useGameStore((s) => s.addNote);
  const close = useGameStore((s) => s.openComposer);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!kind) return;
    setText("");
    setError(null);
    inputRef.current?.focus();
    return () => setTyping(false);
  }, [kind]);

  if (!kind) return null;
  const info = NOTE_KIND_INFO[kind];

  const submit = async () => {
    const err = await addNote(kind, text);
    setError(err);
    if (!err) setTyping(false);
  };

  return (
    <div className="pointer-events-auto absolute left-1/2 top-1/3 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-temple-gold/60 bg-temple-ink/95 p-4 text-temple-sand shadow-2xl" role="dialog" aria-label={info.title}>
      <div className="mb-1 text-lg font-semibold">{info.icon} {info.title}</div>
      <p className="mb-3 text-xs text-temple-sand/70">{info.prompt}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          ref={inputRef}
          value={text}
          maxLength={NOTES.maxLength}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close(null);
          }}
          placeholder={info.placeholder}
          aria-label={info.title}
          className="mb-2 w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-temple-sand/40 focus:ring-2 focus:ring-temple-gold"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-temple-sand/50">{text.length}/{NOTES.maxLength}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => close(null)} className="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20">Để sau</button>
            <button type="submit" className="rounded-lg bg-temple-gold px-3 py-2 text-xs font-medium text-temple-ink hover:brightness-110">{info.button}</button>
          </div>
        </div>
        {error && <p className="mt-2 text-[11px] text-red-300" role="alert">{error}</p>}
      </form>
    </div>
  );
}
