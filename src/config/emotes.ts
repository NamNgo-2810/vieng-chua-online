/**
 * Greetings players can send without typing (keys 1–3, or the dock buttons).
 * Shown over the player's head to everyone in the same area for `showMs`.
 */

export const EMOTE_IDS = ["CHAP_TAY", "VAI", "VAY_TAY"] as const;
export type EmoteId = (typeof EMOTE_IDS)[number];

export const EMOTES: Record<EmoteId, { label: string; icon: string; key: string }> = {
  CHAP_TAY: { label: "Chắp tay", icon: "🙏", key: "1" },
  VAI: { label: "Vái chào", icon: "🙇", key: "2" },
  VAY_TAY: { label: "Vẫy tay", icon: "👋", key: "3" },
};

/** How long a greeting stays visible, and the shortest gap between two. */
export const EMOTE_TIMING = { showMs: 2500, minGapMs: 1500 } as const;

export function isEmoteId(v: unknown): v is EmoteId {
  return typeof v === "string" && (EMOTE_IDS as readonly string[]).includes(v);
}
