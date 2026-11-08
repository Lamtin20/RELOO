import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "risk.read"),
      { data, error } = await db
        .from("integrity_incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
    if (error) throw new Error("INTEGRITY_STORAGE_UNAVAILABLE");
    return Response.json(
      { ok: true, incidents: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "risk.write"),
      input = await readJson(request);
    if (
      !/^[a-f0-9-]{36}$/i.test(input.id || "") ||
      !["CONFIRMED", "DISMISSED"].includes(input.decision) ||
      typeof input.reason !== "string" ||
      input.reason.length < 30 ||
      input.reason.length > 2000
    )
      throw new HttpError(400, "Cần quyết định và căn cứ đối chiếu.");
    const result = await db.rpc("reloo_confirm_integrity_incident", {
      p_actor: profile.id,
      p_id: input.id,
      p_decision: input.decision,
      p_reason: input.reason,
    });
    if (result.error)
      throw new HttpError(
        409,
        "Cảnh báo hệ thống chưa xác định được người thực hiện hoặc chưa đủ điều kiện xác nhận.",
      );
    return Response.json({ ok: true, strikes: result.data });
  } catch (cause) {
    return errorResponse(cause);
  }
}
