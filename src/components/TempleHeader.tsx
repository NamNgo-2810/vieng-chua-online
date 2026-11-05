"use client";

import { useGameStore } from "@/state/store";

export default function TempleHeader() {
  const count = useGameStore((s) => s.onlineCount());
  const offline = useGameStore((s) => s.offline);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 rounded-xl bg-temple-ink/80 px-4 py-2 text-temple-sand backdrop-blur">
      <div className="text-lg font-bold leading-tight">Chùa Online</div>
      <div className="flex items-center gap-1.5 text-xs text-temple-sand/80">
        <span
          className={`inline-block h-2 w-2 rounded-full ${offline ? "bg-amber-400" : "bg-green-400"}`}
          aria-hidden
        />
        {offline ? "Ngoại tuyến" : `${count} khách đang vãn cảnh`}
      </div>
    </div>
  );
}
