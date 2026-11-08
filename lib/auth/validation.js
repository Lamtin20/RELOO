import { normalizePhone, PHONE_ERROR } from "../phone.js";
import { validatePassword } from "../password-policy.js";
import { HttpError } from "../server/http.js";

import { ACCOUNT_ROLES } from "../auth-navigation.js";
export { ACCOUNT_ROLES } from "../auth-navigation.js";
export function validateProfileInput(body) {
  if (!body || body.agree !== true)
    throw new HttpError(
      400,
      "Bạn cần đồng ý điều khoản để tạo tài khoản.",
      "CONSENT_REQUIRED",
    );
  if (
    typeof body.name !== "string" ||
    body.name.trim().length < 2 ||
    body.name.length > 100
  )
    throw new HttpError(400, "Họ tên cần từ 2 đến 100 ký tự.", "INVALID_NAME");
  if (!ACCOUNT_ROLES.includes(body.role || "both"))
    throw new HttpError(400, "Nhu cầu sử dụng chưa hợp lệ.", "INVALID_ROLE");
  const phone = normalizePhone(body.phone);
  if (!phone) throw new HttpError(400, PHONE_ERROR, "INVALID_PHONE");
  return { name: body.name.trim(), phone, role: body.role || "both" };
}
export function validateSignupInput(body) {
  const profile = validateProfileInput(body);
  if (
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  )
    throw new HttpError(400, "Email chưa hợp lệ.", "INVALID_EMAIL");
  const error = validatePassword(body.password);
  if (error) throw new HttpError(400, error, "INVALID_PASSWORD");
  return {
    ...profile,
    email: body.email.trim().toLowerCase(),
    password: body.password,
  };
}
