import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "short-report", 8);
    const { profile, db } = await requireAccount(request, { active: false }),
      input = await readJson(request);
    if (
      !/^[a-f0-9-]{36}$/i.test(input.id || "") ||
      typeof input.reason !== "string" ||
      input.reason.trim().length < 10 ||
      input.reason.length > 2000
    )
      throw new HttpError(400, "Nhập lý do báo cáo tối thiểu 10 ký tự.");
    const video = await db
      .from("short_videos")
      .select("profile_id")
      .eq("id", input.id)
      .eq("status", "PUBLISHED")
      .single();
    if (video.error) throw new HttpError(404, "Video không còn hiển thị.");
    const result = await db
      .from("short_video_reports")
      .upsert(
        {
          video_id: input.id,
          profile_id: profile.id,
          reason: input.reason.trim(),
        },
        { onConflict: "video_id,profile_id" },
      );
    if (result.error) throw result.error;
    if (input.block === true && profile.id !== video.data.profile_id) {
      const block = await db
        .from("short_video_blocks")
        .upsert({
          profile_id: profile.id,
          blocked_profile_id: video.data.profile_id,
        });
      if (block.error) throw block.error;
    }
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
