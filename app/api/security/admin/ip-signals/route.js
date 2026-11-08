import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, { admin: true });
    const { checkId, scope, hours, reason } = await readJson(request);
    if (
      !["chat_write", "listing_write", "inquiry_write", "cashback"].includes(
        scope,
      ) ||
      !Number.isInteger(hours) ||
      hours < 1 ||
      hours > 24 ||
      typeof reason !== "string" ||
      reason.length < 20 ||
      reason.length > 2000
    )
      throw new HttpError(
        400,
        "Chọn tài khoản, nghiệp vụ, lý do và thời hạn tối đa 24 giờ.",
      );
    const { data, error } = await db.rpc("reloo_add_ip_signal", {
      p_actor_id: profile.id,
      p_check_id: checkId,
      p_scope: scope,
      p_reason: reason,
      p_hours: hours,
    });
    if (error)
      throw new HttpError(
        400,
        "Chưa ghi nhận được IP từ nguồn proxy tin cậy cho lần kiểm tra này.",
      );
    return Response.json({ ok: true, signalId: data });
  } catch (error) {
    return errorResponse(error);
  }
}
