import { vnd } from "./money.js";
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const VA_BANK_RULES = {
  BIDV: {
    label: "BIDV",
    amountRequired: false,
    enterprise: true,
    holder: true,
  },
  SACOMBANK: {
    label: "Sacombank",
    amountRequired: true,
    vaPrefix: true,
    merchant: true,
  },
  VIETCOMBANK: {
    label: "Vietcombank",
    amountRequired: true,
    tid: true,
    maxCode: 15,
  },
  VIETINBANK: {
    label: "VietinBank",
    amountRequired: true,
    enterprise: true,
    collectionService: true,
  },
  SHINHAN: {
    label: "Shinhan Bank",
    amountRequired: true,
    enterprise: true,
    holder: true,
    maxCode: 15,
  },
};
export function bankRule(bank) {
  const name = String(bank?.bank_short_name || bank?.bank_name || bank || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return (
    Object.entries(VA_BANK_RULES).find(([key]) => name.includes(key))?.[1] ||
    null
  );
}
export async function sepayV2(path, config, body) {
  if (!config.SEPAY_API_KEY) throw new Error("SEPAY_NOT_CONFIGURED");
  const r = await fetch("https://userapi.sepay.vn/v2" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${config.SEPAY_API_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (!r.ok || data.status !== "success" || !data.data) {
    const e = new Error(
      r.status === 401
        ? "SEPAY_AUTH_REQUIRED"
        : r.status === 403
          ? "SEPAY_PERMISSION_REQUIRED"
          : "SEPAY_REQUEST_FAILED",
    );
    e.providerCode = /^[a-z0-9_]{1,80}$/i.test(data.error_code || "")
      ? data.error_code
      : null;
    e.status = r.status;
    throw e;
  }
  return data;
}
export function validBankId(id) {
  if (!UUID.test(id || "")) throw new Error("BANK_UUID_REQUIRED");
  return id;
}
export async function sepayBanks(config) {
  return (await sepayV2("/bank-accounts?per_page=100", config)).data;
}
export async function sepayVaList(id, config, { page = 1, active, q } = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: "100" });
  if (active !== undefined) params.set("active", String(active));
  if (q) params.set("q", q);
  return sepayV2(`/bank-accounts/${validBankId(id)}/va?${params}`, config);
}
export async function sepayVaDetails(bank, id, config) {
  return (
    await sepayV2(
      `/bank-accounts/${validBankId(bank)}/va/${validBankId(id)}`,
      config,
    )
  ).data;
}
export async function sepayTransactions(config, params) {
  return sepayV2(
    "/transactions?" +
      new URLSearchParams({
        ...params,
        per_page: "100",
        timestamp_format: "iso8601",
      }),
    config,
  );
}
export function orderPayload(input, bank) {
  const rule = bankRule(bank);
  if (!rule) throw new Error("Ngân hàng này chưa hỗ trợ cấp VA theo đơn hàng.");
  if (String(bank.active) !== "1")
    throw new Error("Tài khoản ngân hàng chưa hoạt động.");
  if (rule.enterprise && bank.account_type !== "enterprise")
    throw new Error("Cần tài khoản doanh nghiệp được SePay kích hoạt.");
  const amount = String(vnd(input.amount, { positive: true }));
  if (amount.length > 12) throw new Error("Số tiền VA tối đa 12 chữ số.");
  const code = String(input.orderCode || "").toUpperCase();
  if (!new RegExp(`^[A-Z0-9]{6,${rule.maxCode || 50}}$`).test(code))
    throw new Error(
      "Mã thu tiền cần chữ/số, 6–" + (rule.maxCode || 50) + " ký tự.",
    );
  const body = {
    amount: Number(amount),
    order_code: code,
    with_qrcode: "1",
    qrcode_template: "compact",
    duration: Math.min(
      2592000,
      Math.max(60, Math.trunc(Number(input.duration) || 86400)),
    ),
  };
  if (rule.tid) {
    if (!/^\d{1,30}$/.test(input.tid || ""))
      throw new Error(
        "Vietcombank cần Terminal ID gốc, không dùng UUID SePay.",
      );
    body.tid = input.tid;
  }
  if (rule.vaPrefix) {
    if (!/^[A-Z0-9]{1,50}$/.test(input.vaPrefix || ""))
      throw new Error("Sacombank cần tiền tố VA được kích hoạt.");
    body.va_prefix = input.vaPrefix;
  }
  if (input.holderName) {
    if (!rule.holder)
      throw new Error("Ngân hàng này không hỗ trợ đổi tên chủ VA.");
    if (input.holderName.length > 300) throw new Error("Tên VA vượt giới hạn.");
    if (rule.label === "BIDV" && !/^[A-Z0-9 ]{1,70}$/.test(input.holderName))
      throw new Error(
        "Tên chủ VA BIDV cần chữ hoa không dấu, tối đa 70 ký tự.",
      );
    body.va_holder_name = input.holderName;
  }
  return body;
}
