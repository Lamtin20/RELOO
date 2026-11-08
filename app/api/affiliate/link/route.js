import { randomUUID } from "node:crypto";
import { requireAccount } from "@/lib/security/authorization";
import { createAffiliateLink, rewardShare } from "@/lib/affiliate/provider";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "affiliate-link", 15);
    const { profile, db } = await requireAccount(request, {
      scope: "cashback",
    });
    const { url } = await readJson(request);
    const id = randomUUID();
    const link = await createAffiliateLink(url, id);
    const { error } = await db
      .from("affiliate_clicks")
      .insert({
        id,
        profile_id: profile.id,
        merchant: link.merchant,
        original_url: link.originalUrl,
        affiliate_url: link.affiliateUrl,
        reward_share: rewardShare(),
      });
    if (error)
      throw new HttpError(
        503,
        "Chưa ghi nhận được liên kết cho tài khoản của bạn. Vui lòng thử lại.",
      );
    return Response.json({ ok: true, clickId: id, ...link });
  } catch (error) {
    return errorResponse(error);
  }
}
