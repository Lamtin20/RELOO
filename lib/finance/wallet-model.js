const SOURCES = ["BANK", "RENTAL", "DEPOSIT", "REFUND", "SHOPEE", "TIKTOK"];
function amount(value, { signed = false } = {}) {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw new Error("WALLET_AMOUNT_INVALID");
  if (!new RegExp(signed ? "^-?\\d{1,30}$" : "^\\d{1,30}$").test(String(value)))
    throw new Error("WALLET_AMOUNT_INVALID");
  return BigInt(value);
}
export function merchantSource(merchant) {
  const value = String(merchant || "").toLowerCase();
  if (value === "shopee") return "SHOPEE";
  if (value === "tiktok") return "TIKTOK";
  throw new Error("WALLET_MERCHANT_INVALID");
}
export function buildWallet(
  snapshot,
  verifyEvidence = () => false,
  verifySubsidy = () => false,
) {
  const bank = snapshot.bankEntries || [],
    conversions = snapshot.conversions || [],
    ledger = snapshot.cashbackLedger || [],
    withdrawals = snapshot.withdrawals || [];
  if (
    bank.length !== Number(snapshot.bankCount) ||
    conversions.length !== Number(snapshot.conversionsCount) ||
    withdrawals.length !== Number(snapshot.withdrawalsCount)
  )
    throw new Error("WALLET_DATA_INCOMPLETE");
  const sums = Object.fromEntries(
    SOURCES.map((code) => [
      code,
      {
        code,
        net: 0n,
        incoming: 0n,
        outgoing: 0n,
        pending: 0n,
        confirmed: 0n,
        count: 0,
        withdrawalPending: 0n,
      },
    ]),
  );
  let incoming = 0n,
    outgoing = 0n;
  const transactions = [];
  const subsidies = snapshot.subsidies || [];
  if (subsidies.length !== Number(snapshot.subsidiesCount || 0))
    throw new Error("SUBSIDY_DATA_INCOMPLETE");
  const subsidyGroups = new Map();
  for (const row of subsidies) {
    if (!verifySubsidy(row)) throw new Error("SUBSIDY_INTEGRITY_FAILED");
    const value = amount(row.amount),
      sum = sums.RENTAL;
    incoming += value;
    sum.incoming += value;
    sum.net += value;
    sum.count++;
    const previous = subsidyGroups.get(row.redemptionId) || {
      total: 0n,
      expected: amount(row.quote.discount),
    };
    if (previous.expected !== amount(row.quote.discount))
      throw new Error("SUBSIDY_PRICE_CHANGED");
    previous.total += value;
    subsidyGroups.set(row.redemptionId, previous);
    transactions.push({
      id: "subsidy:" + row.id,
      sourceCode: "RENTAL",
      direction: "IN",
      amount: String(value),
      title: "RELOO bù giảm giá · " + row.quote.programName,
      reference: row.quote.code,
      status: "RECONCILED",
      occurredAt: row.occurredAt,
      provider: "RELOO",
      affectsBankBalance: true,
    });
  }
  for (const g of subsidyGroups.values())
    if (g.total !== g.expected)
      throw new Error("SUBSIDY_ALLOCATION_INCOMPLETE");
  for (const row of bank) {
    if (
      !verifyEvidence(row.evidence) ||
      String(row.evidence.amount) !== String(row.amount) ||
      row.evidence.direction !== row.direction ||
      !["IN", "OUT"].includes(row.direction) ||
      !["BANK", "RENTAL", "DEPOSIT", "REFUND"].includes(row.sourceCode)
    )
      throw new Error("WALLET_BANK_INTEGRITY_FAILED");
    const value = amount(row.amount),
      sum = sums[row.sourceCode];
    if (row.direction === "IN") {
      incoming += value;
      sum.incoming += value;
      sum.net += value;
    } else {
      outgoing += value;
      sum.outgoing += value;
      sum.net -= value;
    }
    sum.count++;
    transactions.push({
      id: "bank:" + row.id,
      entryId: row.id,
      sourceCode: row.sourceCode,
      direction: row.direction,
      amount: String(value),
      title:
        row.sourceCode === "RENTAL"
          ? "Giao dịch cho thuê"
          : row.sourceCode === "DEPOSIT"
            ? "Giao dịch ký quỹ"
            : row.direction === "IN"
              ? "Nhận tiền qua ngân hàng"
              : "Chi tiền qua ngân hàng",
      reference: row.reference,
      status: "RECONCILED",
      occurredAt: row.occurred_at,
      provider: "SePay",
      verifiedAt: row.evidence.verified_at,
      affectsBankBalance: true,
    });
  }
  const conversionIds = new Set(conversions.map((row) => row.id)),
    balances = new Map();
  for (const row of ledger) {
    if (!conversionIds.has(row.conversionId))
      throw new Error("WALLET_CASHBACK_OWNER_MISMATCH");
    balances.set(
      row.conversionId,
      (balances.get(row.conversionId) || 0n) +
        amount(row.amount, { signed: true }),
    );
  }
  for (const row of conversions) {
    if (!["PENDING", "APPROVED", "REJECTED"].includes(row.status))
      throw new Error("WALLET_STATUS_INVALID");
    const code = merchantSource(row.merchant),
      value = amount(row.reward),
      credited = balances.get(row.id) || 0n;
    if (credited !== (row.status === "APPROVED" ? value : 0n))
      throw new Error("WALLET_CASHBACK_BALANCE_MISMATCH");
    const sum = sums[code];
    sum.confirmed += credited;
    if (row.status === "PENDING") sum.pending += value;
    sum.count++;
    transactions.push({
      id: "cashback:" + row.id,
      sourceCode: code,
      direction: "IN",
      amount: String(value),
      title: `Hoàn tiền ${code === "SHOPEE" ? "Shopee" : "TikTok Shop"}`,
      reference: row.orderId,
      status: row.status,
      occurredAt: row.updatedAt,
      provider: "Đối tác hoàn tiền",
      affectsBankBalance: false,
    });
  }
  for (const row of withdrawals) {
    if (
      !SOURCES.includes(row.sourceCode) ||
      ![
        "REQUESTED",
        "APPROVED",
        "PROCESSING",
        "PAID",
        "REJECTED",
        "CANCELLED",
      ].includes(row.status)
    )
      throw new Error("WALLET_WITHDRAWAL_INVALID");
    if (["REQUESTED", "APPROVED", "PROCESSING"].includes(row.status))
      sums[row.sourceCode].withdrawalPending += amount(row.amount);
  }
  const serialized = SOURCES.map((code) => {
    const r = sums[code];
    return {
      ...r,
      net: String(r.net),
      incoming: String(r.incoming),
      outgoing: String(r.outgoing),
      pending: String(r.pending),
      confirmed: String(r.confirmed),
      withdrawalPending: String(r.withdrawalPending),
      available: null,
    };
  });
  const deposit = snapshot.deposit || { enabled: false };
  return {
    summary: {
      net: String(incoming - outgoing),
      incoming: String(incoming),
      outgoing: String(outgoing),
      bankCount: bank.length,
      cashbackConfirmed: String(sums.SHOPEE.confirmed + sums.TIKTOK.confirmed),
      cashbackPending: String(sums.SHOPEE.pending + sums.TIKTOK.pending),
      available: null,
    },
    sources: serialized,
    deposit: {
      enabled: deposit.enabled === true,
      programLabel: deposit.programLabel || null,
      recorded: String(sums.DEPOSIT.net),
      count: sums.DEPOSIT.count,
    },
    transactions: transactions.sort(
      (a, b) =>
        Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
        a.id.localeCompare(b.id),
    ),
    withdrawals: withdrawals.map((row) => ({
      ...row,
      amount: String(amount(row.amount)),
    })),
    payoutsEnabled: false,
  };
}
export function filterWalletRows(
  rows,
  {
    source = "ALL",
    status = "ALL",
    direction = "ALL",
    query = "",
    page = 1,
    pageSize = 15,
  } = {},
) {
  let filtered = rows.filter(
    (row) =>
      (source === "ALL" || row.sourceCode === source) &&
      (status === "ALL" || row.status === status) &&
      (direction === "ALL" || row.direction === direction),
  );
  const search = query.trim().toLocaleLowerCase("vi-VN");
  if (search)
    filtered = filtered.filter((row) =>
      `${row.reference} ${row.title || ""}`
        .toLocaleLowerCase("vi-VN")
        .includes(search),
    );
  const total = filtered.length,
    start = (page - 1) * pageSize;
  return {
    rows: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}
