"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/state/store";
import { playSfx, playWoodKnock, playGreatBell } from "@/lib/sfx";
// Background music for the whole temple (owner's choice, 2026-11-16).
const BACKGROUND_MUSIC = "/assets/Celestial_Symphony_Black_Myth_Wukong.mp3";

import { singingBowl, handBell, teaPour, waterPlop, chime, whoosh, pop, coins, pageTurn, sticksShake, windChime, brush, sandals, waterPour, monkeys } from "@/lib/sound-library";
import { Ambience } from "@/lib/ambience";
import { ACTIVITY_CUES, EVENT_SOUNDS, CHAT_POP_LEVEL, type CueName } from "@/config/sound-design";
import { areaOf } from "@/config/areas";
import { activityAudio, MUSIC_DUCK, HEARD_BY_ALL_LEVEL, type RepeatSound } from "@/config/activity-audio";
import type { ActivityId } from "@/config/activities";

const REPEAT_SOUNDS: Record<RepeatSound, (volume: number) => void> = {
  woodKnock: playWoodKnock,
  greatBell: playGreatBell,
};

/** Ritual start cues (config/sound-design.ts ACTIVITY_CUES). */
const CUES: Record<CueName, (volume: number) => void> = {
  incense: (v) => playSfx("incense", v),
  offering: (v) => playSfx("offering", v),
  handBell,
  singingBowl: (v) => singingBowl(v, 432),
  lowBowl: (v) => singingBowl(v, 216),
  teaPour,
  waterPlop,
  coins,
  pageTurn,
  sticksShake,
  windChime,
  brush,
  sandals,
  waterPour,
  monkeys,
};

/**
 * Owns all audio playback:
 *  - A persistent <audio> element loops the ambient track. It starts when the
 *    player enters the temple (the "Vào chùa" click counts as the user gesture
 *    browsers require); if the browser still refuses, the next click or key
 *    press retries.
 *  - One-shot synthesized cues when an activity starts (activityPulse).
 *  - Activity audio that lasts as long as the activity (config/activity-audio):
 *    the chanting track loops while chanting (music lowered meanwhile), and the
 *    wooden fish knocks in time with its strike animation.
 *  - Event sounds and the current area's ambience (config/sound-design.ts).
 * Everything except the music follows the sound-effects toggle and volume.
 */
export default function AudioController() {
  const started = useGameStore((s) => s.audio.started);
  const muted = useGameStore((s) => s.audio.muted);
  const musicVolume = useGameStore((s) => s.audio.musicVolume);

  const sfxEnabled = useGameStore((s) => s.audio.sfxEnabled);
  const sfxVolume = useGameStore((s) => s.audio.sfxVolume);
  const pulse = useGameStore((s) => s.activityPulse);
  const activity = useGameStore((s) => s.localPlayer?.currentActivity);
  const players = useGameStore((s) => s.players);
  const localId = useGameStore((s) => s.localSessionId);
  const area = useGameStore((s) => (s.localPlayer ? areaOf(s.localPlayer) : null));
  const meritPulse = useGameStore((s) => s.meritPulse?.seq ?? 0);
  const milestonePulse = useGameStore((s) => s.milestonePulse?.seq ?? 0);
  const chat = useGameStore((s) => s.chat);

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLAudioElement | null>(null);

  const track = sfxEnabled ? activityAudio(activity)?.track ?? null : null;

  // --- Background music: started / muted / volume, lowered under a track ---
  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;
    el.volume = muted ? 0 : musicVolume * (track ? MUSIC_DUCK : 1);
    if (!started || muted) {
      if (muted) el.pause();
      return;
    }
    if (!el.paused) return;
    el.play().catch(() => {
      // Still blocked (no gesture yet): retry on the next click or key press.
      const retry = () => {
        el.play().catch(() => {});
        window.removeEventListener("pointerdown", retry);
        window.removeEventListener("keydown", retry);
      };
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
    });
  }, [started, muted, musicVolume, track]);

  // --- Activity track (chanting): loop while the activity lasts ---
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (!track) {
      el.pause();
      return;
    }
    el.volume = Math.min(1, Math.max(0, sfxVolume));
    if (!el.src.endsWith(track)) el.src = track;
    el.play().catch(() => {});
  }, [track, sfxVolume]);

  // Each fresh start of the activity begins the track from the top.
  const lastTrackPulse = useRef(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !track || pulse === lastTrackPulse.current) return;
    lastTrackPulse.current = pulse;
    el.currentTime = 0;
  }, [pulse, track]);

  // --- Repeating activity sounds (wooden fish knocks, great bell tolls) ---
  const repeat = sfxEnabled ? activityAudio(activity)?.repeat ?? null : null;
  const repeatMs = repeat?.everyMs ?? 0;
  const repeatSound = repeat?.sound ?? null;
  // Keyed on the sound only: the activity reaches the store twice when it
  // starts (player record, then the start counter), and restarting on both
  // doubled the first knock.
  useEffect(() => {
    if (!repeatMs || !repeatSound) return;
    const play = REPEAT_SOUNDS[repeatSound];
    play(sfxVolume);
    const id = setInterval(() => play(sfxVolume), repeatMs);
    return () => clearInterval(id);
  }, [repeatMs, repeatSound, sfxVolume]);

  // --- Sounds others hear: someone else starts striking the great bell ---
  const othersLast = useRef<Map<string, ActivityId>>(new Map());
  useEffect(() => {
    const seen = othersLast.current;
    for (const [id, p] of Object.entries(players)) {
      if (id === localId) continue;
      const before = seen.get(id);
      seen.set(id, p.currentActivity);
      const a = activityAudio(p.currentActivity);
      if (!sfxEnabled || before === undefined || before === p.currentActivity || !a?.heardByAll || !a.repeat) continue;
      REPEAT_SOUNDS[a.repeat.sound](sfxVolume * HEARD_BY_ALL_LEVEL);
    }
    for (const id of [...seen.keys()]) if (!players[id]) seen.delete(id);
  }, [players, localId, sfxEnabled, sfxVolume]);

  // --- One-shot cue when a ritual starts (lasting-audio rituals have none) ---
  const lastPulse = useRef(0);
  useEffect(() => {
    if (pulse === 0 || pulse === lastPulse.current) return;
    lastPulse.current = pulse;
    if (!sfxEnabled || !activity) return;
    const cue = ACTIVITY_CUES[activity];
    if (cue) CUES[cue](sfxVolume);
  }, [pulse, sfxEnabled, sfxVolume, activity]);

  // --- Events: merit earned, a milestone unlocked ---
  const lastMerit = useRef(meritPulse);
  useEffect(() => {
    if (meritPulse === lastMerit.current) return;
    lastMerit.current = meritPulse;
    if (sfxEnabled) chime(sfxVolume, [...EVENT_SOUNDS.merit], 120, "meritChime");
  }, [meritPulse, sfxEnabled, sfxVolume]);

  const lastMilestone = useRef(milestonePulse);
  useEffect(() => {
    if (milestonePulse === lastMilestone.current) return;
    lastMilestone.current = milestonePulse;
    if (sfxEnabled) chime(sfxVolume, [...EVENT_SOUNDS.unlock], 160, "unlockChime");
  }, [milestonePulse, sfxEnabled, sfxVolume]);

  // --- Walking through a gate: a soft whoosh ---
  const lastArea = useRef(area);
  useEffect(() => {
    if (area === lastArea.current) return;
    const moved = lastArea.current !== null && area !== null;
    lastArea.current = area;
    if (moved && sfxEnabled) whoosh(sfxVolume);
  }, [area, sfxEnabled, sfxVolume]);

  // --- Someone else's chat message: a quiet pop ---
  const seenChat = useRef<number | null>(null);
  useEffect(() => {
    const newest = chat[chat.length - 1];
    const stamp = newest ? newest.createdAt : 0;
    if (seenChat.current === null) {
      seenChat.current = stamp; // history on arrival is not new
      return;
    }
    if (!newest || stamp <= seenChat.current) return;
    seenChat.current = stamp;
    if (sfxEnabled && newest.sessionId !== localId) pop(sfxVolume * CHAT_POP_LEVEL);
  }, [chat, localId, sfxEnabled, sfxVolume]);

  // --- Area ambience: water, wind, birds (after the first click, like music) ---
  const ambience = useRef<Ambience | null>(null);
  useEffect(() => {
    if (!ambience.current) ambience.current = new Ambience();
    ambience.current.set(started && sfxEnabled ? area : null, sfxVolume);
  }, [started, sfxEnabled, sfxVolume, area]);
  useEffect(() => () => ambience.current?.stop(), []);

  return (
    <>
      <audio ref={musicRef} src={BACKGROUND_MUSIC} loop preload="auto" aria-hidden />
      <audio ref={trackRef} loop preload="auto" aria-hidden data-role="activity-track" />
    </>
  );
}
