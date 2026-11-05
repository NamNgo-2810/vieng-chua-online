"use client";

import { useEffect, useRef, useState } from "react";
import { setVirtualInput, clearVirtualInput } from "@/game/input";

/**
 * On-screen directional pad for touch devices. It writes a normalized movement
 * vector into the shared `virtualInput`, which the Phaser scene reads each
 * frame (same path as keyboard). Shown only when a coarse pointer (touch) is
 * detected, so it never clutters the desktop view.
 *
 * The knob is draggable within a ring; releasing recenters and stops movement.
 */
export default function TouchControls() {
  const [isTouch, setIsTouch] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const RADIUS = 48; // px, max knob travel

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouch(coarse || hasTouch);
  }, []);

  useEffect(() => () => clearVirtualInput(), []);

  if (!isTouch) return null;

  const updateFromPoint = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // Normalize to [-1,1] for the game.
    setVirtualInput(dx / RADIUS, dy / RADIUS);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    activePointer.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromPoint(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    updateFromPoint(e.clientX, e.clientY);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    setKnob({ x: 0, y: 0 });
    clearVirtualInput();
  };

  return (
    <div
      ref={baseRef}
      className="pointer-events-auto absolute bottom-28 left-5 h-32 w-32 touch-none select-none rounded-full bg-temple-ink/40 backdrop-blur"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="application"
      aria-label="Điều khiển di chuyển"
    >
      <div className="absolute inset-0 m-auto h-24 w-24 self-center rounded-full border-2 border-temple-sand/30" />
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-temple-gold/80 shadow-lg"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  );
}
