/**
 * Chuẩn hóa chuỗi tìm kiếm — bỏ dấu tiếng Việt, lowercase
 */
export function normalizeSearch(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim();
}

export function matchesBankQuery(bank, query) {
  if (!query) return true;
  const q = normalizeSearch(query);
  return [bank.shortName, bank.name, bank.code, bank.bin]
    .filter(Boolean)
    .some((part) => normalizeSearch(part).includes(q));
}

/** Ngân hàng phổ biến — ưu tiên đầu danh sách */
export const POPULAR_BANK_CODES = [
  "VCB",
  "BIDV",
  "MB",
  "TCB",
  "ACB",
  "VPB",
  "STB",
  "HDB",
  "SHB",
  "EIB",
  "VIB",
  "OCB",
  "MSB",
  "TPB",
];

export function sortBanks(banks) {
  const rank = new Map(POPULAR_BANK_CODES.map((code, i) => [code, i]));
  return [...banks].sort((a, b) => {
    const ra = rank.has(a.code) ? rank.get(a.code) : 999;
    const rb = rank.has(b.code) ? rank.get(b.code) : 999;
    if (ra !== rb) return ra - rb;
    return (a.shortName || a.name || "").localeCompare(b.shortName || b.name || "", "vi");
  });
}

export function filterLookupSupported(banks) {
  return banks.filter((b) => b.lookupSupported === 1);
}

/**
 * Kiểm tra số tài khoản hợp lệ (chuỗi, giữ số 0 đầu)
 */
export function isValidAccountNumber(value) {
  const s = String(value || "").trim();
  if (!/^[0-9A-Za-z-]{6,20}$/.test(s)) return false;
  return /\d/.test(s);
}

export function sanitizeAccountNumber(value) {
  return String(value || "")
    .replace(/[^\dA-Za-z-]/g, "")
    .slice(0, 20);
}
