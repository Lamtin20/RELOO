export const PROMOTION_SERVICES = {
  SALE: "Đơn mua sản phẩm",
  RENTAL: "Tiền thuê đồ",
  RELOO_FEE: "Phí dịch vụ RELOO",
  LISTING_BOOST: "Quảng bá / đẩy tin",
  INSPECTION: "Kiểm tra / đánh giá thiết bị",
  DELIVERY: "Dịch vụ giao nhận",
};
export const FUNDERS = {
  RELOO: "RELOO tài trợ",
  PROVIDER: "Chủ đồ / bên cung cấp chịu giảm",
};
export function couponCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code))
    throw Error("Mã coupon cần 3–40 ký tự chữ, số, dấu - hoặc _.");
  return code;
}
export function percentBps(value) {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(String(value)))
    throw Error("Phần trăm chỉ dùng tối đa hai chữ số thập phân.");
  const [whole, fraction = ""] = String(value).split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (bps < 1 || bps > 10000)
    throw Error("Mức giảm cần lớn hơn 0 và không quá 100%.");
  return bps;
}
export function money(value, { positive = false } = {}) {
  if (
    typeof value !== "string" ||
    !/^\d{1,16}$/.test(value) ||
    BigInt(value) > 9007199254740991n ||
    (positive && BigInt(value) === 0n)
  )
    throw Error("Số tiền cần là số nguyên VND hợp lệ.");
  return String(BigInt(value));
}
export function discountAmount(gross, type, value, cap = null) {
  const base = BigInt(money(String(gross))),
    number = BigInt(money(String(value), { positive: true }));
  if (
    !["AMOUNT", "PERCENT"].includes(type) ||
    (type === "PERCENT" && number > 10000n)
  )
    throw Error("DISCOUNT_INVALID");
  let discount = type === "AMOUNT" ? number : (base * number) / 10000n;
  if (cap !== null) {
    const maximum = BigInt(money(String(cap), {positive:true}));
    discount = discount < maximum ? discount : maximum;
  }
  return String(discount < base ? discount : base);
}
export function distributeDiscount(items, totalDiscount) {
  if (items.some((i) => BigInt(i.discount || "0") !== 0n))
    throw Error("Không cộng dồn coupon với chiết khấu riêng của dòng hàng.");
  const gross = items.map(
      (i) => BigInt(money(String(i.unitPrice))) * BigInt(i.quantity),
    ),
    sum = gross.reduce((s, n) => s + n, 0n),
    discount = BigInt(totalDiscount);
  if (sum === 0n || discount < 0n || discount > sum)
    throw Error("DISCOUNT_INVALID");
  const parts = gross.map((n) => (n * discount) / sum);
  let remainder = discount - parts.reduce((s, n) => s + n, 0n);
  for (let i = 0; remainder > 0n; i = (i + 1) % parts.length)
    if (parts[i] < gross[i]) {
      parts[i]++;
      remainder--;
    }
  return items.map((item, i) => ({ ...item, discount: String(parts[i]) }));
}
