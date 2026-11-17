/**
 * Words revealed by two rituals:
 *  - READ_SUTRA (Tàng kinh các): short teachings. Lines marked with a source
 *    are from the Dhammapada (Kinh Pháp Cú), rendered in plain Vietnamese;
 *    the rest are widely known sayings of Vietnamese Buddhism.
 *  - DRAW_FORTUNE (xin xăm, Chánh điện): gentle encouragements written for this
 *    game — not taken from any real temple's fortune book.
 */

export interface Verse {
  text: string;
  source?: string;
}

export const SUTRA_VERSES: Verse[] = [
  { text: "Hận thù không bao giờ dập tắt được hận thù; chỉ có tình thương mới dập tắt được hận thù.", source: "Kinh Pháp Cú, kệ 5" },
  { text: "Tâm dẫn đầu mọi việc, tâm làm chủ, tâm tạo tác.", source: "Kinh Pháp Cú, kệ 1" },
  { text: "Thắng ngàn quân giặc không bằng tự thắng mình; tự thắng mình mới là chiến công oanh liệt nhất.", source: "Kinh Pháp Cú, kệ 103" },
  { text: "Như tảng đá kiên cố không bị gió lay, người trí không dao động trước lời khen chê.", source: "Kinh Pháp Cú, kệ 81" },
  { text: "Một ngày sống có trí tuệ quý hơn trăm năm sống trong u mê.", source: "Kinh Pháp Cú, kệ 111" },
  { text: "Chớ khinh điều ác nhỏ mà cho là không sao; giọt nước nhỏ mãi cũng đầy chum.", source: "Kinh Pháp Cú, kệ 121" },
  { text: "Chớ khinh điều thiện nhỏ mà cho là không đáng; giọt nước nhỏ mãi cũng đầy chum.", source: "Kinh Pháp Cú, kệ 122" },
  { text: "Không làm các điều ác, siêng làm các việc lành, giữ tâm ý trong sạch — đó là lời chư Phật dạy.", source: "Kinh Pháp Cú, kệ 183" },
  { text: "Lời nói dù cả ngàn mà vô nghĩa, không bằng một câu có ích, nghe xong được an tịnh.", source: "Kinh Pháp Cú, kệ 100" },
  { text: "Không bệnh là lợi lớn nhất, biết đủ là giàu nhất, niềm tin là bà con tốt nhất, Niết-bàn là an lạc nhất.", source: "Kinh Pháp Cú, kệ 204" },
  { text: "Hãy tự mình thắp đuốc lên mà đi." },
  { text: "Đi như thế nào để mỗi bước chân là một bước an lạc." },
  { text: "Thở vào, tôi biết tôi đang thở vào. Thở ra, tôi mỉm cười." },
  { text: "Gieo nhân nào, gặt quả nấy." },
  { text: "Buông bỏ được, lòng nhẹ như mây." },
  { text: "Một điều nhịn, chín điều lành." },
];

export type FortuneLevel = "Thượng" | "Trung" | "Bình";

export interface Fortune {
  level: FortuneLevel;
  text: string;
}

export const FORTUNES: Fortune[] = [
  { level: "Thượng", text: "Mây tan trăng hiện. Việc đang chờ sẽ đến lúc thuận — cứ kiên nhẫn và làm điều tốt." },
  { level: "Thượng", text: "Gió xuân về sân. Người thân an vui, công việc hanh thông nhờ lòng thành." },
  { level: "Thượng", text: "Hạt giống lành đã gieo, nay đến mùa nảy mầm. Hãy chăm sóc nó mỗi ngày." },
  { level: "Thượng", text: "Thuyền gặp gió thuận. Mạnh dạn bước tới, nhưng nhớ giữ lời hứa." },
  { level: "Trung", text: "Nước chảy đá mòn. Điều mong cầu cần thêm thời gian — đừng nản." },
  { level: "Trung", text: "Đường quanh co nhưng vẫn tới nơi. Bớt vội, thêm cẩn trọng." },
  { level: "Trung", text: "Trăng có lúc tròn lúc khuyết. Giữ tâm bình thản, mọi chuyện sẽ qua." },
  { level: "Trung", text: "Một lời xin lỗi đúng lúc mở được nhiều cánh cửa." },
  { level: "Bình", text: "Hôm nay hợp nghỉ ngơi và lắng nghe. Điều quan trọng thường đến trong tĩnh lặng." },
  { level: "Bình", text: "Cây cần rễ sâu mới vững. Lo việc nhà, giữ sức khỏe trước đã." },
  { level: "Bình", text: "Sương sớm rồi tan. Điều lo lắng nhỏ hơn bạn tưởng." },
  { level: "Bình", text: "Chia sẻ một bữa cơm, một lời hỏi thăm — phúc đến từ những điều giản dị." },
];

/** Pick one item (random is injectable for tests). */
export function pick<T>(list: readonly T[], random: () => number = Math.random): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}
