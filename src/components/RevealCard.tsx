"use client";

import { useEffect } from "react";
import { useGameStore } from "@/state/store";

/** How long a verse card stays before fading by itself. */
const SHOW_MS = 12_000;

/**
 * The verse revealed by reading a sutra (Tàng kinh các) or drawing a fortune
 * stick (xin xăm, Chánh điện). Closes by itself, on click, or with Esc.
 */
export default function RevealCard() {
  const reveal = useGameStore((s) => s.reveal);
  const close = useGameStore((s) => s.closeReveal);

  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(close, SHOW_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [reveal, close]);

  if (!reveal) return null;
  return (
    <button
      onClick={close}
      aria-label="Đóng"
      className="pointer-events-auto absolute left-1/2 top-1/4 w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border-2 border-temple-gold/70 bg-[#f4efe0] px-6 py-5 text-center text-temple-ink shadow-2xl"
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#8a2a1e]">
        {reveal.kind === "fortune" ? "🎋 Xin xăm" : "📜 Đọc kinh"} · {reveal.title}
      </div>
      <p className="font-serif text-lg leading-snug">“{reveal.text}”</p>
      {reveal.source && <p className="mt-2 text-xs italic text-temple-wood/70">— {reveal.source}</p>}
      <p className="mt-3 text-[10px] text-temple-wood/50">Nhấn để đóng</p>
    </button>
  );
}
