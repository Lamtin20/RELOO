import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapAssetRow } from "@/lib/db/map-from-db";
import { errorResponse, HttpError } from "@/lib/server/http";
export async function GET() {
  try {
    const db = createSupabaseAdminClient();
    if (!db) throw new HttpError(503, "Chưa tải được Local Brand.");
    const result = await db
      .from("local_brands")
      .select(
        "id,name,owner_id,description,image_url,local_brand_products(asset_id)",
      )
      .eq("status", "ACTIVE")
      .order("name")
      .limit(60);
    if (result.error) throw new HttpError(503, "Chưa tải được Local Brand.");
    const ids = [
        ...new Set(
          result.data.flatMap((b) =>
            b.local_brand_products.map((p) => p.asset_id),
          ),
        ),
      ],
      products = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = await db
        .from("assets")
        .select("*")
        .in("id", ids.slice(offset, offset + 100))
        .eq("status", "available")
        .eq("is_locked", false);
      if (batch.error)
        throw new HttpError(503, "Chưa tải được sản phẩm thương hiệu.");
      products.push(...batch.data);
    }
    const brands = result.data.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      image: b.image_url,
      ownerId: b.owner_id,
      products: products
        .filter(
          (p) =>
            p.owner_id === b.owner_id &&
            b.local_brand_products.some((x) => x.asset_id === p.id) &&
            ["SALE", "BOTH"].includes(p.listing_data?.transactionMode),
        )
        .map((p) => ({ ...mapAssetRow(p), localBrandName: b.name })),
    }));
    return Response.json(
      { ok: true, brands },
      { headers: { "Cache-Control": "public,max-age=30" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
