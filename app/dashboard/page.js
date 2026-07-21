"use client";

import Link from "next/link";
import {
  Package,
  ClipboardList,
  Landmark,
  ShieldCheck,
  PlusCircle,
  Leaf,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { useAuth, useOrders, useListings } from "@/lib/store";
import { StatCard, TrustScore, Money, EmptyState } from "@/components/ui";
import { EscrowHoldPanel } from "@/components/wallet/EscrowHoldPanel";
import { getUserEscrowHolds } from "@/lib/escrow-holds";
import { StatusBadge, ACTIVE_ORDER_STATUSES } from "@/components/dashboard/StatusBadge";
import { USER_TERMS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    href: "/dashboard/assets/new",
    label: "Đăng đồ mới",
    icon: PlusCircle,
    desc: "Tạo tin cho thuê mới",
  },
  {
    href: "/dashboard/orders",
    label: "Xem đơn hàng",
    icon: ClipboardList,
    desc: "Theo dõi trạng thái các đơn thuê/cho thuê",
  },
  {
    href: "/dashboard/audit",
    label: "Kiểm tra tình trạng",
    icon: Leaf,
    desc: "Kiểm định giao/nhận tài sản",
  },
  {
    href: "/dashboard/ads",
    label: "Đẩy tin quảng cáo",
    icon: Megaphone,
    desc: "Tăng lượt xem cho tin đăng",
  },
];

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { orders, getOrderListing } = useOrders({ userId: user?.id });
  const { listings } = useListings({ ownerId: user?.id });

  if (!user) return null;

  const rentingCount = orders.filter(
    (o) => o.renterId === user.id && ACTIVE_ORDER_STATUSES.includes(o.status)
  ).length;

  const lendingCount = orders.filter(
    (o) => o.lenderId === user.id && ACTIVE_ORDER_STATUSES.includes(o.status)
  ).length;

  const recentOrders = orders.slice(0, 5);

  const escrow = getUserEscrowHolds(user.id, orders, (order) => {
    const listing = getOrderListing(order);
    return listing?.title ?? order.listingId;
  });

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-welcome panel">
        <div className="dashboard-welcome__text">
          <p className="text-muted text-sm">Chào mừng trở lại,</p>
          <h1 className="text-display">{user.name} 👋</h1>
          <p className="text-muted mt-2">
            Bạn có{" "}
            <strong className="text-green">{listings.length}</strong> tài sản
            trong kho đồ và{" "}
            <strong className="text-blue">{orders.length}</strong> đơn hàng
            trên hệ thống RELOO.
          </p>
        </div>
        <div className="dashboard-welcome__trust">
          <TrustScore score={Math.round((user.trustScore ?? 0) / 10)} size={96} />
          <span className="text-xs text-muted mt-2">
            {user.trustScore ?? 0} / 1000 điểm
          </span>
        </div>
      </div>

      <div className="dashboard-stats-grid mt-6">
        <StatCard label="Đang thuê" value={rentingCount} icon="ShoppingBag" />
        <StatCard label="Đang cho thuê" value={lendingCount} icon="Package" />
        <StatCard
          label={USER_TERMS.RENTAL_INCOME}
          value={<Money amount={user.walletBalance} />}
          icon="Landmark"
        />
        {escrow.renter.total > 0 && (
          <StatCard
            label="Cọc & thuê đang giữ"
            value={<Money amount={escrow.renter.total} />}
            icon="ShieldCheck"
          />
        )}
        {escrow.lender.total > 0 && (
          <StatCard
            label="Thuê chờ giải ngân"
            value={<Money amount={escrow.lender.total} />}
            icon="Clock"
          />
        )}
        <StatCard
          label="Điểm uy tín"
          value={`${user.trustScore ?? 0}`}
          change={user.kycLevel}
          changeDirection="up"
          icon="ShieldCheck"
        />
      </div>

      <EscrowHoldPanel
        userId={user.id}
        orders={orders}
        getListingTitle={(order) => getOrderListing(order)?.title ?? order.listingId}
        compact
        className="mt-6"
      />

      <div className="dashboard-grid-2 mt-6">
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Đơn hàng gần đây</h2>
            <Link href="/dashboard/orders" className="text-sm text-green font-semibold">
              Xem tất cả
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState
              icon="ClipboardList"
              title="Chưa có đơn hàng"
              description="Các đơn thuê và cho thuê của bạn sẽ hiển thị tại đây."
            />
          ) : (
            <div className="dashboard-order-list">
              {recentOrders.map((order) => {
                const listing = getOrderListing(order);
                const role = order.renterId === user.id ? "Đang thuê" : "Cho thuê";
                return (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="dashboard-order-row"
                  >
                    <div className="dashboard-order-row__main">
                      <span className="font-semibold text-sm">
                        {listing?.title ?? order.id}
                      </span>
                      <span className="text-xs text-muted">
                        {order.id} · {role} · {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <div className="dashboard-order-row__meta">
                      <Money amount={order.grandTotal} className="text-sm font-semibold" />
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Thao tác nhanh</h2>
          </div>
          <div className="dashboard-quick-actions">
            {QUICK_ACTIONS.map(({ href, label, icon: ItemIcon, desc }) => (
              <Link key={href} href={href} className="dashboard-quick-action">
                <div className="dashboard-quick-action__icon">
                  <ItemIcon size={20} strokeWidth={1.8} />
                </div>
                <div className="dashboard-quick-action__text">
                  <span className="font-semibold text-sm">{label}</span>
                  <span className="text-xs text-muted">{desc}</span>
                </div>
                <ArrowRight size={16} className="dashboard-quick-action__arrow" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
