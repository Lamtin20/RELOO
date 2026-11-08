import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { encryptPrivate } from "@/lib/operations/crypto";
import { publicBusiness } from "@/lib/operations/settings";
import { invoiceTotals } from "@/lib/finance/money";
import { verifyFinancialSource } from "@/lib/finance/verification";
import { randomUUID } from "node:crypto";
import { promotionReceipt } from "@/lib/promotions/server";
import { couponCode, distributeDiscount } from "@/lib/promotions/rules";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "accounting.read"),
      [sources, journals, lines, inbox, invoices, allocations, paymentReviews, promotionFunding, promotionCosts] =
        await Promise.all([
          db
            .from("finance_sources")
            .select("*")
            .order("verified_at", { ascending: false })
            .limit(200),
          db
            .from("ledger_journals")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200),
          db.from("ledger_lines").select("*").limit(1000),
          db
            .from("finance_webhook_inbox")
            .select("id,status,result_code,created_at,verified_at")
            .order("created_at", { ascending: false })
            .limit(200),
          db
            .from("invoice_documents")
            .select(
              "id,reference_code,seller_entity_version,source_journal_id,subtotal,tax,total,status,created_at",
            )
            .order("created_at", { ascending: false })
            .limit(100),
          db
            .from("rental_payment_allocations")
            .select(
              "id,intent_id,source_id,profile_id,kind,debit_account,credit_account,debit,credit,created_at",
            )
            .order("created_at", { ascending: false })
            .limit(200),
          db
            .from("rental_payment_intents")
            .select(
              "id,agreement_id,payer_id,kind,amount,reference,status,expires_at",
            )
            .eq("status", "REVIEW")
            .limit(100),
          db.from("promotion_funding_reclassifications")
            .select("*,promotion_funding!inner(source_id,campaign_id)")
            .order("created_at", { ascending: false }).limit(200),
          db.from("promotion_subsidy_credits")
            .select("*,promotion_funding!inner(source_id,campaign_id)")
            .order("created_at", { ascending: false }).limit(200),
        ]);
    if (
      [
        sources,
        journals,
        lines,
        inbox,
        invoices,
        allocations,
        paymentReviews,
        promotionFunding,
        promotionCosts,
      ].some((result) => result.error)
    )
      throw new Error("FINANCE_UNAVAILABLE");
    const checked = sources.data.map((item) => ({
      id: item.id,
      provider: item.provider,
      providerId: item.provider_id,
      direction: item.direction,
      amount: String(item.amount),
      verifiedAt: item.verified_at,
      integrity: verifyFinancialSource(item),
    }));
    return Response.json(
      {
        ok: true,
        promotionJournal: [
          ...promotionFunding.data.map(r => ({ ...r, kind: "FUNDING" })),
          ...promotionCosts.data.map(r => ({ ...r, kind: "SUBSIDY" })),
        ].map(r => ({
          id: r.id || r.funding_id,
          kind: r.kind,
          campaignId: r.promotion_funding.campaign_id,
          sourceId: r.promotion_funding.source_id,
          profileId: r.profile_id || null,
          redemptionId: r.redemption_id || null,
          debit: r.debit_account,
          credit: r.credit_account,
          amount: String(r.amount),
          createdAt: r.created_at,
        })).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)),
        allocations: allocations.data.map((r) => ({
          ...r,
          debit: String(r.debit),
          credit: String(r.credit),
        })),
        paymentReviews: paymentReviews.data.map((r) => ({
          ...r,
          amount: String(r.amount),
        })),
        sources: checked,
        journals: journals.data,
        lines: lines.data.map((item) => ({
          ...item,
          amount: String(item.amount),
        })),
        inbox: inbox.data,
        invoices: invoices.data.map((item) => ({
          ...item,
          subtotal: String(item.subtotal),
          tax: String(item.tax),
          total: String(item.total),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "invoice-draft", 5);
    const { profile, db } = await requirePermission(
        request,
        "accounting.write",
      ),
      input = await readJson(request, 40000),
      business = await publicBusiness(db);
    if (input.action === "VOID_DRAFT") {
      if (typeof input.reason !== "string" || input.reason.trim().length < 20)
        throw new HttpError(400, "Cần nhập lý do hủy bản nháp.");
      const voided = await db.rpc("reloo_void_promotion_invoice", {
        p_actor: profile.id,
        p_id: input.id,
        p_reason: input.reason.trim(),
      });
      if (voided.error)
        throw new HttpError(
          409,
          "Chỉ hủy được bản nháp chưa gửi nhà cung cấp hóa đơn.",
        );
      return Response.json({ ok: true });
    }
    if (
      input.action !== "DRAFT_INVOICE" ||
      !input.buyer ||
      typeof input.buyer.name !== "string" ||
      input.buyer.name.length < 3 ||
      input.buyer.name.length > 200 ||
      typeof input.buyer.address !== "string" ||
      input.buyer.address.length > 500
    )
      throw new HttpError(400, "Cần tên và địa chỉ người mua.");
    let totals;
    try {
      totals = invoiceTotals(input.items);
    } catch {
      throw new HttpError(
        400,
        "Kiểm tra giá, số lượng, chiết khấu và thuế suất.",
      );
    }
    const buyer = {
      name: input.buyer.name.trim(),
      address: input.buyer.address.trim(),
      type: "personal",
    };
    if (input.couponCode) {
      let code;
      try { code = couponCode(input.couponCode); }
      catch (e) { throw new HttpError(400, e.message); }
      if (
        typeof input.buyerProfileId !== "string" ||
        !["RELOO_FEE", "LISTING_BOOST", "INSPECTION"].includes(
          input.serviceCode,
        )
      )
        throw new HttpError(
          400,
          "Coupon dịch vụ cần ID khách hàng và loại phí RELOO.",
        );
      const quote = await db.rpc("reloo_promotion_quote", {
        p_profile: input.buyerProfileId,
        p_provider: null,
        p_service: input.serviceCode,
        p_gross: totals.subtotal,
        p_code: code,
      });
      if (quote.error)
        throw new HttpError(
          409,
          "Coupon chưa đủ điều kiện áp dụng cho khách hoặc dịch vụ này.",
        );
      const items = distributeDiscount(input.items, quote.data.discount),
        reduced = invoiceTotals(items),
        id = randomUUID(),
        receipt = promotionReceipt(id, quote.data);
      const saved = await db.rpc("reloo_create_promoted_invoice", {
        p_actor: profile.id,
        p_id: id,
        p_profile: input.buyerProfileId,
        p_service: input.serviceCode,
        p_gross: totals.subtotal,
        p_code: quote.data.code,
        p_receipt: receipt,
        p_document: {
          sellerVersion: business.version,
          seller: business.entity,
          encrypted: encryptPrivate(
            JSON.stringify({ buyer, items, promotion: quote.data }),
          ),
          ...reduced,
        },
      });
      if (saved.error)
        throw new HttpError(
          409,
          "Điều kiện coupon đã thay đổi hoặc không lưu được giá dịch vụ. Hãy thử lại.",
        );
      return Response.json(
        { ok: true, id, status: "DRAFT", promotion: quote.data },
        { status: 201 },
      );
    }
    const result = await db
      .from("invoice_documents")
      .insert({
        seller_entity_version: business.version,
        seller_snapshot: business.entity,
        data_encrypted: encryptPrivate(
          JSON.stringify({ buyer, items: input.items }),
        ),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        created_by: profile.id,
        buyer_profile_id: typeof input.buyerProfileId === "string" && input.buyerProfileId ? input.buyerProfileId : null,
      })
      .select("id")
      .single();
    if (result.error) throw new Error("INVOICE_DRAFT_UNAVAILABLE");
    return Response.json(
      { ok: true, id: result.data.id, status: "DRAFT" },
      { status: 201 },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
