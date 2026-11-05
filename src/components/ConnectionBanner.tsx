"use client";

import { useGameStore } from "@/state/store";

const MESSAGES: Record<string, string> = {
  authenticating: "Đang kết nối...",
  connecting: "Đang vào chùa...",
  reconnecting: "Mất kết nối, đang thử lại...",
  error: "Có lỗi kết nối.",
};

export default function ConnectionBanner() {
  const connection = useGameStore((s) => s.connection);
  const takenOver = useGameStore((s) => s.takenOver);

  if (takenOver) {
    return (
      <div className="pointer-events-auto absolute left-1/2 top-16 -translate-x-1/2 rounded-xl bg-temple-clay px-4 py-2 text-sm text-white shadow-lg">
        Chùa đang mở ở một thẻ khác. Thẻ này chuyển sang chế độ xem.
      </div>
    );
  }

  if (connection.status === "online" || connection.status === "idle") return null;

  const msg = connection.error ?? MESSAGES[connection.status] ?? "";
  if (!msg) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-xl bg-temple-ink/85 px-4 py-2 text-sm text-temple-sand shadow-lg">
      {msg}
    </div>
  );
}
