import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "content.read");
    const [videos, reports] = await Promise.all([
      db
        .from("short_videos")
        .select(
          "id,profile_id,media_id,caption,status,version,created_at,profiles!short_videos_profile_id_fkey(name),short_video_products(title,href,kind)",
        )
        .in("status", ["PENDING", "PUBLISHED", "REJECTED"])
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("short_video_reports")
        .select("id,video_id,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (videos.error || reports.error)
      throw new Error("SHORT_REVIEW_READ_FAILED");
    return Response.json(
      { ok: true, videos: videos.data, reports: reports.data },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "content.write"),
      input = await readJson(request);
    if (
      !/^[a-f0-9-]{36}$/i.test(input.id || "") ||
      !Number.isInteger(input.version) ||
      typeof input.publish !== "boolean" ||
      typeof input.reason !== "string" ||
      input.reason.trim().length < 10 ||
      input.reason.length > 2000
    )
      throw new HttpError(400, "Chọn video và ghi lý do duyệt.");
    const result = await db.rpc("reloo_review_short", {
      p_actor: profile.id,
      p_id: input.id,
      p_version: input.version,
      p_publish: input.publish,
      p_reason: input.reason.trim(),
    });
    if (result.error)
      throw new HttpError(
        409,
        "Video đã thay đổi hoặc tài khoản chưa được phép đăng.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
