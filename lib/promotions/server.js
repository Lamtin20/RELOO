import {
  sealEntry,
  verifyHistory,
  trustedJournalKeys,
  digest,
} from "../assurance/journal.js";
import { verifyFinancialSource } from "../finance/verification.js";
export function promotionReceipt(id, quote) {
  return sealEntry(
    {
      streamId: id,
      sequence: 1,
      event: "PROMOTION_PRICE_AGREED",
      previousHash: "0".repeat(64),
      payload: quote,
      recordedAt: new Date().toISOString(),
    },
    process.env.RELOO_JOURNAL_PRIVATE_KEY,
  );
}
export function validPromotionReceipt(receipt, quote, id = null) {
  try {
    return (
      (!id || receipt.envelope.streamId === id) &&
      receipt.envelope.event === "PROMOTION_PRICE_AGREED" &&
      verifyHistory([receipt], trustedJournalKeys()).ok &&
      digest(receipt.privatePayload.payload) === digest(quote)
    );
  } catch {
    return false;
  }
}
export async function verifyIntentPromotion(db, intent) {
  if (!intent.coupon_id) return true;
  const r = await db
    .from("promotion_redemptions")
    .select("id,quote,receipt")
    .eq("order_id", intent.id)
    .eq("order_kind", "RENTAL")
    .single();
  return (
    !r.error &&
    validPromotionReceipt(r.data.receipt, r.data.quote, r.data.id) &&
    r.data.quote.payerId === intent.payer_id &&
    r.data.quote.providerId === intent.beneficiary_id &&
    r.data.quote.couponId === intent.coupon_id &&
    r.data.quote.net === String(intent.amount) &&
    r.data.quote.gross === String(intent.gross_amount) &&
    r.data.quote.discount === String(intent.discount_amount) &&
    r.data.quote.ownerAmount === String(intent.owner_amount)
  );
}
export function verifyPromotionCredit(row) {
  try {
  return (
    verifyFinancialSource(row.evidence) &&
    validPromotionReceipt(row.receipt, row.quote, row.redemptionId) &&
    row.quote.funder === "RELOO" &&
    row.quote.providerId === row.profileId &&
    BigInt(row.amount) > 0n &&
    BigInt(row.amount) <= BigInt(row.evidence.amount) &&
    BigInt(row.amount) <= BigInt(row.quote.discount) &&
    row.quote.service === "RENTAL"
  );
  } catch { return false; }
}
