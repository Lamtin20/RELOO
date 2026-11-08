import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export const PHONE_ERROR =
  "Nhập số di động Việt Nam hợp lệ: 10 số bắt đầu bằng 0, hoặc dùng +84.";

export function normalizePhone(value) {
  if (typeof value !== "string" || value.length > 30) return null;
  let input = value.trim();
  if (!/^[+\d\s().-]+$/.test(input)) return null;
  const digits = input.replace(/\D/g, "");
  if (!input.startsWith("+") && digits.startsWith("84") && digits.length === 11)
    input = `+${digits}`;
  else if (input.startsWith("0084")) input = `+84${digits.slice(4)}`;
  else if (!input.startsWith("+") && !input.startsWith("0")) return null;
  const parsed = parsePhoneNumberFromString(input, {
    defaultCountry: "VN",
    extract: false,
  });
  if (
    !parsed ||
    parsed.country !== "VN" ||
    parsed.ext ||
    !parsed.isValid() ||
    parsed.getType() !== "MOBILE" ||
    parsed.nationalNumber.length !== 9
  )
    return null;
  return `0${parsed.nationalNumber}`;
}

export function sanitizePhoneInput(value) {
  return String(value ?? "")
    .replace(/[^\d+\s().-]/g, "")
    .slice(0, 30);
}
