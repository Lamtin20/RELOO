import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const rows = await db
      .from("promotion_participants")
      .select(
        "campaign_id,status,accepted_version,accepted_at,promotion_campaigns(*)",
      )
      .eq("profile_id", profile.id);
    if (rows.error) throw Error("PARTICIPATION_UNAVAILABLE");
    const ids = rows.data.map((r) => r.campaign_id);
    const coupons = ids.length
      ? await db
          .from("promotion_coupons")
          .select(
            "id,campaign_id,code,discount_type,value,max_discount,minimum_amount,status,starts_at,ends_at",
          )
          .in("campaign_id", ids)
      : { data: [] };
    if (coupons.error) throw Error("PARTICIPATION_UNAVAILABLE");
    return Response.json(
      { ok: true, programs: rows.data, coupons: coupons.data },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request),
      input = await readJson(request);
    if (
      !/^[a-f0-9-]{36}$/i.test(input.campaignId || "") ||
      !Number.isInteger(input.version) ||
      typeof input.accept !== "boolean" ||
      (input.accept && input.confirmed !== true)
    )
      throw new HttpError(400, "Cần đọc và xác nhận điều kiện chương trình.");
    const r = await db.rpc("reloo_accept_promotion", {
      p_profile: profile.id,
      p_campaign: input.campaignId,
      p_version: input.version,
      p_accept: input.accept,
    });
    if (r.error)
      throw new HttpError(
        409,
        "Chương trình đã thay đổi hoặc bạn chưa được mời tham gia.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
