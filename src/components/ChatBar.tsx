"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/state/store";
import { CHAT } from "@/config/chat";
import { setTyping } from "@/game/input";

/**
 * Public chat: a one-line input in the player dock plus a toggleable log of
 * recent messages. Enter (from the game) focuses the input; Esc leaves it.
 * While focused, the scene stops treating WASD/E as movement (game/input.ts).
 *
 * Design: design/game-brief.md — Features: real-time public chat with bubbles.
 */
export default function ChatBar() {
  const messages = useGameStore((s) => s.chat);
  const sendChat = useGameStore((s) => s.sendChat);
  const localId = useGameStore((s) => s.localSessionId);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Enter from anywhere outside a text field jumps into chat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Never leave the game believing we are still typing.
  useEffect(() => () => setTyping(false), []);

  useEffect(() => {
    if (showLog) logEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, showLog]);

  const submit = async () => {
    if (!text.trim()) return;
    const err = await sendChat(text);
    setError(err);
    if (!err) setText("");
  };

  return (
    <div className="mt-2">
      {showLog && (
        <div
          className="absolute bottom-full left-0 mb-2 max-h-56 w-[min(92vw,340px)] overflow-y-auto rounded-xl bg-temple-ink/90 p-3 text-xs shadow-lg backdrop-blur"
          aria-label="Tin nhắn gần đây"
        >
          {messages.length === 0 ? (
            <p className="text-temple-sand/60">Chưa có tin nhắn nào.</p>
          ) : (
            messages.map((m) => (
              <p key={m.id} className="mb-1 break-words leading-snug">
                <span className={m.sessionId === localId ? "font-semibold text-temple-gold" : "font-semibold"}>
                  {m.displayName}:
                </span>{" "}
                <span className="text-temple-sand/90">{m.text}</span>
              </p>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <button
          type="button"
          onClick={() => setShowLog((v) => !v)}
          aria-pressed={showLog}
          aria-label="Hiện tin nhắn gần đây"
          className="shrink-0 rounded-lg bg-white/10 px-2 py-2 text-xs hover:bg-white/20"
        >
          💬 {messages.length}
        </button>
        <input
          ref={inputRef}
          value={text}
          maxLength={CHAT.maxLength}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
          placeholder="Nhắn với mọi người… (Enter)"
          aria-label="Tin nhắn"
          className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-temple-sand placeholder:text-temple-sand/40 outline-none focus:ring-2 focus:ring-temple-gold"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-temple-gold px-3 py-2 text-xs font-medium text-temple-ink hover:brightness-110"
        >
          Gửi
        </button>
      </form>
      {error && <p className="mt-1 text-[11px] text-red-300" role="alert">{error}</p>}
    </div>
  );
}
