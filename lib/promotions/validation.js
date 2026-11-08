import { PROMOTION_SERVICES, couponCode, money, percentBps } from "./rules.js";
export function dates(input) {
  const start = Date.parse(input.starts_at),
    end = Date.parse(input.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw Error("Chọn thời gian bắt đầu và kết thúc hợp lệ.");
  return {
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(end).toISOString(),
  };
}
const states = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"];
export function campaignFields(input) {
  if (
    typeof input.name !== "string" ||
    input.name.trim().length < 3 ||
    input.name.length > 150 ||
    typeof input.terms !== "string" ||
    input.terms.trim().length < 20 ||
    input.terms.length > 6000 ||
    typeof input.description !== "string" ||
    input.description.length > 2000 ||
    !Array.isArray(input.services) ||
    !input.services.length ||
    input.services.some((s) => !Object.hasOwn(PROMOTION_SERVICES, s)) ||
    !["RELOO", "PROVIDER"].includes(input.funder) ||
    !states.includes(input.status)
  )
    throw Error(
      "Tên, điều kiện, dịch vụ và trạng thái chương trình chưa hợp lệ.",
    );
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    terms: input.terms.trim(),
    services: [...new Set(input.services)],
    funder: input.funder,
    status: input.status,
    budget_limit: input.budget_limit
      ? money(input.budget_limit, { positive: true })
      : null,
    ...dates(input),
  };
}
export function couponFields(input) {
  if (
    !/^[a-f0-9-]{36}$/i.test(input.campaign_id || "") ||
    !["AMOUNT", "PERCENT"].includes(input.discount_type) ||
    !states.includes(input.status) ||
    !Number.isInteger(input.total_limit) ||
    input.total_limit < 1 ||
    input.total_limit > 10000000 ||
    !Number.isInteger(input.customer_limit) ||
    input.customer_limit < 1 ||
    input.customer_limit > input.total_limit ||
    !Array.isArray(input.customer_ids) ||
    input.customer_ids.length > 500 ||
    input.customer_ids.some((s) => typeof s !== "string" || s.length > 100) ||
    typeof input.first_order_only !== "boolean" ||
    typeof input.public_code !== "boolean"
  )
    throw Error("Phạm vi coupon hoặc giới hạn lượt dùng chưa hợp lệ.");
  return {
    campaign_id: input.campaign_id,
    code: couponCode(input.code),
    discount_type: input.discount_type,
    value:
      input.discount_type === "PERCENT"
        ? String(percentBps(input.value))
        : money(input.value, { positive: true }),
    max_discount: input.max_discount
      ? money(input.max_discount, { positive: true })
      : null,
    minimum_amount: money(input.minimum_amount || "0"),
    status: input.status,
    total_limit: input.total_limit,
    customer_limit: input.customer_limit,
    customer_ids: [...new Set(input.customer_ids)],
    first_order_only: input.first_order_only,
    public_code: input.public_code,
    ...dates(input),
  };
}
