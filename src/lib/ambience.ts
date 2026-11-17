"use client";

/**
 * Plays the current area's ambience (config/sound-design.ts AREA_AMBIENCE):
 * looping water/stream/wind beds plus bird calls at random intervals. One
 * instance lives in the AudioController; set() is called whenever the area,
 * the effects toggle or the volume changes, and only rebuilds what changed.
 */

import { AREA_AMBIENCE, AMBIENCE_LEVEL } from "@/config/sound-design";
import type { AreaId } from "@/config/areas";
import { noiseBed, birdCall } from "./sound-library";

export class Ambience {
  private key = "";
  private stops: (() => void)[] = [];
  private birdTimer: ReturnType<typeof setTimeout> | null = null;

  /** Play `area`'s ambience at `volume` (0..1), or silence when area is null. */
  set(area: AreaId | null, volume: number) {
    const v = Math.round(volume * 100) / 100;
    const key = area && v > 0 ? `${area}@${v}` : "";
    if (key === this.key) return;
    this.stop();
    this.key = key;
    if (!area || v <= 0) return;
    const spec = AREA_AMBIENCE[area];
    const level = v * AMBIENCE_LEVEL;
    if (spec.water) this.stops.push(noiseBed(level * spec.water, "water"));
    if (spec.stream) this.stops.push(noiseBed(level * spec.stream, "stream"));
    if (spec.wind) this.stops.push(noiseBed(level * spec.wind, "wind"));
    if (spec.birds) this.scheduleBirds(level, spec.birds);
  }

  private scheduleBirds(level: number, perMinute: number) {
    const mean = 60_000 / perMinute;
    const next = () => {
      // Irregular gaps (0.4x–1.6x the mean) so it never sounds like a loop.
      this.birdTimer = setTimeout(() => {
        birdCall(level);
        next();
      }, mean * (0.4 + Math.random() * 1.2));
    };
    next();
  }

  stop() {
    for (const s of this.stops) s();
    this.stops = [];
    if (this.birdTimer) clearTimeout(this.birdTimer);
    this.birdTimer = null;
    this.key = "";
  }
}
