"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/state/store";
import { MILESTONES } from "@/config/milestones";

/** How long the unlock banner stays (ms). */
const SHOW_MS = 5000;

/**
 * Celebrates a temple milestone unlocked while the player is in the temple
 * (store.milestonePulse), e.g. "Chùa vừa có thêm: Sen nở — Hoa sen nở trên hồ."
 */
export default function MilestoneToast() {
  const pulse = useGameStore((s) => s.milestonePulse);
  const [shown, setShown] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pulse) return;
    const m = MILESTONES.find((x) => x.id === pulse.id);
    if (!m) return;
    setShown(`Chùa vừa có thêm: ${m.label} — ${m.description}`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(null), SHOW_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pulse]);

  if (!shown) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-40 -translate-x-1/2 rounded-2xl border border-temple-gold/70 bg-temple-ink/90 px-5 py-3 text-center text-sm text-temple-sand shadow-xl"
    >
      🪷 {shown}
    </div>
  );
}
