"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGameStore } from "@/state/store";
import { ENABLED_ROLES, DEFAULT_ROLE, ROLES, withRolePrefix, type RoleId } from "@/config/roles";
import { activityAtlas } from "@/config/asset-manifest";
import { validateDisplayName, DISPLAY_NAME_MAX } from "@/lib/validation";
import {
  APPEARANCES,
  appearancesForRole,
  defaultAppearance,
  type AppearanceId,
} from "@/config/appearances";
import { paintCharacter, SPRITE_CELL } from "@/game/sprite-painter";

/** Code-drawn preview of a look (used when the look has no real art). */
function LookPreview({ look, size = 64 }: { look: AppearanceId; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SPRITE_CELL, SPRITE_CELL);
    paintCharacter(ctx, APPEARANCES[look].palette, { body: "stand", arms: "sides", facing: "down" });
  }, [look]);
  return (
    <canvas
      ref={ref}
      width={SPRITE_CELL}
      height={SPRITE_CELL}
      className="pixelated"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      aria-label={APPEARANCES[look].label}
      role="img"
    />
  );
}

/** Name -> (role) -> preview -> enter. Role selection only shows when more than
 *  one role is enabled; otherwise the single enabled role is used. */
export default function OnboardingFlow() {
  const enterTemple = useGameStore((s) => s.enterTemple);
  const connection = useGameStore((s) => s.connection);
  const mode = useGameStore((s) => s.mode);
  const markAudioStarted = useGameStore((s) => s.markAudioStarted);

  const multiRole = ENABLED_ROLES.length > 1;
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>(DEFAULT_ROLE);
  const [look, setLook] = useState<AppearanceId>(defaultAppearance(DEFAULT_ROLE));
  const looks = appearancesForRole(role);
  const pickRole = (r: RoleId) => {
    setRole(r);
    setLook(defaultAppearance(r));
  };
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Real art preview only for looks backed by the manifest; others are drawn.
  const artRole = APPEARANCES[look].art;
  const previewAtlas = artRole ? activityAtlas(artRole, "WALKING") : undefined;

  const prefix = ROLES[role].namePrefix; // e.g. "Thích" for monks

  const onEnter = async () => {
    const result = validateDisplayName(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Prepend the role's Dharma-name prefix for display (e.g. "Thích An").
    const finalName = withRolePrefix(role, result.value);
    // The prefixed name must still satisfy the stored-name length limit.
    if (finalName.length > DISPLAY_NAME_MAX) {
      setError(`Tên (kèm "${prefix}") tối đa ${DISPLAY_NAME_MAX} ký tự.`);
      return;
    }
    setError(null);
    // This click is the user gesture browsers need before playing sound:
    // start the background music now rather than waiting for the 🔊 button.
    markAudioStarted();
    setSubmitting(true);
    try {
      await enterTemple(finalName, role, look);
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

        {mode === "offline" && (
          <p className="mb-4 rounded-lg bg-amber-100 p-3 text-xs text-amber-800">
            Chế độ <strong>ngoại tuyến</strong> (chơi một mình để trải nghiệm).
          </p>
        )}
        {mode === "local" && (
          <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
            Chùa đang chạy trên <strong>máy chủ nội bộ</strong> — bạn bè cùng mạng
            vào bằng địa chỉ IP của máy này (ví dụ <code>http://192.168.x.x:3000</code>).
          </p>
        )}

        <label className="mb-1 block text-sm font-medium text-temple-ink" htmlFor="displayName">
          Tên hiển thị
        </label>
        <div className="mb-1 flex items-stretch overflow-hidden rounded-lg border border-temple-wood/30 bg-white focus-within:ring-2 focus-within:ring-temple-gold">
          {prefix && (
            <span className="flex select-none items-center bg-temple-gold/15 px-3 text-sm font-medium text-temple-wood">
              {prefix}
            </span>
          )}
          <input
            id="displayName"
            value={name}
            maxLength={prefix ? DISPLAY_NAME_MAX - (prefix.length + 1) : DISPLAY_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên của bạn"
            className="w-full bg-transparent px-3 py-2 text-temple-ink outline-none"
          />
        </div>
        {prefix && (
          <p className="mb-3 text-xs text-temple-wood/70">
            Tên hiển thị sẽ là: <strong>{withRolePrefix(role, name.trim() || "...")}</strong>
          </p>
        )}

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
                    onChange={() => pickRole(r.id)}
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

        {looks.length > 1 && (
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-medium text-temple-ink">Chọn nhân vật</legend>
            <div className="grid grid-cols-4 gap-2">
              {looks.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLook(id)}
                  aria-pressed={look === id}
                  className={`flex flex-col items-center rounded-lg border p-1 transition ${
                    look === id
                      ? "border-temple-gold bg-temple-gold/10"
                      : "border-temple-wood/20 hover:border-temple-wood/40"
                  }`}
                >
                  <LookPreview look={id} size={48} />
                  <span className="text-[11px] text-temple-ink">{APPEARANCES[id].label}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {!previewAtlas && (
          <div className="mb-4 flex flex-col items-center">
            <span className="mb-1 text-xs text-temple-wood/70">Xem trước nhân vật</span>
            <div className="flex h-20 w-20 items-end justify-center overflow-hidden rounded-lg bg-white/60">
              <LookPreview look={look} size={80} />
            </div>
          </div>
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
          {submitting ? "Đang vào chùa..." : mode === "offline" ? "Vào chùa (ngoại tuyến)" : "Vào chùa"}
        </button>
      </div>
    </div>
  );
}
