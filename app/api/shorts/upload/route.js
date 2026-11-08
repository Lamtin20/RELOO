import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readMultipart,
  rateLimit,
} from "@/lib/server/http";
import { stageShort, SHORT_ROOT } from "@/lib/shorts/media";
import { SHORT_MAX_BYTES } from "@/lib/shorts/validation";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "short-upload", 4, 3600000);
    const { profile, db } = await requireAccount(request, {
      scope: "listing_write",
    });
    const quota = await db
      .from("short_video_media")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if (quota.error) throw quota.error;
    if (quota.count >= 8)
      throw new HttpError(
        429,
        "Hôm nay bạn đã gửi đủ 8 video. Hãy tiếp tục vào ngày mai.",
      );
    const form = await readMultipart(request, SHORT_MAX_BYTES + 20000),
      id = randomUUID(),
      media = await stageShort(form.get("video"), id,JSON.parse(String(form.get('edit')||'{}'))),
      saved = await db
        .from("short_video_media")
        .insert({ id, profile_id: profile.id, ...media });
    if (saved.error) {
      await unlink(join(SHORT_ROOT, id + ".input")).catch(() => {});
      throw saved.error;
    }
    const queued = await db
      .from("automation_jobs")
      .insert({ kind: "SHORT_TRANSCODE", payload: { mediaId: id } });
    if (queued.error) {
      await db
        .from("short_video_media")
        .update({ status: "FAILED" })
        .eq("id", id);
      await unlink(join(SHORT_ROOT, id + ".input")).catch(() => {});
      throw queued.error;
    }
    return Response.json(
      {
        ok: true,
        mediaId: id,
        status: "PROCESSING",
        duration: media.duration,
        width: media.width,
        height: media.height,
      },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false }),
      id = new URL(request.url).searchParams.get("id");
    if (!/^[a-f0-9-]{36}$/i.test(id || ""))
      throw new HttpError(400, "Video không hợp lệ.");
    const result = await db
      .from("short_video_media")
      .select("status,duration,width,height")
      .eq("id", id)
      .eq("profile_id", profile.id)
      .single();
    if (result.error) throw new HttpError(404, "Không tìm thấy video.");
    return Response.json(
      { ok: true, ...result.data },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
