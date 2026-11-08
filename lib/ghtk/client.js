import { HttpError } from "../server/http.js";

const BASES = new Set([
  "https://services.giaohangtietkiem.vn",
  "https://services-staging.ghtklab.com",
]);

export function validateQuote(input) {
  const result = {};
  for (const field of ["pick_province", "pick_ward", "province", "ward"]) {
    if (
      typeof input?.[field] !== "string" ||
      !input[field].trim() ||
      input[field].length > 120
    )
      throw new HttpError(
        400,
        "Vui lòng điền tỉnh/thành và phường/xã của hai địa chỉ.",
      );
    result[field] = input[field].trim();
  }
  for (const field of [
    "pick_address",
    "pick_district",
    "address",
    "district",
  ]) {
    if (
      input[field] != null &&
      (typeof input[field] !== "string" || input[field].length > 300)
    )
      throw new HttpError(400, "Địa chỉ không hợp lệ.");
    if (input[field]) result[field] = input[field].trim();
  }
  const weight = Number(input.weight);
  if (input.transport != null && !["road", "fly"].includes(input.transport))
    throw new HttpError(400, "Chọn phương thức đường bộ hoặc đường bay.");
  const value = Number(input.value || 0);
  if (!Number.isInteger(weight) || weight < 1 || weight > 30000)
    throw new HttpError(400, "Khối lượng cần từ 1 đến 30.000 gram.");
  if (!Number.isInteger(value) || value < 0 || value > 100000000)
    throw new HttpError(400, "Giá trị khai báo không hợp lệ.");
  return {
    ...result,
    weight,
    value,
    transport: input.transport === "fly" ? "fly" : "road",
  };
}

export function normalizeQuote(body) {
  if (
    body?.success !== true ||
    !body.fee ||
    !Number.isFinite(Number(body.fee.fee)) ||
    Number(body.fee.fee) < 0
  )
    throw new HttpError(
      502,
      "GHTK chưa trả được báo giá hợp lệ.",
      "GHTK_QUOTE_FAILED",
    );
  const shipping = Number(body.fee.fee);
  const insurance = Number(body.fee.insurance_fee || 0);
  const extras = (body.fee.extFees || [])
    .map((item) => ({
      title: String(item.title || "Phụ phí"),
      amount: Number(item.amount),
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount >= 0);
  if (!Number.isFinite(insurance) || insurance < 0)
    throw new HttpError(502, "GHTK chưa trả được phí khai giá hợp lệ.");
  // GHTK's shipping fee already includes extFees (verified against a live quote).
  return {
    provider: "ghtk",
    shipping,
    insurance,
    extras,
    total: shipping + insurance,
    delivery: body.fee.delivery === true,
    quotedAt: new Date().toISOString(),
    currency: "VND",
  };
}

export async function fetchGhtkQuote(input, fetcher = fetch) {
  const token = process.env.GHTK_API_TOKEN;
  if (!token)
    throw new HttpError(
      503,
      "Chưa cấu hình dịch vụ GHTK.",
      "GHTK_NOT_CONFIGURED",
    );
  const base =
    process.env.GHTK_API_URL || "https://services.giaohangtietkiem.vn";
  if (!BASES.has(base)) throw new HttpError(503, "Cấu hình GHTK không hợp lệ.");
  const url = new URL("/services/shipment/fee", base);
  for (const [key, value] of Object.entries(validateQuote(input)))
    url.searchParams.set(key, String(value));
  const headers = { Token: token, Accept: "application/json" };
  if (process.env.GHTK_PARTNER_CODE)
    headers["X-Client-Source"] = process.env.GHTK_PARTNER_CODE;
  let response;
  try {
    response = await fetcher(url, {
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new HttpError(
      502,
      "Không kết nối được GHTK. Vui lòng thử lại.",
      "GHTK_UNAVAILABLE",
    );
  }
  if (response.status === 401 || response.status === 403)
    throw new HttpError(
      502,
      "GHTK chưa chấp nhận quyền tính phí của tài khoản.",
      "GHTK_AUTH_FAILED",
    );
  if (!response.ok)
    throw new HttpError(
      502,
      "GHTK đang không trả được báo giá.",
      "GHTK_UNAVAILABLE",
    );
  let body;
  try {
    body = await response.json();
  } catch {
    throw new HttpError(502, "Phản hồi GHTK không hợp lệ.");
  }
  return normalizeQuote(body);
}
