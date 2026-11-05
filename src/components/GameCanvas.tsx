"use client";

import { useEffect, useRef, useState } from "react";
import type * as Phaser from "phaser";

/**
 * Mounts the Phaser game. Phaser is imported dynamically so it never runs on
 * the server (it touches `window`). The parent component only renders this
 * once the player has entered, so the store already has a session.
 *
 * If game initialization throws (e.g. a GPU/driver that can't create any usable
 * renderer), we catch it and show a calm fallback instead of a blank crash —
 * the rest of the UI (HUD, activities, visitor list) keeps working.
 */
export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    const el = containerRef.current;
    if (!el) return;

    // Load the Phaser chunk with a couple of retries. Chunk requests can fail
    // transiently (slow network, an HMR update, or a stale cached chunk map);
    // a short retry recovers without forcing the user to reload.
    const loadCreateGame = async (attempt = 0): Promise<typeof import("@/game/createGame")> => {
      try {
        return await import("@/game/createGame");
      } catch (err) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          return loadCreateGame(attempt + 1);
        }
        throw err;
      }
    };

    (async () => {
      try {
        const { createGame } = await loadCreateGame();
        if (disposed || !containerRef.current) return;
        gameRef.current = createGame(containerRef.current);
      } catch (err) {
        console.error("[game] failed to load/initialize renderer:", err);
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      try {
        gameRef.current?.destroy(true);
      } catch {
        // ignore teardown errors
      }
      gameRef.current = null;
    };
  }, []);

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-temple-ink p-6 text-center text-temple-sand">
        <p className="mb-2 text-lg font-semibold">Không thể hiển thị cảnh chùa</p>
        <p className="mb-4 max-w-sm text-sm text-temple-sand/70">
          Không tải được tài nguyên đồ họa. Thử tải lại trang; nếu vẫn lỗi, thiết
          bị có thể không hỗ trợ kết xuất. Các bảng điều khiển bên dưới vẫn dùng được.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-temple-wood px-4 py-2 text-sm font-medium text-temple-sand transition hover:bg-temple-woodLight"
        >
          Tải lại trang
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="pixelated absolute inset-0 h-full w-full"
      aria-label="Khu vực chùa"
      role="img"
    />
  );
}
