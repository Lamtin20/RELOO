import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "risk-appeal", 5);
    const { profile, db } = await requireAccount(request, { active: false });
    const { caseId, explanation, evidence = [] } = await readJson(request);
    if (
      typeof explanation !== "string" ||
      explanation.trim().length < 20 ||
      explanation.length > 4000 ||
      !Array.isArray(evidence) ||
      evidence.length > 5
    )
      throw new HttpError(
        400,
        "Vui lòng mô tả ít nhất 20 ký tự và tối đa 5 liên kết bằng chứng.",
      );
    if (
      evidence.some(
        (item) =>
          typeof item !== "string" ||
          item.length > 1500 ||
          !item.startsWith("https://"),
      )
    )
      throw new HttpError(400, "Bằng chứng cần là liên kết HTTPS.");
    const { data, error } = await db.rpc("reloo_submit_appeal", {
      p_profile_id: profile.id,
      p_case_id: caseId,
      p_explanation: explanation.trim(),
      p_evidence: evidence,
    });
    if (error)
      throw new HttpError(
        400,
        "Không gửi được yêu cầu xác minh cho hồ sơ này.",
      );
    return Response.json({ ok: true, appealId: data });
  } catch (error) {
    return errorResponse(error);
  }
}
