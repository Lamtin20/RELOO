import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { campaignFields, couponFields } from "@/lib/promotions/validation";
import { PROMOTION_SERVICES, discountAmount } from "@/lib/promotions/rules";
import { verifyFinancialSource } from "@/lib/finance/verification";
import { decryptPrivate } from "@/lib/operations/crypto";
import { publicBusiness } from "@/lib/operations/settings";
import { integrationConfig } from "@/lib/operations/integrations";
import { sepayBanks } from "@/lib/finance/sepay-v2";
const uuid = (v) => /^[a-f0-9-]{36}$/i.test(v || "");
export async function GET(request) {
  try {
    const { db, staff } = await requirePermission(request, "promotions.read");
    const names = [
      "promotion_campaigns",
      "promotion_coupons",
      "promotion_participants",
      "promotion_funding",
      "promotion_redemptions",
    ];
    const rows = await Promise.all(
      names.map((n) =>
        db
          .from(n)
          .select(
            n === "promotion_redemptions"
              ? "id,campaign_id,coupon_id,profile_id,gross,discount,net,status,created_at"
              : "*",
          )
          .limit(2000),
      ),
    );
    if (rows.some((r) => r.error)) throw Error("PROMOTIONS_UNAVAILABLE");
    const stats = await db.rpc("reloo_promotion_stats");
    if (stats.error) throw Error("PROMOTION_STATS_UNAVAILABLE");
    let companySources = [];
    if (
      staff.permissions.includes("*") ||
      staff.permissions.includes("accounting.read")
    ) {
      const sources = await db.rpc("reloo_promotion_company_sources");
      if (sources.error) throw Error("PROMOTION_FUNDING_UNAVAILABLE");
      companySources = sources.data
        .filter(
          (s) =>
            verifyFinancialSource(s) &&
            !JSON.parse(decryptPrivate(s.evidence_encrypted)).payload
              .providerData?.va &&
            BigInt(s.unallocated) > 0n,
        )
        .map((s) => ({
          id: s.id,
          amount: s.unallocated,
          bankId: s.bank_account_id,
        }));
    }
    return Response.json(
      {
        ok: true,
        stats: stats.data,
        now: Date.now(),
        companySources,
        canWrite:
          staff.permissions.includes("*") ||
          staff.permissions.includes("promotions.write"),
        canFund:
          staff.permissions.includes("*") ||
          staff.permissions.includes("accounting.write"),
        services: PROMOTION_SERVICES,
        campaigns: rows[0].data,
        coupons: rows[1].data.map((c) => ({
          ...c,
          value: String(c.value),
          max_discount: c.max_discount === null ? null : String(c.max_discount),
          minimum_amount: String(c.minimum_amount),
        })),
        participants: rows[2].data,
        funding: rows[3].data.map((f) => ({ ...f, amount: String(f.amount) })),
        redemptions: rows[4].data.map((r) => ({
          ...r,
          gross: String(r.gross),
          discount: String(r.discount),
          net: String(r.net),
        })),
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "promotion-admin", 30);
    const { profile, db } = await requirePermission(
        request,
        "promotions.write",
      ),
      input = await readJson(request, 30000);
    let r;
    if (input.action === "CAMPAIGN") {
      let fields;
      try {
        fields = campaignFields(input.fields);
      } catch (e) {
        throw new HttpError(400, e.message);
      }
      if (input.id && !uuid(input.id))
        throw new HttpError(400, "ID chương trình không hợp lệ.");
      r = await db.rpc("reloo_save_campaign", {
        p_actor: profile.id,
        p_id: input.id || null,
        p_version: input.version || 0,
        p_fields: fields,
      });
    } else if (input.action === "COUPON") {
      let fields;
      try {
        fields = couponFields(input.fields);
      } catch (e) {
        throw new HttpError(400, e.message);
      }
      r = await db.rpc("reloo_save_coupon", {
        p_actor: profile.id,
        p_id: input.id || null,
        p_version: input.version || 0,
        p_campaign_version: input.campaignVersion,
        p_fields: fields,
      });
    } else if (input.action === "INVITE") {
      if (
        !uuid(input.campaignId) ||
        typeof input.profileId !== "string" ||
        input.profileId.length > 100
      )
        throw new HttpError(400, "Chọn chương trình và chủ đồ.");
      r = await db.rpc("reloo_invite_promotion", {
        p_actor: profile.id,
        p_campaign: input.campaignId,
        p_profile: input.profileId,
      });
    } else if (input.action === "FUND") {
      await requirePermission(request, "accounting.write");
      if (!(await publicBusiness(db)).entityReady)
        throw new HttpError(
          409,
          "Khai báo pháp nhân RELOO trước khi cấp ngân sách bằng tiền thật.",
        );
      if (
        input.companyFundsConfirmed !== true ||
        !uuid(input.campaignId) ||
        !uuid(input.sourceId) ||
        typeof input.amount !== "string" ||
        !/^\d{1,16}$/.test(input.amount) ||
        BigInt(input.amount) <= 0n ||
        typeof input.reason !== "string" ||
        input.reason.trim().length < 20
      )
        throw new HttpError(
          400,
          "Cần nguồn tiền của RELOO đã đối soát và căn cứ phân bổ ngân sách.",
        );
      const source = await db
        .from("finance_sources")
        .select("*")
        .eq("id", input.sourceId)
        .single();
      if (
        source.error ||
        !verifyFinancialSource(source.data) ||
        JSON.parse(decryptPrivate(source.data.evidence_encrypted)).payload
          .providerData?.va
      )
        throw new HttpError(
          409,
          "Nguồn ngân sách phải được xác minh và không phải tiền chuyển vào VA khách hàng.",
        );
      const config = await integrationConfig(db, "SEPAY"),
        bank = (await sepayBanks(config)).find(
          (b) => b.id === source.data.bank_account_id,
        );
      const required = await db.rpc("reloo_promotion_bank_requirement", {
        p_bank: source.data.bank_account_id,
      });
      if (
        !bank ||
        required.error ||
        !/^\d+$/.test(String(bank.accumulated)) ||
        BigInt(String(bank.accumulated)) <
          BigInt(required.data) + BigInt(input.amount)
      )
        throw new HttpError(
          409,
          "Số tiền ngân hàng hiện tại chưa đủ để cấp thêm ngân sách và bảo vệ các khoản đã cam kết.",
        );
      if (!["411", "5113"].includes(input.originAccount))
        throw new HttpError(
          400,
          "Chọn nguồn vốn hoặc doanh thu tương ứng chứng từ ngân sách.",
        );
      r = await db.rpc("reloo_fund_promotion_classified", {
        p_actor: profile.id,
        p_campaign: input.campaignId,
        p_source: input.sourceId,
        p_amount: input.amount,
        p_reason: input.reason.trim(),
        p_origin: input.originAccount,
      });
    } else if (input.action === "SIMULATE") {
      let discount;
      try { discount = discountAmount(input.gross,input.discountType,input.value,input.cap || null); }
      catch (e) { throw new HttpError(400, e.message); }
      return Response.json({
        ok: true,
        discount,
        simulation: true,
      });
    } else throw new HttpError(400, "Thao tác khuyến mãi không hợp lệ.");
    if (r.error)
      throw new HttpError(
        409,
        "Chưa lưu được. Kiểm tra phiên bản mới nhất, mã trùng, thời hạn coupon và nguồn ngân sách.",
        r.error.message?.includes("FUNDER_LOCKED")
          ? "FUNDER_LOCKED"
          : "PROMOTION_CONFLICT",
      );
    return Response.json({ ok: true, id: r.data });
  } catch (e) {
    return errorResponse(e);
  }
}
