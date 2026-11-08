import { privateHash, decryptPrivate } from "../operations/crypto.js";
import { verifyFinancialSource } from "./verification.js";
import { paymentReference, withdrawalReference } from "./payment-reference.js";
import { verifyIntentPromotion } from "../promotions/server.js";
export async function attributeVerifiedCash(db, source) {
  if (!verifyFinancialSource(source))
    throw new Error("FINANCIAL_SOURCE_INTEGRITY_FAILED");
  const raw = JSON.parse(decryptPrivate(source.evidence_encrypted)).payload
    .providerData;
  const outgoing = withdrawalReference(
    raw?.transaction_content || raw?.content || "",
  );
  if (source.direction === "OUT" && outgoing) {
    const payout = await db.rpc("reloo_attribute_payout_out", {
      p_source: source.id,
      p_reference: outgoing,
    });
    if (payout.error) throw new Error("PAYOUT_ATTRIBUTION_FAILED");
    if (payout.data) return { attributed: true, payout: true };
  }
  if (!raw?.va) return { attributed: false };
  const { data: link, error } = await db
    .from("customer_va_links")
    .select("profile_id,provider_va_id")
    .eq("bank_account_id", source.bank_account_id)
    .eq("status", "ACTIVE")
    .eq("va_hash", privateHash("VA", raw.va))
    .maybeSingle();
  if (error) throw new Error("VA_MAPPING_UNAVAILABLE");
  if (!link || (link.provider_va_id && link.provider_va_id !== raw.va_id))
    return { attributed: false };
  const reference = paymentReference(
    raw.transaction_content || raw.content || "",
  );
  if (reference) {
    const intent = await db
      .from("rental_payment_intents")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();
    if (intent.error) throw new Error("RENTAL_PROMOTION_READ_FAILED");
    if (intent.data && !(await verifyIntentPromotion(db, intent.data)))
      throw new Error("PROMOTION_INTEGRITY_FAILED");
    const payment = await db.rpc("reloo_allocate_rental_payment", {
      p_source: source.id,
      p_payer: link.profile_id,
      p_reference: reference,
    });
    if (payment.error) throw new Error("RENTAL_ALLOCATION_FAILED");
    if (payment.data) return { attributed: true, rental: true };
  }
  const r = await db.rpc("reloo_attribute_cash", {
    p_source: source.id,
    p_profile: link.profile_id,
    p_reference: raw.reference_number || source.provider_id,
  });
  if (r.error) throw new Error("CASH_ATTRIBUTION_FAILED");
  return { attributed: true };
}
