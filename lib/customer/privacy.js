/**
 * Che số tài khoản cho hiển thị / audit log
 */
export function maskAccountNumber(accountNumber) {
  const s = String(accountNumber || "").replace(/\s/g, "");
  if (!s) return "";
  if (s.length <= 4) return "*".repeat(s.length);
  return `${"*".repeat(Math.max(4, s.length - 4))}${s.slice(-4)}`;
}

export function accountNumberLast4(accountNumber) {
  const s = String(accountNumber || "").replace(/\s/g, "");
  return s.slice(-4);
}

/**
 * Demo obfuscation — production nên dùng KMS / AES-GCM
 */
export function obfuscateAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  const payload = Buffer.from(String(accountNumber), "utf8").toString("base64");
  return `enc:${payload}`;
}

export function deobfuscateAccountNumber(token) {
  if (!token || !String(token).startsWith("enc:")) return null;
  try {
    return Buffer.from(String(token).slice(4), "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
