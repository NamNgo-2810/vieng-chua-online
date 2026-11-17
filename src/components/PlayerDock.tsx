"use client";

import { useGameStore } from "@/state/store";
import { ROLES } from "@/config/roles";
import { ACTIVITIES, isActivityEnabled, type ActivityId } from "@/config/activities";
import { allowedActivities } from "@/config/permissions";
import { SPOTS_BY_ID, spotsIn } from "@/config/ritual-spots";
import { areaOf } from "@/config/areas";
import { activityAllowedAt } from "@/game/placement";
import ChatBar from "./ChatBar";
import { EMOTES, EMOTE_IDS } from "@/config/emotes";

export default function PlayerDock() {
  const local = useGameStore((s) => s.localPlayer);
  const changeActivity = useGameStore((s) => s.changeActivity);
  const leave = useGameStore((s) => s.leave);
  const nearbyId = useGameStore((s) => s.nearbySpotId);
  const meritNote = useGameStore((s) => s.meritNote);
  const greet = useGameStore((s) => s.greet);

  if (!local) return null;

  // Rituals happen at their place (config/ritual-spots.ts): show only the ones
  // this spot offers that the role may do. Away from every spot, no buttons —
  // just the hint — which keeps the dock one row and off the courtyard.
  const spot = nearbyId ? SPOTS_BY_ID[nearbyId] : null;
  const activities = allowedActivities(local.role).filter(
    (a) => isActivityEnabled(a) && a !== "WALKING" && activityAllowedAt(a, spot)
  );

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
        <div className="ml-auto flex shrink-0 gap-1" role="group" aria-label="Chào hỏi">
          {EMOTE_IDS.map((id) => (
            <button
              key={id}
              onClick={(e) => {
                void greet(id);
                e.currentTarget.blur();
              }}
              title={`${EMOTES[id].label} (phím ${EMOTES[id].key})`}
              aria-label={EMOTES[id].label}
              className="rounded-lg bg-white/10 px-2 py-1.5 text-base leading-none hover:bg-white/20"
            >
              {EMOTES[id].icon}
            </button>
          ))}
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
              onClick={(e) => {
                void changeActivity(id);
                // Return focus to the game so keyboard movement keeps working
                // and Space/Enter don't re-trigger this button.
                e.currentTarget.blur();
              }}
              aria-pressed={active}
              className={`min-h-[40px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
                active
                  ? "bg-temple-gold text-temple-ink"
                  : "bg-white/15 ring-1 ring-temple-gold/60 hover:bg-white/25 active:bg-white/30"
              }`}
            >
              {ACTIVITIES[id].label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-temple-sand/60" aria-live="polite">
        {spot && activities.length > 0
          ? `Bạn đang ở ${spot.label} — chọn nghi lễ hoặc nhấn E.`
          : spot
            ? `Vai trò của bạn không hành lễ tại ${spot.label}.`
            : `Đi đến ${[...new Set(spotsIn(areaOf(local)).map((s) => s.label))].join(", ")} để hành lễ.`}
        <span className="hidden sm:inline"> Di chuyển: phím mũi tên hoặc WASD.</span>
      </p>
      {meritNote && <p className="mt-1 text-[11px] text-temple-gold/80">{meritNote}</p>}
      <ChatBar />
    </div>
  );
}
