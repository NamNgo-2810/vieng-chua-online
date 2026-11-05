"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { ROLES } from "@/config/roles";
import { ACTIVITIES } from "@/config/activities";

export default function VisitorList() {
  const players = useGameStore((s) => s.players);
  const localId = useGameStore((s) => s.localSessionId);
  const [open, setOpen] = useState(true);

  const online = Object.values(players).filter((p) => p.isOnline);

  return (
    <div className="pointer-events-auto absolute right-3 top-20 bottom-28 flex max-h-[70vh] w-60 flex-col">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-1 self-end rounded-lg bg-temple-ink/80 px-3 py-1 text-xs text-temple-sand md:hidden"
        aria-expanded={open}
      >
        {open ? "Ẩn danh sách" : `Khách (${online.length})`}
      </button>

      {open && (
        <div className="flex-1 overflow-y-auto rounded-xl bg-temple-ink/80 p-3 text-temple-sand backdrop-blur">
          <h2 className="mb-2 text-sm font-semibold">Khách trong chùa ({online.length})</h2>
          <ul className="space-y-1.5">
            {online.map((p) => (
              <li
                key={p.sessionId}
                className={`rounded-lg px-2 py-1.5 text-xs ${
                  p.sessionId === localId ? "bg-temple-gold/30" : "bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {p.displayName}
                    {p.sessionId === localId && " (bạn)"}
                  </span>
                  <span className="shrink-0 text-temple-sand/60">{ROLES[p.role].label}</span>
                </div>
                <div className="text-temple-sand/70">
                  {ACTIVITIES[p.currentActivity].label}
                </div>
              </li>
            ))}
            {online.length === 0 && (
              <li className="text-xs text-temple-sand/60">Chưa có ai trong chùa.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
