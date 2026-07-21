"use client";

import { useMemo, useState } from "react";
import {
  Landmark,
  TrendingUp,
  ArrowDownToLine,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useAuth, useReloo, useOrders } from "@/lib/store";
import { Money, EmptyState, StatCard } from "@/components/ui";
import { EscrowHoldPanel } from "@/components/wallet/EscrowHoldPanel";
import { getUserEscrowHolds } from "@/lib/escrow-holds";
import { FEE_RATES, USER_TERMS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const TXN_LABELS = {
  rental_payout: { label: "Nhận tiền thuê", direction: "in" },
  platform_fee: { label: "Phí sàn RELOO", direction: "out" },
  deposit_hold: { label: "Giữ tiền cọc", direction: "out" },
  ads_purchase: { label: "Mua quảng cáo", direction: "out" },
  refund: { label: "Hoàn tiền", direction: "in" },
};

export default function WalletPage() {
  const { user } = useAuth();
  const { state, actions } = useReloo();
  const { orders, getOrderListing } = useOrders({ userId: user?.id });
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const myTransactions = useMemo(
    () =>
      (state.wallet?.recentTransactions ?? []).filter(
        (t) => t.userId === user?.id
      ),
    [state.wallet, user?.id]
  );

  const myPendingWithdrawals = useMemo(
    () =>
      (state.wallet?.pendingWithdrawals ?? []).filter(
        (w) => w.userId === user?.id
      ),
    [state.wallet, user?.id]
  );

  if (!user) return null;

  const escrow = getUserEscrowHolds(user.id, orders, (order) => {
    const listing = getOrderListing(order);
    return listing?.title ?? order.listingId;
  });

  const handleWithdraw = (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (value > user.walletBalance) {
      setError("Số dư cho thuê không đủ để rút số tiền này");
      return;
    }
    if (!user.bankAccount) {
      setError("Vui lòng cập nhật tài khoản ngân hàng ở Hồ sơ trước khi rút tiền");
      return;
    }

    actions.withdrawWallet(user.id, value);
    setAmount("");
    setSuccess(true);
  };

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Tài chính</h1>
          <p className="text-muted mt-2">
            Theo dõi tiền tạm giữ tại {USER_TERMS.ESCROW_ACCOUNT.toLowerCase()},{" "}
            {USER_TERMS.RENTAL_INCOME.toLowerCase()} và lịch sử giao dịch
          </p>
        </div>
      </div>

      <EscrowHoldPanel
        userId={user.id}
        orders={orders}
        getListingTitle={(order) => getOrderListing(order)?.title ?? order.listingId}
        className="mt-6"
      />

      <div className="dashboard-section-label mt-8">
        <h2>{USER_TERMS.RENTAL_INCOME}</h2>
        <p className="text-muted text-sm">Số dư có thể rút về tài khoản ngân hàng liên kết</p>
      </div>

      <div className="dashboard-stats-grid mt-4">
        <StatCard
          label={USER_TERMS.AVAILABLE_BALANCE}
          value={<Money amount={user.walletBalance} />}
          icon="Landmark"
        />
        <StatCard
          label="Tổng thu nhập"
          value={<Money amount={user.totalEarnings ?? 0} />}
          icon="TrendingUp"
        />
        <StatCard
          label="Tổng đơn hoàn tất"
          value={user.totalRentals ?? 0}
          icon="PackageCheck"
        />
      </div>

      <div className="dashboard-grid-2 mt-6">
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Rút {USER_TERMS.RENTAL_INCOME.toLowerCase()} về ngân hàng</h2>
          </div>

          <div className="dashboard-notice">
            <Info size={16} />
            <span>
              RELOO chỉ hỗ trợ <strong>rút {USER_TERMS.RENTAL_INCOME.toLowerCase()}</strong> — không hỗ trợ
              nạp tiền trước theo quy định pháp luật về trung gian thanh toán.
            </span>
          </div>

          <form className="dashboard-form mt-4" onSubmit={handleWithdraw}>
            <div className="input-group">
              <label className="input-label">Tài khoản nhận tiền</label>
              <div className="dashboard-bank-display">
                <Landmark size={16} />
                <span>{user.bankAccount ?? "Chưa liên kết tài khoản ngân hàng"}</span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="amount">
                Số tiền muốn rút (₫)
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                className={`input ${error ? "input-error" : ""}`}
                placeholder="500000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSuccess(false);
                }}
              />
              <span className="input-hint">
                Phí rút tiền: {FEE_RATES.withdrawFee.toLocaleString("vi-VN")}₫/lần ·
                {USER_TERMS.RENTAL_BALANCE}: <Money amount={user.walletBalance} />
              </span>
              {error && <span className="text-xs text-danger">{error}</span>}
            </div>

            {success && (
              <div className="dashboard-notice dashboard-notice--success">
                <ArrowDownToLine size={16} />
                <span>Yêu cầu rút tiền đã được ghi nhận và đang xử lý.</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full">
              <ArrowDownToLine size={16} /> Yêu cầu rút thu nhập
            </button>
          </form>

          {myPendingWithdrawals.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Yêu cầu đang xử lý</h3>
              {myPendingWithdrawals.map((w) => (
                <div key={w.id} className="dashboard-finance-row">
                  <span className="text-muted text-sm">
                    {formatDateTime(w.requestedAt)}
                  </span>
                  <Money amount={w.amount} className="text-sm font-semibold" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Lịch sử giao dịch</h2>
          </div>

          {myTransactions.length === 0 ? (
            <EmptyState
              icon="Receipt"
              title="Chưa có giao dịch"
              description="Lịch sử thu nhập và chi phí của bạn sẽ hiển thị tại đây."
            />
          ) : (
            <div className="dashboard-txn-list">
              {myTransactions.map((txn) => {
                const meta = TXN_LABELS[txn.type] ?? {
                  label: txn.description,
                  direction: "in",
                };
                const isIn = meta.direction === "in";
                return (
                  <div key={txn.id} className="dashboard-txn-row">
                    <div
                      className={`dashboard-txn-row__icon ${
                        isIn ? "dashboard-txn-row__icon--in" : "dashboard-txn-row__icon--out"
                      }`}
                    >
                      {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="dashboard-txn-row__main">
                      <span className="text-sm font-semibold">{txn.description}</span>
                      <span className="text-xs text-muted">
                        {formatDateTime(txn.createdAt)}
                      </span>
                    </div>
                    <Money
                      amount={isIn ? txn.amount : -txn.amount}
                      showSign
                      className={`font-semibold ${isIn ? "text-green" : "text-danger"}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
