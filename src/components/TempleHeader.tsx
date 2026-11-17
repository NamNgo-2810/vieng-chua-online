"use client";

import { useGameStore } from "@/state/store";
import { currentStreak, vnDay } from "@/lib/merit-core";
import { MERIT } from "@/config/merit";
import { nextMilestone } from "@/lib/milestones-core";
import { useEffect, useState } from "react";
import { phaseAt, vnHour, debugHour, PHASE_LABEL } from "@/lib/daytime";
import { holyDayAt, lunarLabel } from "@/lib/lunar";

/** Re-render every minute so the time of day stays current. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function TempleHeader() {
  const count = useGameStore((s) => s.onlineCount());
  const offline = useGameStore((s) => s.offline);
  const mode = useGameStore((s) => s.mode);
  const merit = useGameStore((s) => s.merit);
  const temple = useGameStore((s) => s.templeMerit);
  const now = useMinute();
  const forcedHour = typeof window !== "undefined" ? debugHour(window.location.search) : null;
  const phase = phaseAt(forcedHour ?? vnHour(now));
  const holy = holyDayAt(now);
  const streak = currentStreak(merit, now);
  const today = merit.day.index === vnDay(now) ? merit.day.earned : 0;
  const next = nextMilestone(temple);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 rounded-xl bg-temple-ink/80 px-4 py-2 text-temple-sand backdrop-blur">
      <div className="text-lg font-bold leading-tight">Chùa Online</div>
      <div className="flex items-center gap-1.5 text-xs text-temple-sand/80">
        <span
          className={`inline-block h-2 w-2 rounded-full ${offline ? "bg-amber-400" : "bg-green-400"}`}
          aria-hidden
        />
        {offline ? "Ngoại tuyến" : `${count} khách đang vãn cảnh${mode === "local" ? " · mạng nội bộ" : ""}`}
      </div>
      <div className="text-[11px] text-temple-sand/70" aria-label="Thời gian">
        {PHASE_LABEL[phase]} · {lunarLabel(now)}
      </div>
      {holy && (
        <div className="mt-0.5 rounded bg-temple-gold/20 px-1.5 py-0.5 text-[11px] text-temple-gold">
          🏮 Hôm nay {holy === "ram" ? "ngày Rằm" : "mùng Một"} — mỗi nghi lễ thêm 1 công đức
        </div>
      )}
      <div className="mt-1 border-t border-temple-sand/15 pt-1 text-xs" aria-label="Công đức">
        <div title={`Hôm nay: ${today}/${MERIT.dailyCap}`}>
          🪷 Công đức: <strong className="text-temple-gold">{merit.total}</strong>
          <span className="text-temple-sand/60"> · hôm nay {today}/{MERIT.dailyCap}</span>
        </div>
        <div className="text-temple-sand/80">
          🔥 {streak > 0 ? `${streak} ngày liên tiếp` : "Hành lễ để bắt đầu chuỗi ngày"}
        </div>
        <div className="text-temple-sand/60">Công đức cả chùa: {temple}</div>
        {next ? (
          <div className="mt-0.5" title={next.milestone.description}>
            <div className="text-[11px] text-temple-sand/70">
              Tiếp theo: {next.milestone.label} (còn {next.remaining})
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-white/10" role="progressbar"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(next.progress * 100)}
              aria-label={`Tiến tới ${next.milestone.label}`}>
              <div className="h-full bg-temple-gold" style={{ width: `${Math.round(next.progress * 100)}%` }} />
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-temple-gold">Chùa đã nở rộ trọn vẹn 🪷</div>
        )}
      </div>
    </div>
  );
}
