/**
 * Màu icon danh mục — gradient pastel + icon đậm, cố định theo slug.
 * Dùng cho CategoryRow trang chủ và các surface tương tự.
 */

const G = (from, to, fg, shadow) => ({
  bg: `linear-gradient(145deg, ${from} 0%, ${to} 100%)`,
  fg,
  shadow,
});

/** @type {Record<string, { bg: string, fg: string, shadow: string }>} */
export const CATEGORY_COLORS_BY_SLUG = {
  camping: G("#d8f8e8", "#7edcb4", "#0a7a52", "rgba(0, 158, 110, 0.28)"),
  "may-anh": G("#dbeafe", "#93c5fd", "#1d4ed8", "rgba(29, 78, 216, 0.24)"),
  "may-quay": G("#e0e7ff", "#a5b4fc", "#4338ca", "rgba(67, 56, 202, 0.24)"),
  "dien-tu": G("#cffafe", "#67e8f9", "#0e7490", "rgba(14, 116, 144, 0.24)"),
  "laptop-pc": G("#ede9fe", "#c4b5fd", "#6d28d9", "rgba(109, 40, 217, 0.24)"),
  "dien-thoai": G("#e0f2fe", "#7dd3fc", "#0369a1", "rgba(3, 105, 161, 0.24)"),
  "me-be": G("#ffe4e6", "#fda4af", "#be123c", "rgba(190, 18, 60, 0.22)"),
  "do-choi": G("#fef3c7", "#fcd34d", "#b45309", "rgba(180, 83, 9, 0.22)"),
  "thoi-trang": G("#fce7f3", "#f9a8d4", "#be185d", "rgba(190, 24, 93, 0.22)"),
  "ao-dai-cuoi": G("#fdf2f8", "#f0abfc", "#a21caf", "rgba(162, 28, 175, 0.22)"),
  "tui-phu-kien": G("#ffedd5", "#fdba74", "#c2410c", "rgba(194, 65, 12, 0.22)"),
  "gia-dung": G("#ecfdf5", "#6ee7b7", "#047857", "rgba(4, 120, 87, 0.24)"),
  "nha-bep": G("#fef9c3", "#fde047", "#a16207", "rgba(161, 98, 7, 0.22)"),
  "noi-that": G("#f5f5f4", "#d6d3d1", "#57534e", "rgba(87, 83, 78, 0.2)"),
  "trang-tri": G("#fff7ed", "#fdba74", "#c2410c", "rgba(194, 65, 12, 0.2)"),
  "xe-may": G("#ffedd5", "#fb923c", "#c2410c", "rgba(194, 65, 12, 0.26)"),
  "xe-dap": G("#dcfce7", "#86efac", "#15803d", "rgba(21, 128, 61, 0.24)"),
  "o-to": G("#e2e8f0", "#94a3b8", "#334155", "rgba(51, 65, 85, 0.24)"),
  "xe-tai": G("#fef3c7", "#fbbf24", "#b45309", "rgba(180, 83, 9, 0.24)"),
  "the-thao": G("#fee2e2", "#fca5a5", "#dc2626", "rgba(220, 38, 38, 0.24)"),
  "golf-tennis": G("#ecfccb", "#bef264", "#4d7c0f", "rgba(77, 124, 15, 0.24)"),
  "be-boi": G("#cffafe", "#22d3ee", "#0e7490", "rgba(14, 116, 144, 0.26)"),
  "leo-nui": G("#d1fae5", "#34d399", "#047857", "rgba(4, 120, 87, 0.26)"),
  "cau-ca": G("#dbeafe", "#60a5fa", "#1d4ed8", "rgba(29, 78, 216, 0.24)"),
  "nhac-cu": G("#f3e8ff", "#d8b4fe", "#7e22ce", "rgba(126, 34, 206, 0.24)"),
  "am-thanh": G("#ede9fe", "#a78bfa", "#6d28d9", "rgba(109, 40, 217, 0.24)"),
  karaoke: G("#fce7f3", "#f472b6", "#db2777", "rgba(219, 39, 119, 0.24)"),
  gaming: G("#ede9fe", "#c084fc", "#7c3aed", "rgba(124, 58, 237, 0.26)"),
  "su-kien": G("#fef08a", "#facc15", "#a16207", "rgba(161, 98, 7, 0.26)"),
  "am-thanh-anh-sang": G("#fef3c7", "#fbbf24", "#b45309", "rgba(180, 83, 9, 0.24)"),
  "trang-tri-cuoi": G("#fdf2f8", "#f9a8d4", "#be185d", "rgba(190, 24, 93, 0.22)"),
  livestream: G("#ffe4e6", "#fb7185", "#e11d48", "rgba(225, 29, 72, 0.24)"),
  "may-chieu": G("#e0e7ff", "#818cf8", "#4338ca", "rgba(67, 56, 202, 0.24)"),
  "cong-cu": G("#ffedd5", "#fdba74", "#ea580c", "rgba(234, 88, 12, 0.24)"),
  "xay-dung": G("#fef3c7", "#fcd34d", "#ca8a04", "rgba(202, 138, 4, 0.24)"),
  "lam-vuon": G("#dcfce7", "#4ade80", "#15803d", "rgba(21, 128, 61, 0.26)"),
  "sach-hoc": G("#e0f2fe", "#7dd3fc", "#0284c7", "rgba(2, 132, 199, 0.24)"),
  "van-phong": G("#f1f5f9", "#cbd5e1", "#475569", "rgba(71, 85, 105, 0.22)"),
  "lam-dep": G("#fdf2f8", "#f0abfc", "#c026d3", "rgba(192, 38, 211, 0.22)"),
  "salon-toc": G("#fce7f3", "#f9a8d4", "#db2777", "rgba(219, 39, 119, 0.22)"),
  "y-te": G("#ccfbf1", "#5eead4", "#0f766e", "rgba(15, 118, 110, 0.26)"),
  "du-lich": G("#dbeafe", "#93c5fd", "#2563eb", "rgba(37, 99, 235, 0.24)"),
  "thu-cung": G("#ffedd5", "#fdba74", "#ea580c", "rgba(234, 88, 12, 0.22)"),
  "nghe-thuat": G("#fef3c7", "#fde68a", "#d97706", "rgba(217, 119, 6, 0.22)"),
  "dieu-hoa": G("#e0f2fe", "#bae6fd", "#0284c7", "rgba(2, 132, 199, 0.22)"),
  "khong-gian": G("#f3e8ff", "#d8b4fe", "#7e22ce", "rgba(126, 34, 206, 0.24)"),
};

const FALLBACK_PALETTE = [
  G("#d8f8e8", "#7edcb4", "#0a7a52", "rgba(0, 158, 110, 0.24)"),
  G("#dbeafe", "#93c5fd", "#1d4ed8", "rgba(29, 78, 216, 0.24)"),
  G("#fce7f3", "#f9a8d4", "#be185d", "rgba(190, 24, 93, 0.22)"),
  G("#fef3c7", "#fcd34d", "#b45309", "rgba(180, 83, 9, 0.22)"),
  G("#ede9fe", "#c4b5fd", "#6d28d9", "rgba(109, 40, 217, 0.24)"),
  G("#ffedd5", "#fdba74", "#c2410c", "rgba(194, 65, 12, 0.22)"),
  G("#ccfbf1", "#5eead4", "#0f766e", "rgba(15, 118, 110, 0.24)"),
  G("#fee2e2", "#fca5a5", "#dc2626", "rgba(220, 38, 38, 0.24)"),
];

export function getCategoryColors(slug, index = 0) {
  if (slug && CATEGORY_COLORS_BY_SLUG[slug]) {
    return CATEGORY_COLORS_BY_SLUG[slug];
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}
