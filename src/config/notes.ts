/**
 * Shared notes that stay: the guestbook at the front gate (sổ vàng) and the
 * wish tree on Quan Âm hill. Everyone can read them; each player can add one
 * of each kind per `minGapMs`. Cleaned and masked like chat.
 * The RTDB rules mirror maxLength and minGapMs (src/lib/merit-rules.ts).
 */

export const NOTE_KINDS = ["guestbook", "wish"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const NOTES = {
  maxLength: 80,
  /** Notes kept (and loaded) per kind. */
  keep: 60,
  /** Minimum time between two notes of one kind from one player. */
  minGapMs: 60_000,
} as const;

export const NOTE_KIND_INFO: Record<NoteKind, { title: string; prompt: string; placeholder: string; button: string; icon: string }> = {
  guestbook: {
    title: "Sổ vàng",
    prompt: "Ghi lại đôi dòng cho chùa và những người đến sau",
    placeholder: "Ví dụ: Lần đầu ghé chùa, thấy lòng an yên.",
    button: "Ghi vào sổ",
    icon: "📖",
  },
  wish: {
    title: "Cây ước nguyện",
    prompt: "Viết điều ước và treo lên cây — ai cũng có thể đọc",
    placeholder: "Ví dụ: Cầu cho gia đình bình an, mạnh khỏe.",
    button: "Treo lên cây",
    icon: "🎋",
  },
};

/** The activity that opens each kind's writing box. */
export const NOTE_ACTIVITY = { SIGN_GUESTBOOK: "guestbook", HANG_WISH: "wish" } as const;
