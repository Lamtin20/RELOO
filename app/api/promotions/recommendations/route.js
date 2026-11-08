import { requireAccount } from "@/lib/security/authorization";
import { errorResponse, HttpError, rateLimit } from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    rateLimit(request, "offer-recommend:" + profile.id, 40);
    const params = new URL(request.url).searchParams;
    let provider, service, gross;
    if (params.has("agreement")) {
      const r = await db
        .from("rental_agreements")
        .select("lender_id,renter_id,rent_amount,status")
        .eq("id", params.get("agreement"))
        .maybeSingle();
      if (
        r.error ||
        !r.data ||
        r.data.renter_id !== profile.id ||
        !["ACCEPTED", "ACTIVE"].includes(r.data.status)
      )
        throw new HttpError(404, "Không có đơn thuê phù hợp.");
      provider = r.data.lender_id;
      service = "RENTAL";
      gross = r.data.rent_amount;
    } else if (params.has("order")) {
      const r = await db
        .from("purchase_orders")
        .select("seller_id,buyer_id,price,status")
        .eq("id", params.get("order"))
        .maybeSingle();
      if (
        r.error ||
        !r.data ||
        r.data.buyer_id !== profile.id ||
        !["REQUESTED", "CONFIRMED"].includes(r.data.status)
      )
        throw new HttpError(404, "Không có đơn mua phù hợp.");
      provider = r.data.seller_id;
      service = "SALE";
      gross = r.data.price;
    } else {
      const kind = params.get("kind"),
        days = Number(params.get("days") || 1);
      if (
        !["RENTAL", "SALE"].includes(kind) ||
        !Number.isInteger(days) ||
        days < 1 ||
        days > 365
      )
        throw new HttpError(400, "Thông tin đơn hàng chưa hợp lệ.");
      const r = await db
        .from("assets")
        .select("owner_id,daily_price,listing_data,status,is_locked")
        .eq("id", params.get("listing") || "")
        .maybeSingle();
      if (
        r.error ||
        !r.data ||
        r.data.status !== "available" ||
        r.data.is_locked
      )
        throw new HttpError(404, "Sản phẩm chưa sẵn sàng.");
      if (
        (kind === "SALE" &&
          !["SALE", "BOTH"].includes(r.data.listing_data?.transactionMode)) ||
        (kind === "RENTAL" && r.data.listing_data?.transactionMode === "SALE")
      )
        throw new HttpError(400, "Loại giao dịch chưa phù hợp.");
      provider = r.data.owner_id;
      service = kind;
      gross =
        kind === "SALE"
          ? r.data.listing_data.salePrice
          : Number(r.data.daily_price) * days;
    }
    if (!Number.isSafeInteger(Number(gross)) || Number(gross) <= 0)
      throw new HttpError(400, "Chưa có giá để xét ưu đãi.");
    const r = await db.rpc("reloo_recommend_promotions", {
      p_profile: profile.id,
      p_provider: provider,
      p_service: service,
      p_gross: String(gross),
    });
    if (r.error) throw new HttpError(503, "Chưa kiểm tra được ưu đãi.");
    return Response.json(
      { ok: true, offers: r.data, previewOnly: true },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
