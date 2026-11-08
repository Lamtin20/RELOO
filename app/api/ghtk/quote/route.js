import { fetchGhtkQuote } from "@/lib/ghtk/client";
import { branding } from "@/lib/content/branding";
import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  rateLimit,
  readJson,
  HttpError,
} from "@/lib/server/http";

export async function POST(request) {
  try {
    assertOrigin(request);
    if (!(await branding()).shippingEnabled)
      throw new HttpError(
        409,
        "Tính phí giao hàng đang tạm ngừng.",
        "SHIPPING_DISABLED",
      );
    rateLimit(request, "ghtk-quote", 20);
    const { profile, db } = await requireAccount(request),
      input = await readJson(request);
    if (!/^[a-f0-9-]{36}$/i.test(input.agreementId || ""))
      throw new HttpError(
        400,
        "Phí giao hàng chỉ được tạm tính trong giao dịch thuê.",
      );
    const agreement = await db
      .from("rental_agreements")
      .select("renter_id,lender_id,status")
      .eq("id", input.agreementId)
      .single();
    if (
      agreement.error ||
      ![agreement.data.renter_id, agreement.data.lender_id].includes(
        profile.id,
      ) ||
      !["ACCEPTED", "ACTIVE"].includes(agreement.data.status)
    )
      throw new HttpError(
        404,
        "Không tìm thấy giao dịch đang được phép báo phí.",
      );
    const { agreementId, ...fields } = input;
    const quote = await fetchGhtkQuote(fields);
    return Response.json(
      { ok: true, quote },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
