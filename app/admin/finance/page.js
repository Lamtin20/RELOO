"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Download, Landmark, Percent, ShieldCheck, ReceiptText } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatDateTime } from "@/lib/utils";

const REVENUE_LABELS = {
  platformFee: "Phí sàn (15%)",
  relooCare: "Gói An Tâm (Reloo Care)",
  ads: "Doanh thu Ads",
  withdrawFees: "Phí rút tiền",
  shippingMargin: "Biên lợi vận chuyển",
};

const TAX_RATE = 0.015;

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildLenderRows(users, orders) {
  return users
    .filter((u) => u.role === "lender" || u.role === "both")
    .map((u) => {
      const lenderOrders = orders.filter((o) => o.lenderId === u.id && o.status !== "cancelled");
      const totalRevenue = lenderOrders.reduce((sum, o) => sum + (o.rentalTotal || 0), 0);
      const taxAmount = Math.round(totalRevenue * TAX_RATE);
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        bankAccount: u.bankAccount || "",
        totalOrders: lenderOrders.length,
        totalRevenue,
        taxRate: TAX_RATE,
        taxAmount,
      };
    })
    .filter((r) => r.totalOrders > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function FinancePageInner() {
  const { state } = useReloo();
  const { financeSummary, wallet, users, orders } = state;
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "revenue");

  const lenderRows = useMemo(() => buildLenderRows(users, orders), [users, orders]);
  const totalTax = lenderRows.reduce((sum, r) => sum + r.taxAmount, 0);

  const revenueEntries = Object.entries(financeSummary.revenueBreakdown || {});
  const maxRevenue = Math.max(1, ...revenueEntries.map(([, v]) => v));

  const exportJson = () => {
    downloadFile(
      JSON.stringify({ period: financeSummary.period, taxRate: TAX_RATE, generatedAt: new Date().toISOString(), lenders: lenderRows }, null, 2),
      `reloo-nd91-${financeSummary.period}.json`,
      "application/json"
    );
  };

  const exportCsv = () => {
    const header = "Họ tên,SĐT,Email,Tài khoản ngân hàng,Số đơn,Tổng doanh thu (VNĐ),Thuế suất,Thuế phải khai (VNĐ)";
    const rows = lenderRows.map((r) =>
      [r.name, r.phone, r.email, r.bankAccount, r.totalOrders, r.totalRevenue, `${(r.taxRate * 100).toFixed(1)}%`, r.taxAmount]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    downloadFile([header, ...rows].join("\n"), `reloo-nd91-${financeSummary.period}.csv`, "text/csv;charset=utf-8");
  };

  return (
    <div>
      <PageHeader
        title="Tài chính & Đối soát"
        description="Doanh thu sàn, dòng tiền ký quỹ và báo cáo thuế theo Nghị định 91/2022/NĐ-CP."
      />

      <div className="tabs mb-4" style={{ maxWidth: 460 }}>
        <button type="button" className={`tab${tab === "revenue" ? " tab--active" : ""}`} onClick={() => setTab("revenue")}>
          Doanh thu
        </button>
        <button type="button" className={`tab${tab === "reconcile" ? " tab--active" : ""}`} onClick={() => setTab("reconcile")}>
          Đối soát
        </button>
        <button type="button" className={`tab${tab === "tax" ? " tab--active" : ""}`} onClick={() => setTab("tax")}>
          Báo cáo thuế NĐ91
        </button>
      </div>

      {tab === "revenue" && (
        <>
          <div className="kpi-grid mb-4">
            <div className="stat-card">
              <span className="stat-card__label">GMV kỳ báo cáo</span>
              <span className="stat-card__value"><Money amount={financeSummary.gmv} compact /></span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Doanh thu sàn</span>
              <span className="stat-card__value"><Money amount={financeSummary.platformRevenue} compact /></span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Biên lợi gộp</span>
              <span className="stat-card__value">{(financeSummary.grossMargin * 100).toFixed(1)}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Tỷ lệ tranh chấp / quá hạn</span>
              <span className="stat-card__value">{(financeSummary.disputeRate * 100).toFixed(1)}% / {(financeSummary.overdueRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Percent size={16} /> Phân rã doanh thu
              </span>
            </div>
            <div className="hbar-list">
              {revenueEntries.map(([key, value]) => (
                <div className="hbar-row" key={key}>
                  <span className="hbar-row__label">{REVENUE_LABELS[key] || key}</span>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${(value / maxRevenue) * 100}%` }} />
                  </div>
                  <span className="hbar-row__value"><Money amount={value} compact /></span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "reconcile" && (
        <>
          <div className="grid-3 mb-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="stat-card__label">Số dư ký quỹ (Escrow)</span>
                <Landmark size={18} style={{ color: "var(--green)" }} />
              </div>
              <span className="stat-card__value"><Money amount={wallet.escrowBalance} compact /></span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Tiền cọc đang giữ</span>
              <span className="stat-card__value"><Money amount={wallet.depositHeld} compact /></span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Reloo Care Pool</span>
              <span className="stat-card__value"><Money amount={wallet.relooCarePool} compact /></span>
            </div>
          </div>

          <div className="panel mb-4">
            <div className="panel-header">
              <span className="panel-title">Rút tiền đang chờ xử lý</span>
            </div>
            {(wallet.pendingWithdrawals || []).length === 0 ? (
              <span className="text-sm text-muted">Không có yêu cầu rút tiền nào đang chờ.</span>
            ) : (
              <div className="table-wrap" style={{ boxShadow: "none" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Số tiền</th>
                      <th>Phí</th>
                      <th>Ngân hàng</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.pendingWithdrawals.map((w) => {
                      const u = users.find((usr) => usr.id === w.userId);
                      return (
                        <tr key={w.id}>
                          <td className="text-sm font-semibold">{u?.name || w.userId}</td>
                          <td><Money amount={w.amount} /></td>
                          <td className="text-sm text-muted"><Money amount={w.fee} /></td>
                          <td className="text-sm text-muted">{w.bankAccount}</td>
                          <td><Badge variant="warning">Đang xử lý</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Giao dịch gần đây</span>
            </div>
            <div className="table-wrap" style={{ boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Diễn giải</th>
                    <th>Số tiền</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {(wallet.recentTransactions || []).map((t) => (
                    <tr key={t.id}>
                      <td><Badge variant="blue">{t.type}</Badge></td>
                      <td className="text-sm">{t.description}</td>
                      <td><Money amount={t.amount} /></td>
                      <td className="text-sm text-muted">{formatDateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "tax" && (
        <>
          <div className="panel mb-4" style={{ borderColor: "var(--blue-light)", background: "rgba(21,101,192,0.05)" }}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} style={{ color: "var(--blue)" }} />
              <span className="font-semibold text-sm">Ghi chú VAT &amp; Nghị định 91/2022/NĐ-CP</span>
            </div>
            <p className="text-sm text-muted">
              Theo Nghị định 91/2022/NĐ-CP, sàn TMĐT có nghĩa vụ khai và nộp thuế thay cho cá nhân kinh doanh (chủ đồ)
              nếu được ủy quyền, hoặc cung cấp thông tin doanh thu người bán cho cơ quan thuế. RELOO áp dụng mức khai
              thuế tham chiếu <strong>{(TAX_RATE * 100).toFixed(1)}%</strong> trên doanh thu cho thuê thực nhận (chưa gồm VAT {(0.1 * 100).toFixed(0)}%
              phí dịch vụ sàn xuất hóa đơn riêng).
            </p>
          </div>

          <div className="admin-page-header" style={{ marginBottom: 16 }}>
            <div>
              <span className="panel-title flex items-center gap-2">
                <ReceiptText size={16} /> Danh sách chủ đồ (lenders) kỳ {financeSummary.period}
              </span>
              <p className="text-xs text-muted mt-1">
                Tổng thuế tham chiếu cần khai: <Money amount={totalTax} className="font-semibold" />
              </p>
            </div>
            <div className="admin-page-actions">
              <button type="button" className="btn btn-secondary" onClick={exportCsv}>
                <Download size={16} /> Xuất CSV
              </button>
              <button type="button" className="btn btn-primary" onClick={exportJson}>
                <Download size={16} /> Xuất JSON
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Chủ đồ</th>
                  <th>SĐT / Email</th>
                  <th>Số đơn</th>
                  <th>Doanh thu</th>
                  <th>Thuế tham chiếu</th>
                </tr>
              </thead>
              <tbody>
                {lenderRows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold text-sm">{r.name}</td>
                    <td className="text-sm text-muted">{r.phone} · {r.email}</td>
                    <td>{r.totalOrders}</td>
                    <td><Money amount={r.totalRevenue} /></td>
                    <td><Money amount={r.taxAmount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={null}>
      <FinancePageInner />
    </Suspense>
  );
}
