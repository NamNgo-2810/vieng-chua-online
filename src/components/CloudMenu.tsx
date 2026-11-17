"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/state/store";
import { AREAS, AREA_IDS, areaOf, type AreaId } from "@/config/areas";
import { MILESTONES } from "@/config/milestones";
import { isUnlocked } from "@/lib/milestones-core";
import { isPurified, PURITY_TEXT } from "@/config/purity";
import { CLOUD, CLOUD_TEXT } from "@/config/journey";

/**
 * Cân đẩu vân (config/journey.ts): a button (or the C key) opens a list of
 * areas; picking an open one flies there. Locked until the player's own merit
 * reaches CLOUD.minMerit.
 */
export default function CloudMenu() {
  const local = useGameStore((s) => s.localPlayer);
  const myMerit = useGameStore((s) => s.merit.total);
  const temple = useGameStore((s) => s.templeMerit);
  const flyTo = useGameStore((s) => s.flyTo);
  const [open, setOpen] = useState(false);
  const ready = myMerit >= CLOUD.minMerit;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.toLowerCase() === CLOUD.key) setOpen((o) => !o);
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!local) return null;
  const here = areaOf(local);

  /** Why an area cannot be flown to right now (null = it can). */
  const blocked = (a: AreaId): string | null => {
    if (a === here) return CLOUD_TEXT.here;
    const def = AREAS[a];
    if (def.unlock && !isUnlocked(def.unlock, temple)) {
      const need = MILESTONES.find((m) => m.id === def.unlock)?.threshold ?? 0;
      return `🔒 ${need} công đức chùa`;
    }
    if (def.requiresPurity && !isPurified(local)) return "🩴 để dép, rửa tay chân trước";
    return null;
  };

  return (
    <div className="pointer-events-auto absolute bottom-44 left-3 w-[min(80vw,260px)]">
      {open && (
        <div className="mb-2 rounded-xl bg-temple-ink/90 p-3 text-xs text-temple-sand shadow-xl backdrop-blur" aria-label={CLOUD_TEXT.title}>
          {!ready ? (
            <p>{CLOUD_TEXT.locked(CLOUD.minMerit)} (bạn có {myMerit})</p>
          ) : (
            <>
              <p className="mb-2 font-semibold">{CLOUD_TEXT.pick}</p>
              <ul className="grid gap-1">
                {AREA_IDS.map((a) => {
                  const why = blocked(a);
                  return (
                    <li key={a}>
                      <button
                        disabled={!!why}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          setOpen(false);
                          void flyTo(a);
                        }}
                        title={why === "🩴 để dép, rửa tay chân trước" ? PURITY_TEXT.needed : undefined}
                        className="flex w-full justify-between gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-left hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>{AREAS[a].label}</span>
                        {why && <span className="text-[10px] text-temple-sand/70">{why}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
      <button
        onClick={(e) => {
          e.currentTarget.blur();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        title={`${CLOUD_TEXT.title} (phím ${CLOUD.key.toUpperCase()})`}
        className={`rounded-xl px-3 py-2 text-xs shadow backdrop-blur ${ready ? "bg-temple-gold/90 text-temple-ink hover:brightness-110" : "bg-temple-ink/85 text-temple-sand/70"}`}
      >
        {CLOUD_TEXT.title} {ready ? `· ${CLOUD.key.toUpperCase()}` : `· ${myMerit}/${CLOUD.minMerit}`}
      </button>
    </div>
  );
}
