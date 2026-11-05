"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/state/store";
import { playSfx, sfxForActivity } from "@/lib/sfx";
import { ACTIVITIES } from "@/config/activities";

/**
 * Owns all audio playback:
 *  - A single, persistent <audio> element loops the ambient track. It only
 *    reacts to music state (started / muted / musicVolume), so changing an
 *    activity never re-creates or restarts it.
 *  - Activity changes trigger short synthesized SFX (independent volume),
 *    driven by the store's activityPulse counter.
 *
 * Respects browser autoplay rules: music starts only after a user gesture
 * (audio.started), and SFX use a user-gesture-resumed AudioContext.
 */
export default function AudioController() {
  const started = useGameStore((s) => s.audio.started);
  const muted = useGameStore((s) => s.audio.muted);
  const musicVolume = useGameStore((s) => s.audio.musicVolume);

  const sfxEnabled = useGameStore((s) => s.audio.sfxEnabled);
  const sfxVolume = useGameStore((s) => s.audio.sfxVolume);
  const pulse = useGameStore((s) => s.activityPulse);
  const activity = useGameStore((s) => s.localPlayer?.currentActivity);

  const musicRef = useRef<HTMLAudioElement | null>(null);

  // --- Background music: react ONLY to music state (never to activity) ---
  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;
    el.volume = muted ? 0 : musicVolume;
    if (started && !muted) {
      el.play().catch(() => {
        // Autoplay still blocked; retries on next gesture-driven state change.
      });
    } else if (muted) {
      el.pause();
    }
  }, [started, muted, musicVolume]);

  // --- Activity SFX: fire on each activity change (pulse), not on music state ---
  const lastPulse = useRef(0);
  useEffect(() => {
    if (pulse === 0 || pulse === lastPulse.current) return;
    lastPulse.current = pulse;
    if (!sfxEnabled || !activity) return;
    const sfxKey = ACTIVITIES[activity]?.sfx ?? null;
    // "offering" has no config sfx key but still deserves a gentle cue.
    const name = sfxForActivity(sfxKey) ?? (activity === "OFFERING" ? "offering" : null);
    if (name) playSfx(name, sfxVolume);
  }, [pulse, sfxEnabled, sfxVolume, activity]);

  return (
    <audio
      ref={musicRef}
      src="/assets/Morning_at_the_Pagoda.mp3"
      loop
      preload="auto"
      aria-hidden
    />
  );
}
