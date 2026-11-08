import test from "node:test";
import assert from "node:assert/strict";
import { buildWallet, filterWalletRows } from "../lib/finance/wallet-model.js";
import { formatMoney } from "../lib/finance/wallet-display.js";
const empty = () => ({
  bankCount: 0,
  bankEntries: [],
  conversionsCount: 0,
  conversions: [],
  cashbackLedger: [],
  withdrawalsCount: 0,
  withdrawals: [],
  deposit: { enabled: false },
});
function bank(id, sourceCode, direction, amount) {
  return {
    id,
    sourceCode,
    direction,
    amount,
    reference: "RELOO-" + id,
    occurred_at: "2026-10-10T03:00:00Z",
    evidence: {
      direction,
      amount,
      verified_at: "2026-10-10T03:01:00Z",
      secret: "must-not-leak",
    },
  };
}
test("wallet separates bank principal, deposits and affiliate receivables without rounding or double counting", () => {
  const input = empty();
  input.bankEntries = [
    bank("1", "RENTAL", "IN", "9007199254740991"),
    bank("2", "BANK", "IN", "9007199254740991"),
    bank("3", "RENTAL", "OUT", "350000"),
    bank("4", "DEPOSIT", "IN", "2000000"),
  ];
  input.bankCount = 4;
  input.conversions = [
    {
      id: "s",
      merchant: "shopee",
      status: "APPROVED",
      reward: "65000",
      orderId: "ORDER-S",
      updatedAt: "2026-10-10T05:00:00Z",
    },
    {
      id: "t",
      merchant: "tiktok",
      status: "PENDING",
      reward: "125000",
      orderId: "ORDER-T",
      updatedAt: "2026-10-10T04:00:00Z",
    },
    {
      id: "r",
      merchant: "shopee",
      status: "REJECTED",
      reward: "40000",
      orderId: "ORDER-R",
      updatedAt: "2026-10-10T03:00:00Z",
    },
  ];
  input.conversionsCount = 3;
  input.cashbackLedger = [
    { conversionId: "s", amount: "65000" },
    { conversionId: "r", amount: "40000" },
    { conversionId: "r", amount: "-40000" },
  ];
  const result = buildWallet(input, () => true);
  assert.equal(result.summary.net, "18014398511131982");
  assert.equal(result.summary.cashbackConfirmed, "65000");
  assert.equal(result.summary.cashbackPending, "125000");
  assert.equal(
    result.sources.find((r) => r.code === "RENTAL").net,
    "9007199254390991",
  );
  assert.equal(result.deposit.recorded, "2000000");
  assert.equal(result.deposit.enabled, false);
  assert.equal(result.summary.available, null);
  assert.equal(result.payoutsEnabled, false);
  assert.equal(result.transactions.length, 7);
  assert.ok(
    result.transactions
      .filter((r) => r.sourceCode === "SHOPEE" || r.sourceCode === "TIKTOK")
      .every((r) => !r.affectsBankBalance),
  );
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
  assert.equal(formatMoney(result.summary.net), "18.014.398.511.131.982 ₫");
});
test("wallet fails closed on incomplete pages, changed bank evidence, orphan ledger entries and unreversed cashback", () => {
  const input = empty();
  input.bankCount = 1;
  input.bankEntries = [bank("1", "BANK", "IN", "1000")];
  assert.throws(() => buildWallet(input), /INTEGRITY/);
  assert.throws(
    () => buildWallet({ ...input, bankCount: 2 }, () => true),
    /INCOMPLETE/,
  );
  assert.throws(
    () =>
      buildWallet(
        {
          ...input,
          bankEntries: [{ ...input.bankEntries[0], amount: "2000" }],
        },
        () => true,
      ),
    /INTEGRITY/,
  );
  assert.throws(
    () =>
      buildWallet(
        {
          ...input,
          bankEntries: [{ ...input.bankEntries[0], direction: "OUT" }],
        },
        () => true,
      ),
    /INTEGRITY/,
  );
  assert.throws(
    () =>
      buildWallet({
        ...empty(),
        cashbackLedger: [{ conversionId: "another-customer", amount: "100" }],
      }),
    /OWNER_MISMATCH/,
  );
  const conversion = {
    id: "r",
    merchant: "shopee",
    status: "REJECTED",
    reward: "1000",
    updatedAt: "2026-10-10T03:00:00Z",
  };
  assert.throws(
    () =>
      buildWallet({
        ...empty(),
        conversions: [conversion],
        conversionsCount: 1,
        cashbackLedger: [{ conversionId: "r", amount: "1000" }],
      }),
    /BALANCE_MISMATCH/,
  );
  assert.throws(
    () =>
      buildWallet(
        { ...input, bankEntries: [bank("1", "BANK", "IN", 9007199254740992)] },
        () => true,
      ),
    /AMOUNT_INVALID/,
  );
});
test("withdrawal stages and filters preserve exact amounts and expose only matching rows", () => {
  const input = empty();
  input.withdrawals = [
    "REQUESTED",
    "APPROVED",
    "PROCESSING",
    "PAID",
    "REJECTED",
    "CANCELLED",
  ].map((status, i) => ({
    id: String(i),
    sourceCode: "SHOPEE",
    amount: "100000",
    status,
    reference: "RUT-" + i,
    createdAt: "2026-10-10T03:00:00Z",
  }));
  input.withdrawalsCount = 6;
  const wallet = buildWallet(input);
  assert.equal(
    wallet.sources.find((r) => r.code === "SHOPEE").withdrawalPending,
    "300000",
  );
  assert.equal(
    filterWalletRows(wallet.withdrawals, { status: "PROCESSING" }).rows[0]
      .reference,
    "RUT-2",
  );
  assert.equal(
    filterWalletRows(wallet.withdrawals, { query: "rut-4" }).rows[0].status,
    "REJECTED",
  );
  assert.equal(
    filterWalletRows(wallet.withdrawals, { source: "RENTAL" }).total,
    0,
  );
  assert.deepEqual(
    filterWalletRows(wallet.withdrawals, { page: 2, pageSize: 2 }).rows.map(
      (r) => r.reference,
    ),
    ["RUT-2", "RUT-3"],
  );
  assert.equal(buildWallet(empty()).summary.net, "0");
});
