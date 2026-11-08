import { normalizeScreeningResult } from './rules.js';
function plain(text) { return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/\s+/g, " ").toLowerCase(); }
function base(source, url) { return { source, sourceUrl: url, checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), complete: false, status: "UNKNOWN", transport: "public_website" }; }
export function parseCheckScam(text, value, url) {
  const result = base("checkscam", url), normalized = plain(text);
  const found = normalized.match(/co\s+([0-9.,]+)\s+canh bao lien quan den/);
  if (!found || !normalized.slice(found.index, found.index + found[0].length + 180).includes(plain(value))) return { ...result, reason: "Chưa xác định được kết quả đúng thông tin đầu vào." };
  const count = Number(found[1].replace(/[.,]/g, ""));
  if (count > 0) return { ...result, status: "MATCH", count, evidence: [{ url, note: `Kết quả tìm kiếm công khai ghi nhận ${count} cảnh báo; cần admin đối chiếu.`, excerpt: text.slice(Math.max(0, text.toLowerCase().indexOf("cảnh báo") - 60), text.toLowerCase().indexOf("cảnh báo") + 180) }] };
  return { ...result, reason: "Không có cảnh báo trong kết quả đọc được; chưa chứng minh phạm vi kiểm tra đầy đủ." };
}
export function parseChongLuaDao(text, url, type) {
  const result = base("chongluadao", url), normalized = plain(text);
  if (type === "ip") {
    const anonymous = normalized.match(/dich vu an danh\s*[:\-]?\s*(co|khong)\b/);
    return anonymous ? { ...result, network: anonymous[1] === "co" ? "ANONYMOUS" : "ORDINARY", evidence: [{ url, note: `Dịch vụ ẩn danh: ${anonymous[1]}` }] } : { ...result, network: "UNKNOWN", reason: "Chưa đọc được trường dịch vụ ẩn danh." };
  }
  if (!['misc', 'phone'].includes(type)) return { ...result, reason: 'Chưa đọc được kết quả cảnh báo phù hợp với loại thông tin này.' };
  const providers = ["icallme", "scam.vn"];
  const cards = providers.map((name) => ({ name, found: normalized.match(new RegExp(name.replace(".", "\\.") + "\\s+(khong tim thay|tim thay|co canh bao|nguy hiem|lua dao)"))?.[1] }));
  const positive = cards.find((card) => card.found && card.found !== "khong tim thay");
  if (positive) return { ...result, status: "MATCH", evidence: [{ url, note: `Nguồn ${positive.name}: ${positive.found}; cần đối chiếu bằng chứng.`, excerpt: text.slice(0, 2500) }] };
  if (cards.every((card) => card.found === 'khong tim thay')) return { ...result, status: 'NO_MATCH', complete: true, scope: 'phone_warning_cards', policy: 'CLD_NOT_FOUND_V1', providers: cards.map((card) => ({ source: card.name, result: 'NOT_FOUND' })), reason: 'Không tìm thấy cảnh báo tại iCallme và Scam.vn. Đủ điều kiện xác nhận số điện thoại theo quy tắc RELOO.' };
  return { ...result, reason: 'Chưa đọc đủ kết quả của iCallme và Scam.vn.' };
}
export function identifierScreeningStatus(results, kind, now = Date.now()) {
  const normalized = results.map((result) => normalizeScreeningResult(result, now));
  if (results.some((result) => result.status === 'MATCH')) return 'MATCH';
  if (['PHONE', 'ZALO'].includes(kind) && normalized.some((result) => result.source === 'chongluadao' && result.status === 'NO_MATCH' && result.complete && result.scope === 'phone_warning_cards' && result.policy === 'CLD_NOT_FOUND_V1' && result.matchedInput === true)) return 'NO_MATCH';
  if (normalized.some((result) => result.status === 'STALE')) return 'STALE';
  return normalized.some((result) => result.status === 'UNAVAILABLE') ? 'UNAVAILABLE' : 'UNKNOWN';
}
