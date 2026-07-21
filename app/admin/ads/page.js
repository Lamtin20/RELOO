"use client";

import { useMemo } from "react";
import { Megaphone, Crown, Tag, Zap } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";

const TYPE_META = {
  push_up: { label: "Đẩy tin", icon: Zap, variant: "blue" },
  label: { label: "Nhãn nổi bật", icon: Tag, variant: "warning" },
  pro_store: { label: "Cửa hàng Pro", icon: Crown, variant: "green" },
};

function pseudoPurchaseCount(pkg) {
  const seed = pkg.id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return 4 + (seed % 37);
}

export default function AdsPage() {
  const { state } = useReloo();
  const { adsPackages, users, listings, wallet, financeSummary } = state;

  const proUsers = users.filter((u) => u.isPro);
  const boostedListings = listings.filter((l) => l.isBoosted);
  const adsTransactions = (wallet.recentTransactions || []).filter((t) => t.type === "ads_purchase");

  const rows = useMemo(
    () =>
      adsPackages.map((pkg) => ({
        ...pkg,
        purchases: pseudoPurchaseCount(pkg),
      })),
    [adsPackages]
  );

  const totalRevenue = rows.reduce((sum, r) => sum + r.price * r.purchases, 0);
  const maxRevenue = Math.max(1, ...rows.map((r) => r.price * r.purchases));

  return (
    <div>
      <PageHeader
        title="Gói Ads &amp; Quảng cáo"
        description="Danh mục gói quảng cáo (Đẩy tin, Nhãn nổi bật, Pro Store) và thống kê lượt mua."
      />

      <div className="kpi-grid mb-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Doanh thu Ads (kỳ báo cáo)</span>
            <div className="stat-card__icon"><Megaphone size={18} /></div>
          </div>
          <span className="stat-card__value"><Money amount={financeSummary.adsRevenue} compact /></span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Thành viên Pro Store</span>
          <span className="stat-card__value">{proUsers.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Tin đang được đẩy/nổi bật</span>
          <span className="stat-card__value">{boostedListings.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Giao dịch mua Ads gần đây</span>
          <span className="stat-card__value">{adsTransactions.length}</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Danh mục gói Ads</span>
          </div>
          <div className="table-wrap" style={{ boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Gói</th>
                  <th>Loại</th>
                  <th>Giá</th>
                  <th>Lượt mua (ước tính)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = TYPE_META[r.type] || TYPE_META.push_up;
                  const TypeIcon = meta.icon;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="font-semibold text-sm">{r.name}</div>
                        <div className="text-xs text-muted">{r.description}</div>
                      </td>
                      <td>
                        <Badge variant={meta.variant} icon={TypeIcon}>{meta.label}</Badge>
                      </td>
                      <td><Money amount={r.price} /> <span className="text-xs text-muted">/{r.unit || (r.durationDays ? `${r.durationDays} ngày` : "gói")}</span></td>
                      <td>{r.purchases}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Doanh thu ước tính theo gói</span>
          </div>
          <div className="hbar-list">
            {rows.map((r) => (
              <div className="hbar-row" key={r.id}>
                <span className="hbar-row__label" style={{ width: 150 }}>{r.name}</span>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${((r.price * r.purchases) / maxRevenue) * 100}%` }} />
                </div>
                <span className="hbar-row__value"><Money amount={r.price * r.purchases} compact /></span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="detail-row">
            <span className="detail-row__label font-semibold">Tổng ước tính</span>
            <span className="detail-row__value" style={{ fontSize: 15 }}><Money amount={totalRevenue} /></span>
          </div>

          <div className="mt-4">
            <span className="panel-title text-sm">Giao dịch Ads gần đây</span>
            <div className="flex flex-col gap-2 mt-2">
              {adsTransactions.length === 0 ? (
                <span className="text-sm text-muted">Chưa có giao dịch nào.</span>
              ) : (
                adsTransactions.map((t) => {
                  const u = users.find((usr) => usr.id === t.userId);
                  return (
                    <div className="detail-row" key={t.id}>
                      <span className="detail-row__label">{u?.name || t.userId} - {t.description}</span>
                      <span className="detail-row__value"><Money amount={t.amount} /></span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
