"use client";

/**
 * Lightweight sound effects synthesized with the Web Audio API. No audio files
 * and no copyrighted recordings — each effect is a short, gentle tone shaped to
 * suggest its activity (a soft bell for incense/offering, a wooden knock for
 * the wooden fish, a low bowl for chanting). This keeps SFX independent of the
 * looping background music, so changing activities never touches the music.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Resume if the browser suspended it before a user gesture.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export type SfxName = "bell" | "incense" | "offering" | "woodfish" | "chant" | "generic";

interface Tone {
  freq: number;
  type: OscillatorType;
  duration: number; // seconds
  attack: number;
  release: number;
}

const TONES: Record<SfxName, Tone> = {
  bell: { freq: 660, type: "sine", duration: 1.1, attack: 0.005, release: 1.0 },
  incense: { freq: 523.25, type: "sine", duration: 0.7, attack: 0.01, release: 0.6 },
  offering: { freq: 587.33, type: "triangle", duration: 0.6, attack: 0.01, release: 0.5 },
  woodfish: { freq: 180, type: "square", duration: 0.12, attack: 0.001, release: 0.1 },
  chant: { freq: 196, type: "sine", duration: 1.2, attack: 0.05, release: 1.0 },
  generic: { freq: 440, type: "sine", duration: 0.4, attack: 0.01, release: 0.35 },
};

/** Play one SFX at the given 0..1 volume. No-ops gracefully if audio is unavailable. */
export function playSfx(name: SfxName, volume: number): void {
  const audioCtx = getCtx();
  if (!audioCtx || volume <= 0) return;
  const t = TONES[name] ?? TONES.generic;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = t.type;
  osc.frequency.setValueAtTime(t.freq, now);

  const peak = Math.min(1, Math.max(0, volume)) * 0.25; // keep SFX gentle
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + t.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + t.attack + t.release);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + t.duration + 0.05);

  // For the wooden fish, add a quick second knock so it reads as a strike.
  if (name === "woodfish") {
    const osc2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    osc2.type = t.type;
    osc2.frequency.setValueAtTime(t.freq, now + 0.16);
    g2.gain.setValueAtTime(0, now + 0.16);
    g2.gain.linearRampToValueAtTime(peak, now + 0.165);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc2.connect(g2).connect(audioCtx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.32);
  }
}

/** Map an activity's sfx key (from config) to a synthesized effect. */
export function sfxForActivity(sfxKey: string | null): SfxName | null {
  switch (sfxKey) {
    case "bell":
      return "bell";
    case "incense":
      return "incense";
    case "woodfish":
      return "woodfish";
    default:
      return null;
  }
}
