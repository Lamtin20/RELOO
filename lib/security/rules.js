export const SCREENING_STATUS = Object.freeze({
  MATCH: "MATCH",
  NO_MATCH: "NO_MATCH",
  UNKNOWN: "UNKNOWN",
  UNAVAILABLE: "UNAVAILABLE",
  STALE: "STALE",
});

export { normalizePhone } from "../phone.js";

export function normalizeScreeningResult(result, now = Date.now()) {
  const allowed = Object.values(SCREENING_STATUS);
  if (!allowed.includes(result?.status))
    return {
      ...result,
      status: "UNKNOWN",
      reason: "Không đọc được kết quả của nguồn.",
    };
  if (["MATCH", "NO_MATCH"].includes(result.status)) {
    const expiry = Date.parse(result.expiresAt || "");
    if (!Number.isFinite(expiry) || expiry <= now)
      return { ...result, originalStatus: result.status, status: "STALE" };
    if (result.status === "MATCH" && !result.evidence?.length)
      return {
        ...result,
        status: "UNKNOWN",
        reason: "Thiếu bằng chứng đối chiếu.",
      };
    if (result.status === "NO_MATCH" && result.complete !== true)
      return {
        ...result,
        status: "UNKNOWN",
        reason: "Nguồn chưa xác nhận phạm vi tra cứu đầy đủ.",
      };
  }
  return result;
}

export function aggregateScreening(results, now = Date.now()) {
  const normalized = results.map((result) =>
    normalizeScreeningResult(result, now),
  );
  const status = normalized.some((result) => result.status === "MATCH")
    ? "MATCH"
    : normalized.some((result) => result.status === "STALE")
      ? "STALE"
      : normalized.some((result) => result.status === "UNAVAILABLE")
        ? "UNAVAILABLE"
        : normalized.length > 0 &&
            normalized.every((result) => result.status === "NO_MATCH")
          ? "NO_MATCH"
          : "UNKNOWN";
  return {
    status,
    results: normalized,
    activation:
      status === "NO_MATCH"
        ? "ACTIVE"
        : status === "MATCH"
          ? "RESTRICTED"
          : "PENDING",
  };
}

export function ipSignalApplies(
  signal,
  { ipHash, profileId, scope, now = Date.now() },
) {
  if (
    !ipHash ||
    !profileId ||
    signal.profile_id !== profileId ||
    signal.ip_hash !== ipHash ||
    signal.scope !== scope
  )
    return false;
  const expiry = Date.parse(signal.expires_at || "");
  const created = Date.parse(signal.created_at || "");
  return (
    Number.isFinite(expiry) &&
    Number.isFinite(created) &&
    created <= now &&
    expiry > created &&
    expiry > now &&
    expiry - created <= 86400000
  );
}

export function accountMayOperate(
  profile,
  { hasOpenCase = false, now = Date.now() } = {},
) {
  if (
    !profile ||
    profile.status !== "active" ||
    profile.activation_status !== "ACTIVE" ||
    hasOpenCase
  )
    return false;
  return (
    Number.isFinite(Date.parse(profile.screening_valid_until || "")) &&
    Date.parse(profile.screening_valid_until) > now
  );
}
