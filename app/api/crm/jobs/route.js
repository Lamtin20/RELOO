import { requirePermission } from "@/lib/operations/permissions";
import { assertOrigin, errorResponse, HttpError, readJson } from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "jobs.write");
    const input = await readJson(request);
    if (input.retryId) {
      const result = await db.from("automation_jobs").update({ status: "QUEUED", run_at: new Date().toISOString(), locked_at: null }).eq("id", input.retryId).eq("status", "FAILED").lt("attempts", 5).select("id").single();
      if (result.error) throw new HttpError(400, "Tác vụ không thể thử lại.");
    } else {
      if (!["SYNC_AFFILIATE_CATALOG", "SYNC_MARKET_PRICES"].includes(input.kind)) throw new HttpError(400, "Tác vụ không được hỗ trợ.");
      if (input.kind === "SYNC_AFFILIATE_CATALOG" && !process.env.ACCESSTRADE_ACCESS_KEY) throw new HttpError(503, "Chưa có khóa publisher và quyền cashback của nhà cung cấp.");
      const result = await db.from("automation_jobs").insert({ kind: input.kind, created_by: profile.id }); if (result.error) throw new Error("Job storage unavailable");
    }
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
