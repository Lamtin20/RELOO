import { requirePermission } from "@/lib/operations/permissions";
import { integrationConfig } from "@/lib/operations/integrations";
import { assertOrigin, errorResponse, HttpError } from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(
        request,
        "accounting.write",
      ),
      config = await integrationConfig(db, "SEPAY");
    if (!config.bankAccountId)
      throw new HttpError(409, "Chọn tài khoản thu tiền trước khi đồng bộ.");
    const existing = await db
      .from("automation_jobs")
      .select("id")
      .eq("kind", "SYNC_SEPAY")
      .in("status", ["QUEUED", "RUNNING"])
      .limit(1);
    if (existing.data?.length) return Response.json({ ok: true, queued: true });
    const result = await db
      .from("automation_jobs")
      .insert({ kind: "SYNC_SEPAY", created_by: profile.id });
    if (result.error) throw new Error("SYNC_QUEUE_UNAVAILABLE");
    return Response.json({ ok: true, queued: true });
  } catch (e) {
    return errorResponse(e);
  }
}
