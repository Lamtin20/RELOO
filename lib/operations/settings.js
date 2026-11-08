import { HttpError } from "../server/http.js";
import { ENTITY_FIELDS } from "./entity-fields.js";
export function validateEntity(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !Object.hasOwn(ENTITY_FIELDS, key))
  )
    throw new HttpError(400, "Thông tin pháp nhân không hợp lệ.");
  const result = {};
  for (const key of Object.keys(ENTITY_FIELDS)) {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.length > 500)
      throw new HttpError(400, "Thông tin khai báo vượt giới hạn.");
    result[key] = value.trim() || null;
  }
  if (result.taxId && !/^\d{10}(?:-\d{3})?$/.test(result.taxId))
    throw new HttpError(
      400,
      "Mã số thuế cần 10 chữ số hoặc mã đơn vị phụ thuộc.",
    );
  for (const key of ["supportEmail", "privacyEmail"])
    if (result[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result[key]))
      throw new HttpError(400, "Email khai báo chưa hợp lệ.");
  if (result.commerceRegistrationUrl) {
    const url = new URL(result.commerceRegistrationUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      !["online.gov.vn", "www.online.gov.vn"].includes(url.hostname)
    )
      throw new HttpError(400, "Liên kết đăng ký phải thuộc online.gov.vn.");
  }
  return result;
}
export function entityReady(entity) {
  return [
    "legalName",
    "taxId",
    "registrationNumber",
    "address",
    "representative",
    "supportEmail",
    "privacyEmail",
  ].every((key) => Boolean(entity?.[key]));
}
export async function publicBusiness(db,{normalizeEntity=true}={}) {
  const { data, error } = await db
    .from("business_settings")
    .select("version,entity,deposit,updated_at")
    .eq("id", true)
    .single();
  if (error) throw new Error("BUSINESS_SETTINGS_UNAVAILABLE");
  const entity=normalizeEntity?validateEntity(Object.fromEntries(Object.keys(ENTITY_FIELDS).map(key=>[key,data.entity?.[key]??null]))):data.entity||{};
  return { ...data, entity, entityReady: entityReady(entity) };
}
