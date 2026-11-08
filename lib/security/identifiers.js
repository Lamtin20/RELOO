import { normalizePhone } from "../phone.js";
import { encryptPrivate, privateHash } from "../operations/crypto.js";
import { HttpError } from "../server/http.js";

export function normalizeIdentifier(kind, raw, bankCode = "") {
  if (typeof raw !== "string") throw new HttpError(400, "Thông tin cần kiểm tra không hợp lệ.");
  let value = raw.trim();
  if (["PHONE", "ZALO"].includes(kind)) value = normalizePhone(value);
  else if (kind === "EMAIL") value = value.toLowerCase();
  else if (kind === "BANK") value = value.replace(/[\s.-]/g, "");
  else throw new HttpError(400, "Loại thông tin không được hỗ trợ.");
  if (!value || (kind === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) || value.length > 254 ||
      (kind === "BANK" && (!/^\d{6,30}$/.test(value) || !/^[A-Z0-9_-]{2,30}$/i.test(bankCode)))) {
    throw new HttpError(400, "Kiểm tra lại số điện thoại, email hoặc tài khoản ngân hàng.");
  }
  return { value, bankCode: kind === "BANK" ? bankCode.toUpperCase() : "" };
}
export function lookupLinks(kind, value) {
  const checkscam = new URL("https://checkscam.vn/"); checkscam.searchParams.set("qh_ss", value);
  const cld = new URL("https://chongluadao.vn/analyze/");
  cld.searchParams.set("q", value); cld.searchParams.set("type", kind === "EMAIL" ? "email" : "misc"); cld.searchParams.set("mode", "standard");
  return { checkscam: checkscam.href, chongluadao: cld.href };
}
export async function queueIdentifier(db, profileId, kind, raw, bankCode = "") {
  const { value, bankCode: bank } = normalizeIdentifier(kind, raw, bankCode);
  const hash = privateHash(`${kind}:${bank}`, value);
  const { data: prior, error: readError } = await db.from("risk_identifiers").select("id,status").eq("profile_id", profileId).eq("kind", kind).eq("bank_code", bank).eq("value_hash", hash).maybeSingle();
  if (readError) throw new HttpError(503, "Chưa đọc được hồ sơ đối chiếu.");
  if (prior) return requestIdentifierCheck(db, profileId, prior);
  const masked = kind === "EMAIL" ? `${value.slice(0, 2)}***@${value.split("@")[1]}` : `***${value.slice(-4)}`;
  const { data, error } = await db.from("risk_identifiers").insert({ profile_id: profileId, kind, bank_code: bank, value_hash: hash, value_encrypted: encryptPrivate(value), masked_value: masked }).select("id,status").single();
  if (error) throw new HttpError(503, "Chưa lưu được thông tin kiểm tra.");
  return requestIdentifierCheck(db, profileId, data);
}
async function requestIdentifierCheck(db, profileId, identifier) {
  const { data, error } = await db.rpc("reloo_request_identifier_check", {
    p_profile: profileId,
    p_identifier: identifier.id,
  });
  if (error || !data?.[0]) throw new HttpError(503, "Chưa tạo được lịch kiểm tra.");
  return { ...identifier, job: data[0] };
}
