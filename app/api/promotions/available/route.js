import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorResponse, HttpError } from "@/lib/server/http";
export async function GET() {
  try {
    const db = createSupabaseAdminClient();
    if (!db) throw new HttpError(503, "Chưa tải được chương trình.");
    const now = new Date().toISOString(),
      r = await db
        .from("promotion_coupons")
        .select(
          "id,code,discount_type,value,max_discount,minimum_amount,first_order_only,ends_at,promotion_campaigns!inner(id,name,description,terms,services,status,starts_at,ends_at)",
        )
        .eq("status", "ACTIVE")
        .eq("public_code", true)
        .eq("customer_ids", "{}")
        .lte("starts_at", now)
        .gt("ends_at", now)
        .eq("promotion_campaigns.status", "ACTIVE")
        .lte("promotion_campaigns.starts_at", now)
        .gt("promotion_campaigns.ends_at", now)
        .order("ends_at")
        .limit(12);
    if (r.error) throw new HttpError(503, "Chưa tải được chương trình.");
    return Response.json(
      { ok: true, offers: r.data },
      { headers: { "Cache-Control": "public,max-age=30" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
