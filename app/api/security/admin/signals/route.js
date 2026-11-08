import { requireAccount } from "@/lib/security/authorization";
import { normalizePhone } from "@/lib/security/rules";
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
    const { phone, source, evidenceUrl, note, expiresAt } =
      await readJson(request);
    const normalized = normalizePhone(phone);
    const expiry = Date.parse(expiresAt || "");
    if (
      !normalized ||
      !["checkscam", "chongluadao", "user_report", "verified_review"].includes(
        source,
      ) ||
      typeof evidenceUrl !== "string" ||
      !evidenceUrl.startsWith("https://") ||
      evidenceUrl.length > 1500 ||
      typeof note !== "string" ||
      note.length < 20 ||
      note.length > 2000 ||
      !Number.isFinite(expiry) ||
      expiry <= Date.now() ||
      expiry > Date.now() + 30 * 86400000
    )
      throw new HttpError(
        400,
        "Tín hiệu cần số điện thoại, nguồn, bằng chứng và thời hạn tối đa 30 ngày.",
      );
    const { data, error } = await db.rpc("reloo_add_phone_signal", {
      p_actor_id: profile.id,
      p_phone: normalized,
      p_source: source,
      p_url: evidenceUrl,
      p_note: note,
      p_expires_at: new Date(expiry).toISOString(),
    });
    if (error)
      throw new HttpError(503, "Chưa lưu được tín hiệu và nhật ký đối chiếu.");
    return Response.json({ ok: true, signalId: data });
  } catch (error) {
    return errorResponse(error);
  }
}
