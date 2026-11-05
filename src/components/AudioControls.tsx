"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";

export default function AudioControls() {
  const audio = useGameStore((s) => s.audio);
  const setMuted = useGameStore((s) => s.setMuted);
  const setSfxEnabled = useGameStore((s) => s.setSfxEnabled);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);
  const markAudioStarted = useGameStore((s) => s.markAudioStarted);
  const [open, setOpen] = useState(false);

  const toggleMusic = () => {
    markAudioStarted();
    setMuted(!audio.muted);
  };

  return (
    <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
      <button
        onClick={toggleMusic}
        aria-label={audio.muted ? "Bật nhạc nền" : "Tắt nhạc nền"}
        aria-pressed={!audio.muted}
        className="rounded-xl bg-temple-ink/80 px-3 py-2 text-temple-sand backdrop-blur transition hover:bg-temple-ink"
      >
        {audio.muted ? "🔇" : "🔊"}
      </button>
      <button
        onClick={() => setSfxEnabled(!audio.sfxEnabled)}
        aria-label={audio.sfxEnabled ? "Tắt hiệu ứng" : "Bật hiệu ứng"}
        aria-pressed={audio.sfxEnabled}
        className="rounded-xl bg-temple-ink/80 px-3 py-2 text-temple-sand backdrop-blur transition hover:bg-temple-ink"
      >
        {audio.sfxEnabled ? "🔔" : "🔕"}
      </button>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Cài đặt"
        aria-expanded={open}
        className="rounded-xl bg-temple-ink/80 px-3 py-2 text-temple-sand backdrop-blur transition hover:bg-temple-ink"
      >
        ⚙️
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-60 rounded-xl bg-temple-sand p-4 text-temple-ink shadow-xl">
          <label className="mb-1 block text-sm font-medium" htmlFor="musicVolume">
            Âm lượng nhạc nền
          </label>
          <input
            id="musicVolume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.musicVolume}
            onChange={(e) => {
              markAudioStarted();
              setMusicVolume(Number(e.target.value));
            }}
            className="w-full"
          />

          <label className="mb-1 mt-3 block text-sm font-medium" htmlFor="sfxVolume">
            Âm lượng hiệu ứng
          </label>
          <input
            id="sfxVolume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.sfxVolume}
            disabled={!audio.sfxEnabled}
            onChange={(e) => {
              markAudioStarted();
              setSfxVolume(Number(e.target.value));
            }}
            className="w-full disabled:opacity-40"
          />

          <p className="mt-2 text-xs text-temple-wood/70">
            Nhạc nền sẽ phát sau khi bạn tương tác với trang.
          </p>
        </div>
      )}
    </div>
  );
}
