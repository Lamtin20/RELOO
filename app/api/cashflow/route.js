import { requireAccount } from "@/lib/security/authorization";
import { decryptPrivate } from "@/lib/operations/crypto";
import { errorResponse, HttpError } from "@/lib/server/http";
import { verifyFinancialSource } from "@/lib/finance/verification";
import { buildWallet, filterWalletRows } from "@/lib/finance/wallet-model";
import { affiliateStatus } from "@/lib/affiliate/provider";
import { verifyPromotionCredit } from "@/lib/promotions/server";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false }),
      params = new URL(request.url).searchParams;
    const page = Number(params.get("page") || 1),
      tab = params.get("tab") || "transactions",
      source = params.get("source") || "ALL",
      status = params.get("status") || "ALL",
      direction = params.get("direction") || "ALL",
      query = (params.get("q") || "").trim().slice(0, 100);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !["transactions", "withdrawals"].includes(tab) ||
      ![
        "ALL",
        "BANK",
        "RENTAL",
        "DEPOSIT",
        "REFUND",
        "SHOPEE",
        "TIKTOK",
      ].includes(source) ||
      ![
        "ALL",
        "RECONCILED",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "REQUESTED",
        "PROCESSING",
        "PAID",
        "CANCELLED",
      ].includes(status) ||
      !["ALL", "IN", "OUT"].includes(direction)
    )
      throw new HttpError(400, "Bộ lọc dòng tiền không hợp lệ.");
    const [snapshot, payout, accounts] = await Promise.all([
      db.rpc("reloo_wallet_snapshot", { p_profile: profile.id }),
      db.rpc("reloo_payout_available", { p_profile: profile.id }),
      db
        .from("customer_va_links")
        .select("id,bank_name,va_encrypted,masked_va,status,expires_at")
        .eq("profile_id", profile.id),
    ]);
    if (snapshot.error || accounts.error || payout.error)
      throw new Error("WALLET_STORAGE_UNAVAILABLE");
    const wallet = buildWallet(
        snapshot.data,
        verifyFinancialSource,
        verifyPromotionCredit,
      ),
      filtered = filterWalletRows(
        tab === "withdrawals" ? wallet.withdrawals : wallet.transactions,
        {
          source,
          status,
          direction: tab === "withdrawals" ? "ALL" : direction,
          query,
          page,
        },
      );
    return Response.json(
      {
        ok: true,
        summary: { ...wallet.summary, available: payout.data.total },
        sources: wallet.sources.map((source) => ({
          ...source,
          available: payout.data.sources[source.code] || "0",
        })),
        payoutRequestsEnabled: true,
        deposit: wallet.deposit,
        rows: filtered.rows,
        total: filtered.total,
        page: filtered.page,
        pageSize: filtered.pageSize,
        tab,
        payoutsEnabled: wallet.payoutsEnabled,
        identityStatus: profile.identityStatus.status,
        accounts: accounts.data.map(({ va_encrypted, ...row }) => ({
          ...row,
          va: decryptPrivate(va_encrypted),
        })),
        affiliate: affiliateStatus().merchants,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
