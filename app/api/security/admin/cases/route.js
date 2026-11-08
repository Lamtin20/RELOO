import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db } = await requireAccount(request, { admin: true });
    const { data: cases, error } = await db
      .from("risk_cases")
      .select(
        "*,profiles!risk_cases_profile_id_fkey(name,phone,activation_status),phone_screening_checks(source_results,result,checked_at)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Storage unavailable");
    const ids = (cases || []).map((item) => item.id);
    const [evidence, appeals, audit] = await Promise.all([
      ids.length
        ? db.from("risk_evidence").select("*").in("case_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? db.from("risk_appeals").select("*").in("case_id", ids)
        : Promise.resolve({ data: [] }),
      db
        .from("security_audit")
        .select("id,actor_id,subject_id,action,details,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (evidence.error || appeals.error || audit.error)
      throw new Error("Storage unavailable");
    return Response.json(
      {
        ok: true,
        cases,
        evidence: evidence.data,
        appeals: appeals.data,
        audit: audit.data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, { admin: true });
    const {
      caseId,
      action,
      reason,
      evidence = [],
      validHours = 720,
    } = await readJson(request);
    if (
      typeof reason !== "string" ||
      reason.length < 20 ||
      reason.length > 4000 ||
      !["VERIFY", "RESTRICT", "CLEAR"].includes(action) ||
      !Array.isArray(evidence) ||
      evidence.length > 10 ||
      !Number.isInteger(validHours) ||
      validHours < 1 ||
      validHours > 720
    )
      throw new HttpError(
        400,
        "Kiểm tra quyết định, lý do và thời hạn xác minh.",
      );
    if (
      evidence.some(
        (item) =>
          typeof item.url !== "string" ||
          !item.url.startsWith("https://") ||
          item.url.length > 1500 ||
          typeof item.note !== "string" ||
          item.note.length < 10 ||
          item.note.length > 2000,
      )
    )
      throw new HttpError(
        400,
        "Bằng chứng cần có liên kết HTTPS và ghi chú đối chiếu.",
      );
    const { error } = await db.rpc("reloo_review_case", {
      p_actor_id: profile.id,
      p_case_id: caseId,
      p_action: action,
      p_reason: reason,
      p_evidence: evidence,
      p_valid_hours: validHours,
    });
    if (error)
      throw new HttpError(
        400,
        "Quyết định chưa được lưu. Gỡ hạn chế cần có bằng chứng xác minh.",
      );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
