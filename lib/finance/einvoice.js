import { invoiceTotals } from "./money.js";
const BASE = "https://einvoice-api.sepay.vn/v1";
async function call(path, config, body) {
  if (!config.SEPAY_EINVOICE_TOKEN) throw new Error("EINVOICE_NOT_CONFIGURED");
  const response = await fetch(BASE + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${config.SEPAY_EINVOICE_TOKEN}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    }),
    data = await response.json();
  if (!response.ok || data.success !== true || !data.data)
    throw new Error(
      response.status === 401
        ? "EINVOICE_AUTH_REQUIRED"
        : "EINVOICE_PROVIDER_UNAVAILABLE",
    );
  return data.data;
}
export function verifyIssuedInvoice(result, expected) {
  const invoice = result?.invoice;
  if (
    result.status !== "Success" ||
    invoice?.status !== "issued" ||
    invoice.reference_code !== expected.referenceCode ||
    String(invoice.total_before_tax) !== expected.subtotal ||
    String(invoice.tax_amount) !== expected.tax ||
    String(invoice.total_amount) !== expected.total ||
    !invoice.invoice_number
  )
    throw new Error("EINVOICE_NOT_CONFIRMED");
  return invoice;
}
export async function createInvoiceDraft(document, providerAccount, config) {
  const totals = invoiceTotals(document.items);
  if (
    totals.total !== document.total ||
    !providerAccount.templateCode ||
    !providerAccount.series ||
    !providerAccount.id
  )
    throw new Error("EINVOICE_TEMPLATE_NOT_READY");
  const now = new Date(),
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now),
    get = (type) => parts.find((part) => part.type === type).value;
  return call("/invoices/create", config, {
    template_code: providerAccount.templateCode,
    invoice_series: providerAccount.series,
    issued_date: `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`,
    currency: "VND",
    provider_account_id: providerAccount.id,
    reference_code: document.referenceCode,
    payment_method: "CK",
    is_draft: true,
    buyer: document.buyer,
    items: totals.items,
    total_amount: Number(totals.total),
  });
}
export const invoiceProviderAccounts = (config) =>
  call("/provider-accounts", config);
export const checkInvoiceCreate = (tracking, config) =>
  call("/invoices/create/check/" + encodeURIComponent(tracking), config);
export const checkInvoiceIssue = (tracking, config) =>
  call("/invoices/issue/check/" + encodeURIComponent(tracking), config);
export const requestInvoiceIssue = (referenceCode, config) =>
  call("/invoices/issue", config, { reference_code: referenceCode });
