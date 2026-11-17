"use client";

/**
 * Synthesized sound effects (Web Audio, no files, nothing to license):
 * ritual cues, event sounds and the building blocks of area ambience.
 * Each function takes a 0..1 volume and quietly does nothing where Web Audio
 * is unavailable (server, tests). Chosen per activity/area in
 * config/sound-design.ts.
 *
 * Every sound reports its name to `globalThis.__chuaSounds` when a test has
 * put an array there (browser checks read it); otherwise that costs nothing.
 */

import { getCtx } from "./sfx";
import { trace } from "./sound-trace";

type Ctx = AudioContext;

/** A sine/triangle partial with an exponential decay, routed to `out`. */
function partial(ctx: Ctx, out: AudioNode, at: number, freq: number, level: number, decay: number, type: OscillatorType = "sine", attack = 0.005) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(level, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

/** A buffer of white noise (seconds long), for breath, water, wind, pours. */
function noiseBuffer(ctx: Ctx, seconds: number, brown = false): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  return buf;
}

function master(ctx: Ctx, volume: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = Math.min(1, Math.max(0, volume));
  g.connect(ctx.destination);
  return g;
}

// ------------------------------------------------------------ ritual cues

/** Singing bowl: slow-beating partials with a long shimmering decay. */
export function singingBowl(volume: number, base = 432) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("singingBowl");
  const out = master(ctx, volume * 0.35);
  const t = ctx.currentTime;
  for (const [ratio, level, decay] of [[1, 1, 6], [2.76, 0.45, 4], [5.4, 0.2, 2.5]] as const) {
    partial(ctx, out, t, base * ratio, level, decay, "sine", 0.03);
    partial(ctx, out, t, base * ratio * 1.004, level * 0.7, decay, "sine", 0.03); // the slow beat
  }
}

/** Small hand bell (chuông gia trì): bright, clear partials. */
export function handBell(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("handBell");
  const out = master(ctx, volume * 0.3);
  const t = ctx.currentTime;
  for (const [ratio, level, decay] of [[1, 1, 2.4], [2.4, 0.5, 1.5], [3.9, 0.3, 0.9], [5.2, 0.15, 0.6]] as const) {
    partial(ctx, out, t, 880 * ratio, level, decay, "sine", 0.002);
  }
}

/** Tea poured into a cup, then the cup set down. */
export function teaPour(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("teaPour");
  const out = master(ctx, volume * 0.5);
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 1.4);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(1400, t);
  band.frequency.linearRampToValueAtTime(2300, t + 1.2); // pitch rises as the cup fills
  band.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  for (let i = 0; i < 12; i++) g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.35, t + 0.05 + i * 0.1); // gurgle
  g.gain.linearRampToValueAtTime(0, t + 1.35);
  src.connect(band).connect(g).connect(out);
  src.start(t);
  partial(ctx, out, t + 1.45, 2400, 0.35, 0.3, "sine", 0.001); // clink
  partial(ctx, out, t + 1.45, 3650, 0.2, 0.2, "sine", 0.001);
}

/** A small splash as something is set on the water, then a soft chime. */
export function waterPlop(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("waterPlop");
  const out = master(ctx, volume * 0.45);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(700, t);
  osc.frequency.exponentialRampToValueAtTime(160, t + 0.14);
  g.gain.setValueAtTime(0.8, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.2);
  partial(ctx, out, t + 0.25, 1046.5, 0.25, 1.4);
  partial(ctx, out, t + 0.25, 1568, 0.12, 1);
}

/** A filtered-noise burst (shared by brush, page and rattle sounds). */
function noiseBurst(ctx: Ctx, out: AudioNode, at: number, dur: number, freq: number, q: number, level: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.05);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(level, at + dur * 0.2);
  g.gain.linearRampToValueAtTime(0, at + dur);
  src.connect(band).connect(g).connect(out);
  src.start(at);
}

/** Coins dropping into the donation box: a few bright metallic clinks. */
export function coins(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("coins");
  const out = master(ctx, volume * 0.3);
  const t = ctx.currentTime;
  [0, 0.09, 0.2].forEach((dt, i) => {
    const f = 3100 + i * 420 + Math.random() * 200;
    partial(ctx, out, t + dt, f, 0.8, 0.35, "sine", 0.001);
    partial(ctx, out, t + dt, f * 1.48, 0.4, 0.25, "sine", 0.001);
  });
}

/** A page turning: a soft papery swish. */
export function pageTurn(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("pageTurn");
  const out = master(ctx, volume * 0.4);
  noiseBurst(ctx, out, ctx.currentTime, 0.35, 3200, 0.8, 0.8);
}

/** Fortune sticks rattling in their bamboo cylinder: quick wooden clicks. */
export function sticksShake(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("sticksShake");
  const out = master(ctx, volume * 0.35);
  const t = ctx.currentTime;
  for (let i = 0; i < 9; i++) {
    const at = t + i * 0.07 + Math.random() * 0.02;
    partial(ctx, out, at, 900 + Math.random() * 500, 0.6, 0.05, "triangle", 0.001);
    noiseBurst(ctx, out, at, 0.03, 1800, 3, 0.3);
  }
}

/** A wind chime stirring as a wish is hung: a few random high notes. */
export function windChime(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("windChime");
  const out = master(ctx, volume * 0.22);
  const t = ctx.currentTime;
  const scale = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
  for (let i = 0; i < 5; i++) {
    const f = scale[Math.floor(Math.random() * scale.length)];
    partial(ctx, out, t + i * 0.16 + Math.random() * 0.06, f, 0.8, 1.8, "sine", 0.002);
  }
}

/** A brush stroke on paper (signing the guestbook). */
export function brush(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("brush");
  const out = master(ctx, volume * 0.35);
  const t = ctx.currentTime;
  noiseBurst(ctx, out, t, 0.25, 1600, 1.2, 0.7);
  noiseBurst(ctx, out, t + 0.32, 0.4, 1400, 1.2, 0.6);
}

/** Sandals set down on the wooden rack: two soft, low taps. */
export function sandals(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("sandals");
  const out = master(ctx, volume * 0.4);
  const t = ctx.currentTime;
  for (const dt of [0, 0.18]) {
    partial(ctx, out, t + dt, 210 + Math.random() * 40, 0.8, 0.09, "triangle", 0.002);
    noiseBurst(ctx, out, t + dt, 0.05, 700, 1.5, 0.35);
  }
}

/** Water poured from a ladle or over hands: a low, splashing trickle. */
export function waterPour(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("waterPour");
  const out = master(ctx, volume * 0.5);
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 1.3);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(900, t);
  band.frequency.linearRampToValueAtTime(600, t + 1.1);
  band.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  for (let i = 0; i < 10; i++) g.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.4, t + 0.05 + i * 0.1);
  g.gain.linearRampToValueAtTime(0, t + 1.25);
  src.connect(band).connect(g).connect(out);
  src.start(t);
}

/** Monkeys chattering: a few quick, rising squeaks. */
export function monkeys(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("monkeys");
  const out = master(ctx, volume * 0.22);
  const t0 = ctx.currentTime;
  for (let i = 0; i < 5; i++) {
    const t = t0 + i * 0.11 + Math.random() * 0.03;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    const f = 700 + Math.random() * 400;
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.09);
  }
}

// ----------------------------------------------------------- event sounds

/** Rising notes with a soft bell timbre (merit chime, unlock arpeggio). */
export function chime(volume: number, notes: number[], gapMs = 140, name = "chime") {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace(name);
  const out = master(ctx, volume * 0.28);
  const t = ctx.currentTime;
  notes.forEach((f, i) => {
    const at = t + (i * gapMs) / 1000;
    partial(ctx, out, at, f, 1, 1.6, "sine", 0.003);
    partial(ctx, out, at, f * 2.01, 0.25, 0.8, "sine", 0.003);
  });
}

/** Soft whoosh of air (walking through a gate). */
export function whoosh(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("whoosh");
  const out = master(ctx, volume * 0.35);
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.7);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(300, t);
  band.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.7, t + 0.2);
  g.gain.linearRampToValueAtTime(0, t + 0.65);
  src.connect(band).connect(g).connect(out);
  src.start(t);
}

/** Quiet pop (someone else's chat message). */
export function pop(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("pop");
  const out = master(ctx, volume * 0.25);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(1320, t + 0.05);
  g.gain.setValueAtTime(0.7, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.1);
}

// -------------------------------------------------------------- ambience

/** One short bird call: two or three quick gliding chirps. */
export function birdCall(volume: number) {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return;
  trace("birdCall");
  const out = master(ctx, volume * 0.12);
  const base = 2400 + Math.random() * 1600;
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * 0.13;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(base * 1.1, t + 0.1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

/**
 * A looping noise bed (water or wind) at `level`, slowly breathing. Returns a
 * stop function. `kind` picks the colour: low pond water, brighter stream, or
 * wind that swells and fades.
 */
export function noiseBed(volume: number, kind: "water" | "stream" | "wind"): () => void {
  const ctx = getCtx();
  if (!ctx || volume <= 0) return () => {};
  trace(`bed:${kind}`);
  const out = master(ctx, 0);
  const target = volume * (kind === "wind" ? 0.18 : kind === "stream" ? 0.22 : 0.12);
  out.gain.setTargetAtTime(target, ctx.currentTime, 1.5); // fade in
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 4, kind !== "wind");
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = kind === "wind" ? "bandpass" : "lowpass";
  filt.frequency.value = kind === "water" ? 420 : kind === "stream" ? 1100 : 500;
  filt.Q.value = kind === "wind" ? 0.8 : 0.7;
  // Slow movement: an LFO on the filter (water ripples, wind gusts).
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = kind === "wind" ? 0.07 : 0.25;
  depth.gain.value = kind === "wind" ? 300 : 150;
  lfo.connect(depth).connect(filt.frequency);
  src.connect(filt).connect(out);
  src.start();
  lfo.start();
  return () => {
    const t = ctx.currentTime;
    out.gain.setTargetAtTime(0, t, 0.4); // fade out
    src.stop(t + 2);
    lfo.stop(t + 2);
  };
}
