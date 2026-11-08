import { requirePermission } from "@/lib/operations/permissions";
import { BANNER_SLOTS, bannerImageFits } from "@/lib/content/banner-slots";
import {
  assertOrigin,
  readJson,
  errorResponse,
  HttpError,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "content.read");
    const { data, error } = await db
      .from("banner_campaigns")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return Response.json(
      { ok: true, banners: data, slots: BANNER_SLOTS },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "content.write"),
      input = await readJson(request),
      slot = BANNER_SLOTS[input.placement];
    if (
      !slot ||
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(input.status) ||
      !input.title?.trim() ||
      input.title.length > 180 ||
      !input.alt?.trim() ||
      input.alt.length > 250
    )
      throw new HttpError(400, "Cần tiêu đề, vị trí và mô tả banner.");
    if (!/^(\/[^/]|https:\/\/)/.test(input.href || ""))
      throw new HttpError(
        400,
        "Link banner cần HTTPS hoặc đường dẫn trong website.",
      );
    const assets = await db
      .from("media_assets")
      .select("id,width,height")
      .in("id", [input.desktop_id, input.mobile_id]);
    if (
      assets.error ||
      !bannerImageFits(
        assets.data.find((a) => a.id === input.desktop_id),
        slot.desktop,
      ) ||
      !bannerImageFits(
        assets.data.find((a) => a.id === input.mobile_id),
        slot.mobile,
      )
    )
      throw new HttpError(
        400,
        "Kích thước/tỷ lệ ảnh chưa phù hợp vị trí. Chọn hai ảnh theo kích thước hướng dẫn.",
      );
    const start = input.starts_at
        ? new Date(input.starts_at).toISOString()
        : null,
      end = input.ends_at ? new Date(input.ends_at).toISOString() : null;
    if (start && end && start >= end)
      throw new HttpError(
        400,
        "Thời gian kết thúc phải sau thời gian bắt đầu.",
      );
    const data = {
      title: input.title.trim(),
      placement: input.placement,
      desktop_id: input.desktop_id,
      mobile_id: input.mobile_id,
      alt: input.alt.trim(),
      href: input.href,
      starts_at: start,
      ends_at: end,
      priority: Math.max(
        0,
        Math.min(100, Math.trunc(Number(input.priority) || 0)),
      ),
      status: input.status,
      updated_at: new Date().toISOString(),
    };
    const result = input.id
      ? await db
          .from("banner_campaigns")
          .update({ ...data, version: input.version + 1 })
          .eq("id", input.id)
          .eq("version", input.version)
          .select("id")
          .single()
      : await db
          .from("banner_campaigns")
          .insert({ ...data, created_by: profile.id })
          .select("id")
          .single();
    if (result.error)
      throw new HttpError(409, "Banner đã thay đổi hoặc chưa lưu được.");
    await db
      .from("security_audit")
      .insert({
        actor_id: profile.id,
        action: "BANNER_UPDATED",
        details: {
          id: result.data.id,
          placement: data.placement,
          status: data.status,
        },
      });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
