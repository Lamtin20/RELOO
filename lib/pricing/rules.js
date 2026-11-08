import { CATEGORIES, LISTING_CONDITIONS } from "../constants.js";
import { HttpError } from "../server/http.js";
import { productKey } from "./sources.js";
export const PRICING_RULE_VERSION = "reloo-pricing-1";
const DAY = 86400000;
export function validateValuation(input) {
  if (
    !input ||
    typeof input !== "object" ||
    !CATEGORIES.some((category) => category.id === input.category) ||
    !Object.values(LISTING_CONDITIONS).some(
      (condition) => condition.code === input.condition,
    )
  )
    throw new HttpError(
      400,
      "Chọn danh mục và tình trạng món đồ.",
      "INVALID_PRODUCT",
    );
  const brand = typeof input.brand === "string" ? input.brand.trim() : "",
    model = typeof input.model === "string" ? input.model.trim() : "",
    variant = typeof input.variant === "string" ? input.variant.trim() : "";
  if (
    !brand ||
    brand.length > 60 ||
    model.length < 2 ||
    model.length > 150 ||
    variant.length > 100
  )
    throw new HttpError(
      400,
      "Nhập thương hiệu, model và phiên bản chính xác.",
      "INVALID_PRODUCT",
    );
  const ageMonths = Number(input.ageMonths || 0),
    purchasePrice = Number(input.purchasePrice || 0);
  if (
    !Number.isInteger(ageMonths) ||
    ageMonths < 0 ||
    ageMonths > 240 ||
    !Number.isSafeInteger(purchasePrice) ||
    purchasePrice < 0 ||
    purchasePrice > 1000000000 ||
    (input.functional !== true && input.functional !== false)
  )
    throw new HttpError(
      400,
      "Kiểm tra tuổi sản phẩm, giá mua và tình trạng hoạt động.",
      "INVALID_PRODUCT",
    );
  return {
    brand,
    model,
    variant,
    category: input.category,
    condition: input.condition,
    ageMonths,
    purchasePrice,
    functional: input.functional,
    modelKey: productKey({ brand, model, variant }),
  };
}
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
function summarize(rows) {
  if (rows.length < 3) return null;
  const center = median(rows.map((row) => row.price)),
    mad = median(rows.map((row) => Math.abs(row.price - center)));
  const filtered = rows.filter(
    (row) => Math.abs(row.price - center) <= Math.max(center * 0.35, mad * 3),
  );
  if (filtered.length < 3) return null;
  const prices = filtered.map((row) => row.price),
    value = median(prices);
  return {
    value,
    low: Math.round(Math.max(Math.min(...prices), value * 0.85)),
    high: Math.round(Math.min(Math.max(...prices), value * 1.15)),
    rows: filtered,
  };
}
function range(low, high) {
  return {
    low: Math.max(1, Math.round(low)),
    high: Math.max(1, Math.round(high)),
    suggested: Math.max(1, Math.round((low + high) / 2)),
  };
}
export function estimateValue(input, snapshots = [], now = Date.now()) {
  const unique = new Map(),
    excluded = { stale: 0, wrongModel: 0, invalid: 0, condition: 0 };
  for (const row of snapshots) {
    if (row.model_key !== input.modelKey || row.category !== input.category) {
      excluded.wrongModel++;
      continue;
    }
    const date = Date.parse(row.observed_at),
      ttl = row.price_kind === "new_retail" ? 2 * DAY : 7 * DAY;
    if (!Number.isFinite(date) || date > now || now - date > ttl) {
      excluded.stale++;
      continue;
    }
    if (
      !row.in_stock ||
      !Number.isSafeInteger(Number(row.price)) ||
      row.price < 1000 ||
      row.price > 1000000000 ||
      !row.url ||
      !row.source_id ||
      row.verified !== true
    ) {
      excluded.invalid++;
      continue;
    }
    if (
      ["used_asking", "rental_daily"].includes(row.price_kind) &&
      row.condition !== input.condition
    ) {
      excluded.condition++;
      continue;
    }
    const key = `${row.source_id}|${row.url}|${row.price_kind}`;
    if (!unique.has(key) || Date.parse(unique.get(key).observed_at) < date)
      unique.set(key, { ...row, price: Number(row.price) });
  }
  const rows = [...unique.values()],
    used = summarize(rows.filter((row) => row.price_kind === "used_asking")),
    retail = summarize(rows.filter((row) => row.price_kind === "new_retail")),
    rentals = summarize(
      rows.filter((row) => row.price_kind === "rental_daily"),
    );
  let asset = null,
    basis = "INSUFFICIENT_DATA",
    usedRows = [];
  if (input.functional === false)
    return {
      status: "INSPECTION_REQUIRED",
      basis,
      asset: null,
      rental: null,
      evidence: [],
      excluded,
      ruleVersion: PRICING_RULE_VERSION,
      message:
        "Món đồ có lỗi chức năng cần kiểm tra trực tiếp trước khi định giá hoặc cho thuê.",
    };
  if (used) {
    asset = range(used.low, used.high);
    basis = "USED_ASKING";
    usedRows = used.rows;
  } else if (retail || input.purchasePrice > 0) {
    const base = retail?.value || input.purchasePrice;
    const conditionFactor = { new: 1, like_new: 0.85, good: 0.72, fair: 0.5 }[
      input.condition
    ];
    const ageFactor =
      input.condition === "new" ? 1 : Math.pow(0.88, input.ageMonths / 12);
    const center = base * conditionFactor * ageFactor;
    asset = range(center * 0.85, center * 1.15);
    basis = retail ? "NEW_PRICE_RULE" : "OWNER_INPUT_RULE";
    usedRows = retail?.rows || [];
  }
  const category = CATEGORIES.find(
      (category) => category.id === input.category,
    ),
    factors = category?.kFactor || { min: 0.015, max: 0.03 };
  const rental = rentals
    ? range(rentals.low, rentals.high)
    : asset
      ? range(asset.suggested * factors.min, asset.suggested * factors.max)
      : null;
  const evidence = [...usedRows, ...(rentals?.rows || [])].map((row) => ({
    sourceId: row.source_id,
    title: row.title,
    url: row.url,
    price: row.price,
    kind: row.price_kind,
    observedAt: row.observed_at,
  }));
  return {
    status: asset ? "ESTIMATED" : "INSUFFICIENT_DATA",
    basis,
    asset,
    rental,
    rentalBasis: rentals
      ? "RENTAL_COMPARABLES"
      : asset
        ? "CATEGORY_RULE"
        : null,
    confidence:
      usedRows.length >= 5 &&
      new Set(usedRows.map((row) => row.source_id)).size >= 2
        ? "MEDIUM"
        : "LOW",
    evidence,
    excluded,
    ruleVersion: PRICING_RULE_VERSION,
    method: {
      conditionFactor: { new: 1, like_new: 0.85, good: 0.72, fair: 0.5 }[
        input.condition
      ],
      annualRetention: 0.88,
      rentalFactor: factors,
    },
    message:
      basis === "OWNER_INPUT_RULE"
        ? "Ước tính từ giá mua bạn nhập, chưa phải kết quả tra cứu thị trường."
        : basis === "USED_ASKING"
          ? "Tham khảo giá rao bán tương đồng, không phải giá đã giao dịch."
          : basis === "NEW_PRICE_RULE"
            ? "Giá trị đồ đã dùng được ước tính theo giá bán mới và quy tắc hao mòn."
            : "Chưa có đủ giá cùng model, phiên bản và tình trạng còn hiệu lực. Có thể nhập giá mua để xem ước tính theo quy tắc.",
  };
}
