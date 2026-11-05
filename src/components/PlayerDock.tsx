"use client";

import { useGameStore } from "@/state/store";
import { ROLES } from "@/config/roles";
import { ACTIVITIES, isActivityEnabled, type ActivityId } from "@/config/activities";
import { allowedActivities } from "@/config/permissions";

export default function PlayerDock() {
  const local = useGameStore((s) => s.localPlayer);
  const changeActivity = useGameStore((s) => s.changeActivity);
  const leave = useGameStore((s) => s.leave);

  if (!local) return null;

  // Only activities that are both permitted for the role and currently enabled.
  const activities = allowedActivities(local.role).filter(isActivityEnabled);

  return (
    <div
      className="pointer-events-auto absolute bottom-3 right-3 left-3 rounded-2xl bg-temple-ink/85 p-3 text-temple-sand backdrop-blur sm:left-1/2 sm:right-auto sm:w-[min(96vw,760px)] sm:-translate-x-1/2"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">{local.displayName}</div>
          <div className="truncate text-xs text-temple-sand/70">
            {ROLES[local.role].label} · {ACTIVITIES[local.currentActivity].label}
          </div>
        </div>
        <button
          onClick={() => void leave()}
          className="shrink-0 rounded-lg bg-temple-clay px-3 py-2 text-xs font-medium transition hover:brightness-110"
        >
          Rời chùa
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn hoạt động">
        {activities.map((id: ActivityId) => {
          const active = local.currentActivity === id;
          return (
            <button
              key={id}
              onClick={() => void changeActivity(id)}
              aria-pressed={active}
              className={`min-h-[40px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
                active
                  ? "bg-temple-gold text-temple-ink"
                  : "bg-white/10 hover:bg-white/20 active:bg-white/25"
              }`}
            >
              {ACTIVITIES[id].label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 hidden text-[10px] text-temple-sand/50 sm:block">
        Dùng phím mũi tên hoặc WASD để di chuyển.
      </p>
    </div>
  );
}
