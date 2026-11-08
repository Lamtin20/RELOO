import { createHmac, timingSafeEqual } from "node:crypto";
import { vnd } from "./money.js";
const BASE = "https://userapi.sepay.vn/v2";
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function verifySePaySignature(body, headers, secret, now = Date.now()) {
  const signature = headers.get("x-sepay-signature"),
    timestamp = headers.get("x-sepay-timestamp");
  if (
    !secret ||
    !/^\d{10}$/.test(timestamp || "") ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !/^sha256=[a-f0-9]{64}$/.test(signature || "")
  )
    return false;
  const expected =
    "sha256=" +
    createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(body)
      .digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
export function normalizeSePayWebhook(input) {
  if (
    !input ||
    typeof input !== "object" ||
    !["in", "out"].includes(input.transferType) ||
    !(
      (typeof input.id === "number" &&
        Number.isSafeInteger(input.id) &&
        input.id > 0) ||
      UUID.test(input.id || "")
    ) ||
    typeof input.accountNumber !== "string" ||
    !/^\d{6,30}$/.test(input.accountNumber) ||
    typeof input.gateway !== "string" ||
    input.gateway.length > 100 ||
    typeof input.transactionDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input.transactionDate) ||
    typeof input.content !== "string" ||
    input.content.length > 4000
  )
    throw new Error("SEPAY_PAYLOAD_INVALID");
  const amount = vnd(input.transferAmount, { positive: true });
  if (
    input.referenceCode !== null &&
    input.referenceCode !== undefined &&
    (typeof input.referenceCode !== "string" ||
      input.referenceCode.length > 200)
  )
    throw new Error("SEPAY_REFERENCE_INVALID");
  if (
    input.subAccount !== null &&
    input.subAccount !== undefined &&
    (typeof input.subAccount !== "string" || input.subAccount.length > 100)
  )
    throw new Error("SEPAY_VA_INVALID");
  return {
    id: String(input.id),
    type: input.transferType,
    amount: String(amount),
    account: input.accountNumber,
    bank: input.gateway,
    date: input.transactionDate,
    content: input.content,
    reference: input.referenceCode || "",
    va: input.subAccount || "",
  };
}
async function request(path, config, body) {
  if (!config.SEPAY_API_KEY) throw new Error("SEPAY_NOT_CONFIGURED");
  const response = await fetch(BASE + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${config.SEPAY_API_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok || data.status !== "success" || !data.data)
    throw new Error(
      response.status === 401 ? "SEPAY_AUTH_REQUIRED" : "SEPAY_API_UNAVAILABLE",
    );
  return data.data;
}
export function reconcileSePay(webhook, transaction, config) {
  const amount =
      webhook.type === "in" ? transaction.amount_in : transaction.amount_out,
    other =
      webhook.type === "in" ? transaction.amount_out : transaction.amount_in;
  if (
    !UUID.test(transaction.id || "") ||
    !UUID.test(config.bankAccountId || "") ||
    transaction.bank_account_id !== config.bankAccountId ||
    transaction.account_number !== config.companyAccountNumber ||
    transaction.account_number !== webhook.account ||
    transaction.transfer_type !== webhook.type ||
    String(vnd(amount, { positive: true })) !== webhook.amount ||
    vnd(other) !== 0n ||
    transaction.reference_number !== webhook.reference ||
    transaction.transaction_content !== webhook.content ||
    transaction.transaction_date !== webhook.date ||
    (webhook.va && transaction.va !== webhook.va) ||
    typeof transaction.bank_brand_name !== "string" ||
    transaction.bank_brand_name.toLowerCase() !== webhook.bank.toLowerCase()
  )
    throw new Error("SEPAY_EVIDENCE_MISMATCH");
  return {
    providerId: transaction.id,
    amount: webhook.amount,
    type: webhook.type,
    accountId: transaction.bank_account_id,
    vaId: transaction.va_id || null,
    reference: webhook.reference,
    occurredAt: new Date(
      transaction.transaction_date.replace(" ", "T") + "+07:00",
    ).toISOString(),
  };
}
export async function verifySePayTransaction(webhook, config) {
  if (!UUID.test(config.bankAccountId || "") || !config.companyAccountNumber)
    throw new Error("SEPAY_BANK_NOT_CONFIGURED");
  let transaction;
  if (UUID.test(webhook.id))
    transaction = await request("/transactions/" + webhook.id, config);
  else {
    if (!webhook.reference) throw new Error("SEPAY_REFERENCE_REQUIRED");
    const params = new URLSearchParams({
        bank_account_id: config.bankAccountId,
        reference_number: webhook.reference,
        per_page: "100",
      }),
      rows = await request("/transactions?" + params, config);
    if (!Array.isArray(rows) || rows.length !== 1)
      throw new Error("SEPAY_REFERENCE_AMBIGUOUS");
    transaction = rows[0];
  }
  return { ...reconcileSePay(webhook, transaction, config), raw: transaction };
}
export async function createSePayVa(bankAccountId, orderId, amount, config) {
  if (!UUID.test(bankAccountId) || !UUID.test(orderId))
    throw new Error("SEPAY_ORDER_INVALID");
  const result = await request(
    `/bank-accounts/${bankAccountId}/orders/${orderId}/va`,
    config,
    { amount: Number(vnd(amount, { positive: true })), duration: 86400 },
  );
  if (
    typeof result.va_number !== "string" ||
    result.va_number.length > 100 ||
    !Number.isFinite(
      Date.parse(String(result.expired_at).replace(" ", "T") + "+07:00"),
    )
  )
    throw new Error("SEPAY_VA_INVALID_RESPONSE");
  return result;
}
export async function sepayOrder(bankAccountId, orderId, config) {
  if (!UUID.test(bankAccountId) || !UUID.test(orderId))
    throw new Error("SEPAY_ORDER_INVALID");
  return request(`/bank-accounts/${bankAccountId}/orders/${orderId}`, config);
}
