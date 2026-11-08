const MAX = 9007199254740991n;
export function vnd(value, { positive = false } = {}) {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw new Error("VND_INTEGER_REQUIRED");
  if (
    !["string", "number", "bigint"].includes(typeof value) ||
    !/^\d{1,16}$/.test(String(value))
  )
    throw new Error("VND_INTEGER_REQUIRED");
  const amount = BigInt(value);
  if (amount > MAX || (positive && amount === 0n))
    throw new Error("VND_OUT_OF_RANGE");
  return amount;
}
export function invoiceTotals(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100)
    throw new Error("INVOICE_ITEMS_REQUIRED");
  let subtotal = 0n,
    tax = 0n;
  const lines = items.map((item, index) => {
    if (
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 200 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100000 ||
      ![-2, -1, 0, 5, 8, 10].includes(item.taxRate)
    )
      throw new Error("INVOICE_LINE_INVALID");
    const price = vnd(item.unitPrice),
      discount = vnd(item.discount || 0),
      gross = price * BigInt(item.quantity);
    if (discount > gross || gross > MAX)
      throw new Error("INVOICE_DISCOUNT_INVALID");
    const net = gross - discount,
      lineTax =
        item.taxRate > 0 ? (net * BigInt(item.taxRate) + 50n) / 100n : 0n;
    subtotal += net;
    tax += lineTax;
    return {
      line_number: index + 1,
      line_type: 1,
      item_name: item.name.trim(),
      unit: item.unit || "lần",
      quantity: item.quantity,
      unit_price: Number(price),
      tax_rate: item.taxRate,
      discount_amount: Number(discount),
      before_discount_and_tax_amount: Number(gross),
      tax_amount: Number(lineTax),
    };
  });
  if (subtotal + tax > MAX) throw new Error("INVOICE_TOTAL_TOO_LARGE");
  return {
    items: lines,
    subtotal: String(subtotal),
    tax: String(tax),
    total: String(subtotal + tax),
  };
}
export function balancedLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2 || lines.length > 100)
    throw new Error("JOURNAL_LINES_REQUIRED");
  let debit = 0n,
    credit = 0n;
  for (const line of lines) {
    if (
      !["DEBIT", "CREDIT"].includes(line.side) ||
      typeof line.account !== "string" ||
      !/^\d{3,4}$/.test(line.account)
    )
      throw new Error("JOURNAL_LINE_INVALID");
    const amount = vnd(line.amount, { positive: true });
    if (line.side === "DEBIT") debit += amount;
    else credit += amount;
  }
  if (debit !== credit || debit > MAX) throw new Error("JOURNAL_NOT_BALANCED");
  return { debit: String(debit), credit: String(credit) };
}
