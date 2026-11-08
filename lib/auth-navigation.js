export const ACCOUNT_ROLES = ["renter", "lender", "both"];
export function loginLanding(value){const next=safeNextPath(value);return /^\/(crm(?:\/|\?|$)|admin(?:\/|\?|$)|rent\/|purchase\/|checkout\/|lend(?:\?|$)|account\/calendar(?:\?|$)|auth\/reset(?:\?|$)|mobile\/auth(?:\?|$)|verify-identity(?:\?|$)|dashboard\/kyc(?:\/|$))/.test(next)?next:'/';}

export function oauthMessage(code) {
  const messages = {
    oauth_cancelled:
      "Bạn đã hủy đăng nhập tài khoản. Có thể thử lại hoặc dùng email.",
    oauth_failed: "Chưa xác nhận được đăng nhập tài khoản. Vui lòng thử lại.",
    oauth_expired:
      "Liên kết đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng bắt đầu lại.",
    profile_unavailable:
      "Đăng nhập đã được xác nhận nhưng chưa tải được hồ sơ. Vui lòng thử lại sau.",
  };
  return Object.hasOwn(messages, code) ? messages[code] : "";
}

export function safeNextPath(value, fallback = "/") {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return fallback;
  try {
    const base = "https://reloo.vn";
    const target = new URL(value, base);
    return target.origin === base
      ? `${target.pathname}${target.search}${target.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function authLink(path, next, intent) {
  const query = new URLSearchParams();
  if (next && safeNextPath(next) !== "/") query.set("next", safeNextPath(next));
  if (ACCOUNT_ROLES.includes(intent)) query.set("intent", intent);
  return query.size ? `${path}?${query}` : path;
}

