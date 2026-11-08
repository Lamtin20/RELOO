import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { couponCode } from "@/lib/promotions/rules";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "coupon-preview", 15);
    const { profile, db } = await requireAccount(request, { active: false }),
      input = await readJson(request);
    if (!/^[a-f0-9-]{36}$/i.test(input.agreementId || ""))
      throw new HttpError(400, "Thỏa thuận không hợp lệ.");
    const rental = await db
      .from("rental_agreements")
      .select("renter_id,lender_id,rent_amount,status")
      .eq("id", input.agreementId)
      .single();
    if (
      rental.error ||
      rental.data.renter_id !== profile.id ||
      !["ACCEPTED", "ACTIVE"].includes(rental.data.status)
    )
      throw new HttpError(
        404,
        "Không tìm thấy thỏa thuận được phép áp dụng coupon.",
      );
    let code;
    try {
      code = couponCode(input.code);
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    const r = await db.rpc("reloo_promotion_quote", {
      p_profile: profile.id,
      p_provider: rental.data.lender_id,
      p_service: "RENTAL",
      p_gross: String(rental.data.rent_amount),
      p_code: code,
    });
    if (r.error)
      throw new HttpError(
        409,
        r.error.message?.includes("PROVIDER_CONSENT")
          ? "Chủ đồ cần xác nhận tham gia chương trình trước khi áp dụng mã."
          : r.error.message?.includes("SPONSOR")
            ? "Chương trình chưa có đủ ngân sách tài trợ đã đối soát."
            : "Coupon không đủ điều kiện, đã hết hạn hoặc hết lượt dùng.",
        "COUPON_NOT_ELIGIBLE",
      );
    return Response.json(
      { ok: true, quote: r.data, previewOnly: true },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
