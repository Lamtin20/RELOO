import {assertIdentity} from './identity.js';
import {identityRecordReady} from '../identity-access.js';
import {
  authenticatedIdentity,
  findAccountProfile,
  needsProfileCompletion,
} from "../auth/identity.js";
import { securityDb } from "./service.js";
import { accountMayOperate, ipSignalApplies } from "./rules.js";
import { ipHash } from "./service.js";
import { HttpError } from "../server/http.js";
import { clientIp } from "../server/http.js";
import { privateHash } from "../operations/crypto.js";
import { accountIdentity } from "../kyc/expiry.js";

export async function requireAccount(
  request,
  { active = true, admin = false, scope = "business", identity = scope === "listing_write" } = {},
) {
  const { authUser, client } = await authenticatedIdentity(request);
  const db = securityDb();
  const profile = await findAccountProfile(authUser, db);
  if (!profile)
    throw new HttpError(
      403,
      "Tài khoản chưa có hồ sơ xác minh.",
      "PROFILE_REQUIRED",
    );
  profile.identityStatus = await accountIdentity(db,profile.id);
  if (admin && profile.role !== "admin")
    throw new HttpError(
      403,
      "Chức năng dành cho quản trị viên.",
      "ADMIN_REQUIRED",
    );
  if (
    profile.activation_status === "ACTIVE" &&
    (!profile.screening_valid_until ||
      Date.parse(profile.screening_valid_until) <= Date.now())
  ) {
    const { data: expiry, error: expiryError } = await db.rpc(
      "reloo_record_screening",
      {
        p_profile_id: profile.id,
        p_status: "STALE",
        p_results: [
          {
            source: "verification_clearance",
            status: "STALE",
            reason: "Thời hạn xác minh đã hết.",
            expiresAt: profile.screening_valid_until,
          },
        ],
        p_ip_hash: null,
      },
    );
    if (expiryError)
      throw new HttpError(
        503,
        "Chưa cập nhật được hồ sơ hết hạn. Nghiệp vụ chưa được cho phép.",
      );
    profile.activation_status = expiry.activation_status;
    profile.phone_screening_status = "STALE";
    profile.screening_valid_until = null;
  }
  if(identity)assertIdentity(profile.identityStatus);
  if (active) {

    const publicIp = clientIp(request);
    if (publicIp && process.env.RELOO_PRIVATE_DATA_KEY) {
      const network = await db.from("network_checks").select("result,expires_at").eq("ip_hash", privateHash("NETWORK", publicIp)).maybeSingle();
      if (network.error) throw new HttpError(503, "Chưa kiểm tra được phiên truy cập.");
      if (network.data?.result === "ANONYMOUS" && Date.parse(network.data.expires_at) > Date.now()) throw new HttpError(403, "Vui lòng tắt VPN hoặc dịch vụ ẩn danh trước khi giao dịch hay nhắn tin.", "VPN_REQUIRED_OFF");
    }
    if (needsProfileCompletion(profile))
      throw new HttpError(
        403,
        "Vui lòng bổ sung số điện thoại và hoàn tất hồ sơ.",
        "PROFILE_INCOMPLETE",
      );
    if (!authUser.email_confirmed_at && !authUser.phone_confirmed_at)
      throw new HttpError(
        403,
        "Vui lòng xác nhận số điện thoại hoặc email trước khi giao dịch.",
        "CONTACT_NOT_VERIFIED",
      );
    const { count, error: caseError } = await db
      .from("risk_cases")
      .select("id", { count: "exact" })
      .eq("profile_id", profile.id)
      .in("status", ["OPEN", "VERIFYING", "APPEALED"])
      .limit(0);
    if (caseError || !Number.isInteger(count))
      throw new HttpError(503, "Chưa kiểm tra được hạn chế tài khoản.");
    if (!accountMayOperate(profile, { hasOpenCase: count > 0 }))
      throw new HttpError(
        403,
        "Tài khoản đang chờ xác minh hoặc bị hạn chế. Vui lòng xem hồ sơ an toàn.",
        "ACCOUNT_RESTRICTED",
      );
    const hash = ipHash(request);
    if (hash) {
      const { data: signals, error: signalError } = await db
        .from("scoped_ip_signals")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("ip_hash", hash)
        .eq("scope", scope);
      if (signalError)
        throw new HttpError(503, "Chưa kiểm tra được tín hiệu truy cập.");
      if (
        (signals || []).some((signal) =>
          ipSignalApplies(signal, {
            ipHash: hash,
            profileId: profile.id,
            scope,
          }),
        )
      )
        throw new HttpError(
          403,
          "Phiên truy cập này cần xác minh thêm.",
          "SCOPED_IP_RESTRICTION",
        );
    }
  }
  return { profile, authUser, db, client };
}

export function publicSession(profile) {
  const stale =
    profile.activation_status === "ACTIVE" &&
    (!profile.screening_valid_until ||
      Date.parse(profile.screening_valid_until) <= Date.now());
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    avatar: profile.avatar_url || "/brand/reloo-logo.png",
    role: profile.role,
    kycLevel: profile.identityStatus?.status==='EXPIRED'?'L1':profile.kyc_level,
    identityVerified:identityRecordReady(profile.identityStatus),
    identityStatus:profile.identityStatus?.status||'UNVERIFIED',
    identityExpiresAt:profile.identityStatus?.expiresAt||null,
    identityDaysRemaining:profile.identityStatus?.daysRemaining??null,
    trustScore: profile.trust_score,
    activationStatus: stale ? "PENDING" : profile.activation_status,
    screeningStatus: stale ? "STALE" : profile.phone_screening_status,
    screeningValidUntil: profile.screening_valid_until,
    serverAuthenticated: true,
    profileComplete: !needsProfileCompletion(profile),
    address: profile.profile_data?.address || "",
  };
}
