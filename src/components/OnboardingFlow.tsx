"use client";

import { useState } from "react";
import Image from "next/image";
import { useGameStore } from "@/state/store";
import { ENABLED_ROLES, DEFAULT_ROLE, ROLES, type RoleId } from "@/config/roles";
import { activityAtlas } from "@/config/asset-manifest";
import { validateDisplayName, DISPLAY_NAME_MAX } from "@/lib/validation";

/** Name -> (role) -> preview -> enter. Role selection only shows when more than
 *  one role is enabled; otherwise the single enabled role is used. */
export default function OnboardingFlow() {
  const enterTemple = useGameStore((s) => s.enterTemple);
  const connection = useGameStore((s) => s.connection);
  const configured = useGameStore((s) => s.configured);

  const multiRole = ENABLED_ROLES.length > 1;
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>(DEFAULT_ROLE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const previewAtlas = activityAtlas(role, "WALKING");

  const onEnter = async () => {
    const result = validateDisplayName(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await enterTemple(result.value, role);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-temple-ink p-4">
      <div className="w-full max-w-md rounded-2xl bg-temple-sand p-6 shadow-2xl">
        <h1 className="mb-1 text-center text-2xl font-bold text-temple-wood">
          Chùa Online
        </h1>
        <p className="mb-6 text-center text-sm text-temple-wood/80">
          Vãn cảnh chùa cùng mọi người
        </p>

        {!configured && (
          <p className="mb-4 rounded-lg bg-amber-100 p-3 text-xs text-amber-800">
            Chưa kết nối máy chủ — bạn vẫn có thể vào chùa ở{" "}
            <strong>chế độ ngoại tuyến</strong> để trải nghiệm. Cấu hình Firebase
            (<code>.env.local</code>) để chơi cùng người khác.
          </p>
        )}

        <label className="mb-1 block text-sm font-medium text-temple-ink" htmlFor="displayName">
          Tên hiển thị
        </label>
        <input
          id="displayName"
          value={name}
          maxLength={DISPLAY_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên của bạn"
          className="mb-4 w-full rounded-lg border border-temple-wood/30 bg-white px-3 py-2 text-temple-ink outline-none focus:ring-2 focus:ring-temple-gold"
        />

        {multiRole ? (
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-medium text-temple-ink">Chọn vai trò</legend>
            <div className="space-y-2">
              {ENABLED_ROLES.map((r) => (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    role === r.id
                      ? "border-temple-gold bg-temple-gold/10"
                      : "border-temple-wood/20 hover:border-temple-wood/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.id}
                    checked={role === r.id}
                    onChange={() => setRole(r.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-temple-ink">{r.label}</span>
                    <span className="block text-xs text-temple-wood/70">{r.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="mb-4 rounded-lg bg-temple-gold/10 px-3 py-2 text-sm text-temple-ink">
            Vai trò: <strong>{ROLES[role].label}</strong>
          </p>
        )}

        {previewAtlas && (
          <div className="mb-4 flex flex-col items-center">
            <span className="mb-1 text-xs text-temple-wood/70">Xem trước nhân vật</span>
            <div className="pixelated flex h-20 w-20 items-end justify-center overflow-hidden rounded-lg bg-white/60">
              <Image
                src={`/assets/${previewAtlas.file}`}
                alt={`Nhân vật ${role}`}
                width={previewAtlas.frameWidth}
                height={previewAtlas.frameHeight}
                className="pixelated"
                style={{ objectFit: "none", objectPosition: "left top" }}
                unoptimized
              />
            </div>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {connection.status === "error" && connection.error && (
          <p className="mb-3 text-sm text-red-600">{connection.error}</p>
        )}

        <button
          onClick={onEnter}
          disabled={submitting}
          className="w-full rounded-lg bg-temple-wood py-3 font-medium text-temple-sand transition hover:bg-temple-woodLight disabled:opacity-50"
        >
          {submitting ? "Đang vào chùa..." : configured ? "Vào chùa" : "Vào chùa (ngoại tuyến)"}
        </button>
      </div>
    </div>
  );
}
