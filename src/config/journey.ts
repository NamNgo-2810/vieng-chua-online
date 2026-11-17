/**
 * Tây du ký touches (owner's request, 2026-11-16): the four pilgrims as looks
 * (config/appearances.ts), Hoa Quả Sơn as an area, the golden staff in the
 * sutra library and a pilgrimage mural in the main hall, and the cân đẩu vân
 * (somersault cloud) for flying between open areas.
 *
 * The characters are drawn in this game's own pixel style from the classic
 * novel — not from any game or film adaptation.
 */

/** Cân đẩu vân: fly straight to any open area once you have earned enough merit. */
export const CLOUD = {
  /** Personal merit (all-time total) needed to ride the cloud. */
  minMerit: 30,
  /** Keyboard shortcut that opens the cloud menu. */
  key: "c",
  /** How long the landing cloud stays under the rider (ms). */
  landingMs: 1400,
} as const;

export const CLOUD_TEXT = {
  title: "☁ Cân đẩu vân",
  locked: (need: number) => `Cần ${need} công đức của bạn để cưỡi cân đẩu vân.`,
  pick: "Bay đến đâu?",
  here: "đang ở đây",
} as const;
