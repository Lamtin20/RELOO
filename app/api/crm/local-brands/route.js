import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
import { safePartnerImage } from "@/lib/marketplace-channels";
import {prepareListingImages} from '@/lib/images/listing-media';
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "content.read"),
      r = await db
        .from("local_brands")
        .select("*,local_brand_products(asset_id)")
        .order("updated_at", { ascending: false });
    if (r.error) throw new HttpError(503, "Chưa tải được đối tác.");
    return Response.json(
      { ok: true, brands: r.data },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  let prepared;
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "content.write"),
      d = await readJson(request, 12000);
    if (
      typeof d.name !== "string" ||
      d.name.trim().length < 2 ||
      d.name.length > 80 ||
      typeof d.ownerId !== "string" ||
      d.ownerId.length > 150 ||
      typeof d.description !== "string" ||
      d.description.length > 600 ||
      !["DRAFT", "ACTIVE", "PAUSED"].includes(d.status) ||
      !Array.isArray(d.assets) ||
      d.assets.length > 30 ||
      d.assets.some((id) => typeof id !== "string" || id.length > 150) ||
      (d.image && !safePartnerImage(d.image))
    )
      throw new HttpError(
        400,
        "Kiểm tra tên, chủ shop, ảnh RELOO và sản phẩm.",
      );
    if(d.image?.startsWith('/images/')){
     prepared=await prepareListingImages([d.image],{db,ownerId:profile.id,purpose:'brand'});
     d.image=prepared.urls[0];
    }
    const r = await db.rpc("reloo_save_local_brand", {
      p_actor: profile.id,
      p_id: d.id || null,
      p_version: d.version || 0,
      p_name: d.name.trim(),
      p_owner: d.ownerId,
      p_description: d.description,
      p_image: d.image || "",
      p_status: d.status,
      p_assets: d.assets,
    });
    if (r.error)
      throw new HttpError(
        409,
        "Không lưu được: kiểm tra quyền sở hữu sản phẩm hoặc tải lại phiên bản.",
      );
    return Response.json({ ok: true, id: r.data });
  } catch (e) {
    if(prepared)await prepared.rollback();
    return errorResponse(e);
  }
}
