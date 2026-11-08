import { securityDb, screenPhone, ipHash } from "../security/service.js";
import { HttpError } from "../server/http.js";
import { queueIdentifier } from "../security/identifiers.js";
import {assertUniqueContact,duplicateError} from './duplicates.js';

export async function assertRegistrationStorageReady(db = securityDb()) {
  const tables = [
    "profiles",
    "phone_screening_checks",
    "risk_cases",
    "security_audit",
  ];
  const results = await Promise.all(
    tables.map((table) =>
      db.from(table).select("id", { count: "exact" }).limit(0),
    ),
  );
  if (results.some((result) => result.error || !Number.isInteger(result.count)))
    throw new HttpError(
      503,
      "Dịch vụ đăng ký đang chưa sẵn sàng. Tài khoản chưa được tạo; vui lòng thử lại sau.",
      "REGISTRATION_STORAGE_UNAVAILABLE",
    );
}

export async function provisionAccountProfile(
  authUser,
  input,
  request,
  screening,
) {
  if (!authUser.email && !authUser.phone)
    throw new HttpError(
      400,
      "Tài khoản đăng nhập chưa cung cấp email.",
      "EMAIL_REQUIRED",
    );
  const db = securityDb();
  await assertUniqueContact(db,authUser.email||null,input.phone,authUser.id);
  const check = screening || (await screenPhone(input.phone, db));
  const avatar = authUser.user_metadata?.avatar_url;
  const { data, error } = await db.rpc(input.details?"reloo_finish_signup_profile":"reloo_complete_auth_profile", {
    p_auth_user_id: authUser.id,
    p_email: authUser.email?.toLowerCase()||null,
    ...(input.details?{p_details:input.details}:{}),
    p_name: input.name,
    p_phone: check.phone,
    p_role: input.role,
    p_avatar_url:
      typeof avatar === "string" &&
      avatar.length < 1500 &&
      avatar.startsWith("https://")
        ? avatar
        : null,
    p_status: check.status,
    p_results: check.results,
    p_ip_hash: ipHash(request),
  });
  if(error?.message?.includes('IDENTIFIER_EXISTS'))throw duplicateError();
  if (error)
    throw new HttpError(
      503,
      "Đăng nhập đã được xác nhận nhưng hồ sơ chưa hoàn tất. Bạn có thể đăng nhập lại để bổ sung hồ sơ; chưa được kích hoạt giao dịch.",
      "PROFILE_PROVISION_FAILED",
    );
  if (process.env.RELOO_PRIVATE_DATA_KEY && data.profile_id) {
    await queueIdentifier(db, data.profile_id, "PHONE", check.phone);
    if(authUser.email)await queueIdentifier(db, data.profile_id, "EMAIL", authUser.email);
  }
  return data;
}
