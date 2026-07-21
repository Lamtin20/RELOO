"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Wallet,
  Percent,
  HeartHandshake,
  Users2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getOrderStatusMeta,
  getTicketStatusMeta,
  getTicketPriorityMeta,
  getRiskLevelMeta,
} from "@/lib/admin-helpers";
import { formatDateTime } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { state } = useReloo();
  const { financeSummary, orders, tickets, riskAlerts, users } = state;

  const overdueOrders = useMemo(
    () => orders.filter((o) => o.status === "overdue" || o.status === "risk"),
    [orders]
  );

  const activeUsers = users.filter((u) => u.role !== "admin").length;

  const recentTickets = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5),
    [tickets]
  );

  const activeAlerts = useMemo(
    () => riskAlerts.filter((a) => a.status === "active").slice(0, 5),
    [riskAlerts]
  );

  const maxTrend = Math.max(
    1,
    ...financeSummary.monthlyTrend.flatMap((m) => [m.gmv, m.revenue])
  );

  const maxCategory = Math.max(
    1,
    ...financeSummary.topCategories.map((c) => c.gmv)
  );

  const getUser = (id) => users.find((u) => u.id === id);

  return (
    <div>
      <PageHeader
        title="Tổng quan CRM"
        description="Theo dõi tình hình vận hành, tài chính và rủi ro của sàn RELOO theo thời gian thực (mô phỏng)."
      />

      <div className="kpi-grid mb-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">GMV (Quý hiện tại)</span>
            <div className="stat-card__icon">
              <Wallet size={18} />
            </div>
          </div>
          <span className="stat-card__value">
            <Money amount={financeSummary.gmv} compact />
          </span>
          <span className="stat-card__change stat-card__change--up">
            ↑ {financeSummary.completedOrders} đơn hoàn tất
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Phí sàn 15%</span>
            <div className="stat-card__icon">
              <Percent size={18} />
            </div>
          </div>
          <span className="stat-card__value">
            <Money amount={financeSummary.platformRevenue} compact />
          </span>
          <span className="text-muted text-xs">Doanh thu thuần từ hoa hồng</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Reloo Care Pool</span>
            <div className="stat-card__icon">
              <HeartHandshake size={18} />
            </div>
          </div>
          <span className="stat-card__value">
            <Money amount={financeSummary.relooCarePool} compact />
          </span>
          <span className="text-muted text-xs">Quỹ chia sẻ rủi ro cộng đồng</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Người dùng hoạt động</span>
            <div className="stat-card__icon">
              <Users2 size={18} />
            </div>
          </div>
          <span className="stat-card__value">{financeSummary.activeUsers.toLocaleString("vi-VN")}</span>
          <span className="text-muted text-xs">{activeUsers} người trong dữ liệu demo</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Đơn quá hạn</span>
            <div className="stat-card__icon" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <span className="stat-card__value" style={{ color: overdueOrders.length ? "var(--danger)" : undefined }}>
            {overdueOrders.length}
          </span>
          <Link href="/admin/orders?status=overdue" className="text-sm text-blue font-medium">
            Xem chi tiết →
          </Link>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">GMV &amp; Doanh thu theo tháng</span>
          </div>
          <div className="bar-chart">
            {financeSummary.monthlyTrend.map((m) => (
              <div className="bar-chart__col" key={m.month}>
                <div className="bar-chart__bars">
                  <div
                    className="bar-chart__bar"
                    style={{ height: `${Math.max(6, (m.gmv / maxTrend) * 100)}%` }}
                    title={`GMV: ${m.gmv.toLocaleString("vi-VN")}đ`}
                  />
                  <div
                    className="bar-chart__bar bar-chart__bar--alt"
                    style={{ height: `${Math.max(6, (m.revenue / maxTrend) * 100)}%` }}
                    title={`Doanh thu: ${m.revenue.toLocaleString("vi-VN")}đ`}
                  />
                </div>
                <span className="bar-chart__label">{m.month.slice(5)}/{m.month.slice(0, 4)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-xs flex items-center gap-1">
              <span className="legend-dot" style={{ background: "var(--green)" }} /> GMV
            </span>
            <span className="text-xs flex items-center gap-1">
              <span className="legend-dot" style={{ background: "var(--blue)" }} /> Doanh thu sàn
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">GMV theo danh mục</span>
          </div>
          <div className="hbar-list">
            {financeSummary.topCategories.map((c) => (
              <div className="hbar-row" key={c.categoryId}>
                <span className="hbar-row__label">{state.categories.find((cat) => cat.id === c.categoryId)?.name || c.categoryId}</span>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${(c.gmv / maxCategory) * 100}%` }} />
                </div>
                <span className="hbar-row__value">
                  <Money amount={c.gmv} compact />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Tickets CSKH gần đây</span>
            <Link href="/admin/tickets" className="btn btn-ghost btn-sm">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <EmptyState title="Chưa có ticket" description="Chưa có yêu cầu hỗ trợ nào." />
          ) : (
            <div className="flex flex-col gap-3">
              {recentTickets.map((t) => {
                const statusMeta = getTicketStatusMeta(t.status);
                const priorityMeta = getTicketPriorityMeta(t.priority);
                const requester = getUser(t.userId);
                return (
                  <Link
                    key={t.id}
                    href={`/admin/tickets/${t.id}`}
                    className="panel panel-interactive"
                    style={{ padding: 14 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{t.subject}</span>
                      <StatusPill label={statusMeta.label} color={statusMeta.color} />
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-xs text-muted">
                        {requester?.name || "Ẩn danh"} · {formatDateTime(t.updatedAt)}
                      </span>
                      <StatusPill label={priorityMeta.label} color={priorityMeta.color} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Cảnh báo rủi ro đang hoạt động</span>
            <Link href="/admin/risk" className="btn btn-ghost btn-sm">
              Risk Ops <ArrowRight size={14} />
            </Link>
          </div>
          {activeAlerts.length === 0 ? (
            <EmptyState icon="ShieldCheck" title="Không có cảnh báo" description="Hệ thống đang an toàn." />
          ) : (
            <div className="flex flex-col gap-3">
              {activeAlerts.map((a) => {
                const levelMeta = getRiskLevelMeta(a.level);
                const relatedOrder = orders.find((o) => o.id === a.orderId);
                return (
                  <Link
                    key={a.id}
                    href={a.orderId ? `/admin/orders/${a.orderId}` : "/admin/risk"}
                    className="panel panel-interactive"
                    style={{ padding: 14 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{a.title}</span>
                      <StatusPill label={levelMeta.label} color={levelMeta.color} />
                    </div>
                    <p className="text-xs text-muted mt-2">{a.description}</p>
                    {relatedOrder && (
                      <div className="mt-2">
                        <StatusPill
                          label={getOrderStatusMeta(relatedOrder.status).label}
                          color={getOrderStatusMeta(relatedOrder.status).color}
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
