"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/state/store";
import { ACTIVITIES } from "@/config/activities";

/**
 * Small, gentle confirmation when the local player changes activity. Driven by
 * the store's activityPulse counter so it fires on every change, including
 * programmatic ones. Auto-dismisses; respects reduced motion via CSS.
 */
export default function ActivityToast() {
  const pulse = useGameStore((s) => s.activityPulse);
  const activity = useGameStore((s) => s.localPlayer?.currentActivity);
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pulse === 0 || !activity) return;
    setLabel(ACTIVITIES[activity].label);
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 1600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pulse, activity]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-28 -translate-x-1/2 animate-[fadeIn_0.2s_ease-out] rounded-full bg-temple-gold/90 px-5 py-2 text-sm font-medium text-temple-ink shadow-lg"
    >
      ✶ {label}
    </div>
  );
}
