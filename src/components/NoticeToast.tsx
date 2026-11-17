"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/state/store";

const SHOW_MS = 5500;

/**
 * Short messages for the player (store.notice): the welcome at the Tam quan,
 * why a hall door stayed shut, that purification is done.
 */
export default function NoticeToast() {
  const notice = useGameStore((s) => s.notice);
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notice) return;
    setText(notice.text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), SHOW_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notice]);

  if (!text) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute bottom-[200px] left-1/2 w-[min(92vw,480px)] -translate-x-1/2 rounded-xl bg-temple-ink/90 px-4 py-2 text-center text-sm text-temple-sand shadow-lg"
    >
      {text}
    </div>
  );
}
