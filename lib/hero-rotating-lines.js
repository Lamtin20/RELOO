export const HERO_TITLE_LEAD = "Thuê đồ xịn,";

export const HERO_DEFAULT_LINE = "chỉ tính tiền ngày dùng.";

/** Phần động sau "Thuê đồ xịn," — tiện lợi, không gắn danh mục */
export const HERO_TAGLINE_SUFFIXES = [
  "chỉ tính tiền ngày dùng.",
  "chạm là có khỏi lo sở hữu.",
  "giao tận tay trả một chạm.",
  "cứ trải nghiệm trước chốt sở hữu sau.",
  "quét VietQR ting ting minh bạch.",
  "cọc an toàn hoàn tiền nhanh chóng.",
];

export function buildHeroRotatingLines() {
  return [...HERO_TAGLINE_SUFFIXES];
}
