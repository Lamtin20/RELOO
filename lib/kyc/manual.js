export const REVIEW_DAYS = 3;
export function manualKycEnabled() {
  return process.env.RELOO_KYC_MODE !== "VNPT";
}
export function vietnamToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function validExpiry(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= vietnamToday(now)
  );
}
export function validPhotoSession(session, profileId, now = Date.now()) {
  return (
    !!session &&
    session.profile_id === profileId &&
    !session.consumed_at &&
    Date.parse(session.issued_at) <= now &&
    Date.parse(session.expires_at) > now
  );
}
