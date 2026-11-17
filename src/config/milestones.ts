/**
 * Temple milestones: as the whole temple's shared merit grows, the temple
 * becomes more beautiful (decor), and later a new area opens.
 *
 * Design: design/game-brief.md — Build order 5 (shared merit → milestones).
 * Thresholds are tuning. Owner's rule (2026-11-13): one player alone must be
 * able to open every map in one visit — tests/one-visit.test.ts checks that a
 * lay visitor (the weakest role) does it within 10 minutes.
 */

export type MilestoneId =
  | "LOTUS_BLOOM" | "MAIN_HALL" | "MARIGOLDS" | "PRAYER_FLAGS" | "LANTERN_STRING"
  | "LOTUS_GARDEN" | "BELL_TOWER" | "ANCESTOR_HALL" | "BAMBOO_GROVE"
  | "RELEASE_POND" | "SUTRA_LIBRARY" | "QUAN_AM_HILL" | "HOA_QUA_SON";

export interface Milestone {
  id: MilestoneId;
  /** Temple merit at which it unlocks (inclusive). */
  threshold: number;
  /** Short Vietnamese name for the header and the unlock toast. */
  label: string;
  /** One line describing what changed. */
  description: string;
  /** Decor in the courtyard, or a new area to walk into. */
  kind: "decor" | "area";
}

/** In unlock order (ascending threshold). */
export const MILESTONES: Milestone[] = [
  { id: "LOTUS_BLOOM", threshold: 3, label: "Sen nở", description: "Hoa sen nở trên hồ.", kind: "decor" },
  { id: "MAIN_HALL", threshold: 5, label: "Chánh điện", description: "Cửa chánh điện mở — vào lễ Phật.", kind: "area" },
  { id: "MARIGOLDS", threshold: 10, label: "Hoa cúc", description: "Chậu cúc vàng quanh sân chùa.", kind: "decor" },
  { id: "LOTUS_GARDEN", threshold: 15, label: "Vườn sen", description: "Vườn sen mở cửa đón khách.", kind: "area" },
  { id: "RELEASE_POND", threshold: 20, label: "Hồ phóng sinh", description: "Hồ phóng sinh mở bên Tam quan — thả cá, cho cá ăn.", kind: "area" },
  { id: "PRAYER_FLAGS", threshold: 20, label: "Cờ Phật giáo", description: "Dây cờ Phật giáo dưới mái chùa.", kind: "decor" },
  { id: "BELL_TOWER", threshold: 25, label: "Tháp chuông", description: "Tháp chuông mở — ai cũng có thể thỉnh đại hồng chung.", kind: "area" },
  { id: "LANTERN_STRING", threshold: 30, label: "Đèn lồng", description: "Dây đèn lồng đỏ trên lối vào.", kind: "decor" },
  { id: "ANCESTOR_HALL", threshold: 35, label: "Nhà Tổ", description: "Nhà Tổ mở — dâng hương, dâng trà tri ân chư Tổ.", kind: "area" },
  { id: "SUTRA_LIBRARY", threshold: 40, label: "Tàng kinh các", description: "Tàng kinh các mở cạnh chánh điện — đọc kinh, nhận lời dạy.", kind: "area" },
  { id: "QUAN_AM_HILL", threshold: 45, label: "Đồi Quan Âm", description: "Đường lên đồi Quan Âm mở sau tháp chuông — cầu an, treo điều ước.", kind: "area" },
  { id: "BAMBOO_GROVE", threshold: 50, label: "Rừng trúc", description: "Lối vào rừng trúc mở sau vườn sen.", kind: "area" },
  { id: "HOA_QUA_SON", threshold: 54, label: "Hoa Quả Sơn", description: "Đường núi sau đồi Quan Âm mở lên Hoa Quả Sơn — thác Thủy Liêm, đào tiên, đàn khỉ.", kind: "area" },
];
