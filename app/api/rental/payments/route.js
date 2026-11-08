import {requireProfileIdentity} from '@/lib/security/identity';
import { requireAccount } from "@/lib/security/authorization";
import { branding } from "@/lib/content/branding";
import { publicBusiness } from "@/lib/operations/settings";
import { integrationConfig } from "@/lib/operations/integrations";
import { sepayBanks, sepayVaDetails } from "@/lib/finance/sepay-v2";
import { sepayOrder } from "@/lib/finance/sepay";
import { decryptPrivate } from "@/lib/operations/crypto";
import { rentalHistory } from "@/lib/assurance/rental";
import { randomUUID } from "node:crypto";
import { couponCode } from "@/lib/promotions/rules";
import {
  promotionReceipt,
  verifyIntentPromotion,
  validPromotionReceipt,
} from "@/lib/promotions/server";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
const uuid = (v) => /^[a-f0-9-]{36}$/i.test(v || "");
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const id = new URL(request.url).searchParams.get("agreement");
    if (!uuid(id)) throw new HttpError(400, "Thỏa thuận không hợp lệ.");
    const a = await db
      .from("rental_agreements")
      .select("lender_id,renter_id,status")
      .eq("id", id)
      .single();
    if (a.error || ![a.data.lender_id, a.data.renter_id].includes(profile.id))
      throw new HttpError(404, "Không tìm thấy thỏa thuận.");
    const r = await db
      .from("rental_payment_intents")
      .select("*")
      .eq("agreement_id", id);
    if (r.error) throw Error("PAYMENT_READ_FAILED");
    const redemptions = r.data.length
      ? await db
          .from("promotion_redemptions")
          .select("id,order_id,quote,receipt")
          .in(
            "order_id",
            r.data.map((p) => p.id),
          )
      : { data: [] };
    if (redemptions.error) throw Error("PROMOTION_READ_FAILED");
    if (
      redemptions.data.some(
        (p) => !validPromotionReceipt(p.receipt, p.quote, p.id),
      )
    )
      throw new HttpError(
        409,
        "Điều kiện giảm giá đang cần kiểm tra toàn vẹn.",
      );
    const brand = await branding();
    let shipping = null;
    if (
      brand.shippingEnabled &&
      ["ACCEPTED", "ACTIVE"].includes(a.data.status)
    ) {
      const parties = await db
        .from("profiles")
        .select("id,profile_data")
        .in("id", [a.data.lender_id, a.data.renter_id]);
      if (parties.error) throw Error("SHIPPING_ADDRESS_UNAVAILABLE");
      shipping = {
        pickup:
          parties.data.find((p) => p.id === a.data.lender_id)?.profile_data
            ?.addressDetails || {},
        delivery:
          parties.data.find((p) => p.id === a.data.renter_id)?.profile_data
            ?.addressDetails || {},
      };
    }
    return Response.json(
      {
        ok: true,
        enabled: brand.rentalPaymentsEnabled,
        shipping,
        payments: r.data.map((p) => ({
          id: p.id,
          kind: p.kind,
          amount: String(p.amount),
          grossAmount: String(p.gross_amount),
          discountAmount: String(p.discount_amount),
          ownerAmount: String(p.owner_amount),
          reference: p.reference,
          status: p.status,
          expires_at: p.expires_at,
          promotion:
            redemptions.data.find((r) => r.order_id === p.id)?.quote || null,
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
    rateLimit(request, "rental-qr", 10);
    const { profile, db } = await requireAccount(request,{identity:true}),
      input = await readJson(request);
    if (!uuid(input.agreementId))
      throw new HttpError(400, "Thỏa thuận không hợp lệ.");
    if (!(await branding()).rentalPaymentsEnabled)
      throw new HttpError(
        409,
        "Thanh toán giao dịch qua RELOO chưa được kích hoạt.",
        "PAYMENT_DISABLED",
      );
    if (!(await publicBusiness(db)).entityReady)
      throw new HttpError(409, "Đơn vị thu tiền chưa hoàn tất khai báo.");
    const a = await db
      .from("rental_agreements")
      .select("*")
      .eq("id", input.agreementId)
      .single();
    if (a.error || a.data.renter_id !== profile.id)
      throw new HttpError(404, "Không tìm thấy thỏa thuận của bạn.");
    await requireProfileIdentity(db,a.data.lender_id,{other:true});
    if (!(await rentalHistory(db, a.data)).integrity.ok)
      throw new HttpError(409, "Thỏa thuận đang cần đối chiếu lịch sử.");
    let normalizedCode = "";
    try {
      if (input.couponCode) normalizedCode = couponCode(input.couponCode);
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    let code = normalizedCode,
      quote = null,
      receipt = null;
    const prior = await db
      .from("rental_payment_intents")
      .select("*")
      .eq("agreement_id", a.data.id)
      .eq("kind", "RENTAL")
      .maybeSingle();
    if (prior.error) throw Error("PAYMENT_READ_FAILED");
    let net = String(a.data.rent_amount),
      id = prior.data?.id || randomUUID(),
      link = null,
      bank = null;
    if (prior.data) {
      if (!(await verifyIntentPromotion(db, prior.data)))
        throw new HttpError(409, "Điều kiện coupon cần kiểm tra toàn vẹn.");
      const frozen = await db
        .from("promotion_redemptions")
        .select("quote")
        .eq("order_id", id)
        .maybeSingle();
      if (frozen.error) throw Error("PROMOTION_READ_FAILED");
      if ((frozen.data?.quote.code || "") !== code)
        throw new HttpError(
          409,
          "Giá thanh toán đã được chốt. Không thể thay coupon trên QR đã phát.",
        );
      net = String(prior.data.amount);
    } else if (code) {
      const preview = await db.rpc("reloo_promotion_quote", {
        p_profile: profile.id,
        p_provider: a.data.lender_id,
        p_service: "RENTAL",
        p_gross: String(a.data.rent_amount),
        p_code: code,
      });
      if (preview.error)
        throw new HttpError(
          409,
          "Coupon chưa đủ điều kiện, thiếu xác nhận chủ đồ, hết lượt hoặc chưa có đủ ngân sách bù.",
          "COUPON_NOT_ELIGIBLE",
        );
      quote = preview.data;
      net = quote.net;
      receipt = promotionReceipt(id, quote);
    }
    const config = await integrationConfig(db, "SEPAY");
    let banks = null;
    if (BigInt(net) > 0n) {
      banks = await sepayBanks(config);
      bank = banks.find(
        (b) => b.id === config.bankAccountId && String(b.active) === "1",
      );
      if (!bank || config.custodyModel !== "COLLECTION")
        throw new HttpError(409, "Ngân hàng thu hộ chưa sẵn sàng.");
      const links = await db
        .from("customer_va_links")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("bank_account_id", bank.id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });
      if (links.error) throw Error("VA_READ_FAILED");
      link = prior.data
        ? links.data.find((l) => l.id === prior.data.va_link_id)
        : links.data.find(
            (v) => !v.expires_at || Date.parse(v.expires_at) > Date.now(),
          );
      if (!link)
        throw new HttpError(
          409,
          "Bạn chưa được cấp VA tại ngân hàng thu tiền. QR xuất hiện sau khi VA được liên kết.",
          "OWN_VA_REQUIRED",
        );
      const account = decryptPrivate(link.va_encrypted);
      if (link.provider_va_id) {
        const va = await sepayVaDetails(bank.id, link.provider_va_id, config);
        if (va.va !== account || String(va.active) !== "1")
          throw new HttpError(409, "VA cần được đối soát lại.");
      } else if (link.provider_order_id) {
        const order = await sepayOrder(bank.id, link.provider_order_id, config);
        if (order.va_number !== account || String(order.amount) !== net)
          throw new HttpError(
            409,
            "VA theo đơn cần khớp số tiền sau giảm giá. Admin cần cấp VA cho đúng giá thanh toán.",
          );
      } else throw new HttpError(409, "VA thiếu bằng chứng cấp từ ngân hàng.");
    }
    if (!prior.data) {
      if (quote?.funder === "RELOO") {
        banks ||= await sepayBanks(config);
        let fundingQuery = db.from("promotion_funding")
          .select("finance_sources!inner(bank_account_id)")
          .eq("campaign_id", quote.campaignId);
        const funding = await fundingQuery;
        if (funding.error) throw Error("PROMOTION_FUNDING_UNAVAILABLE");
        const bankIds = [...new Set(funding.data.map(f => f.finance_sources.bank_account_id))]
          .filter(id => !bank || id === bank.id);
        if (!bankIds.length) throw new HttpError(409, "Chưa có ngân sách bù tại ngân hàng thu tiền.");
        for (const bankId of bankIds) {
          const sponsorBank = banks.find(b => b.id === bankId);
          const required = await db.rpc("reloo_promotion_bank_requirement", {p_bank:bankId});
          if (!sponsorBank || required.error || !/^\d+$/.test(String(sponsorBank.accumulated)) ||
              BigInt(String(sponsorBank.accumulated)) < BigInt(required.data))
            throw new HttpError(409, "Ngân sách giảm giá cần được đối soát lại với số tiền ngân hàng hiện tại.");
        }
      }
      const created = await db.rpc("reloo_create_promoted_rental", {
        p_profile: profile.id,
        p_agreement: a.data.id,
        p_va: link?.id || null,
        p_code: code,
        p_id: id,
        p_receipt: receipt,
      });
      if (created.error)
        throw new HttpError(
          409,
          "Giá/coupon đã thay đổi, chưa đủ ngân sách đúng ngân hàng hoặc đã có lệnh thu. Hãy tải lại.",
        );
      id = created.data;
    }
    const item = await db
      .from("rental_payment_intents")
      .select("*")
      .eq("id", id)
      .single();
    if (item.error) throw Error("PAYMENT_READ_FAILED");
    if (!(await verifyIntentPromotion(db, item.data)))
      throw new HttpError(409, "Điều kiện coupon cần kiểm tra toàn vẹn.");
    const payment = {
      id,
      status: item.data.status,
      kind: item.data.kind,
      amount: String(item.data.amount),
      grossAmount: String(item.data.gross_amount),
      discountAmount: String(item.data.discount_amount),
      ownerAmount: String(item.data.owner_amount),
      reference: item.data.reference,
      expires_at: item.data.expires_at,
    };
    if (["PAID", "FREE"].includes(item.data.status))
      return Response.json(
        { ok: true, payment },
        { headers: { "Cache-Control": "private,no-store" } },
      );
    if (
      item.data.status !== "PENDING" ||
      Date.parse(item.data.expires_at) <= Date.now()
    )
      throw new HttpError(
        409,
        "Lệnh thu cần được đối soát trước khi thanh toán tiếp.",
      );
    const account = decryptPrivate(link.va_encrypted),
      url =
        "https://qr.sepay.vn/img?" +
        new URLSearchParams({
          acc: account,
          bank: bank.bank_short_name,
          amount: String(item.data.amount),
          des: item.data.reference,
          template: "compact",
        });
    const qr = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!qr.ok || !qr.headers.get("content-type")?.startsWith("image/"))
      throw new HttpError(503, "Chưa tạo được QR. Hãy thử lại.");
    const bytes = Buffer.from(await qr.arrayBuffer());
    if (bytes.length > 1000000) throw Error("QR_TOO_LARGE");
    return Response.json(
      {
        ok: true,
        payment,
        account,
        bank: bank.bank_short_name,
        qr:
          "data:" +
          qr.headers.get("content-type").split(";")[0] +
          ";base64," +
          bytes.toString("base64"),
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
