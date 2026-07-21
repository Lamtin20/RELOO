"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useOrders } from "@/lib/store";
import { Money, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  ORDER_TABS,
  countOrdersByTab,
  filterOrdersByTab,
  isValidOrderTab,
} from "@/lib/order-tabs";

const EMPTY_COPY = {
  all: {
    title: "Không có đơn hàng",
    description: "Các đơn thuê và cho thuê của bạn sẽ hiển thị tại đây.",
  },
  active: {
    title: "Không có đơn đang thuê",
    description: "Chưa có đơn nào đang trong quá trình thuê hoặc cho thuê.",
  },
  completed: {
    title: "Chưa có đơn hoàn tất",
    description: "Các đơn đã trả đồ và đối soát xong sẽ nằm ở đây.",
  },
  overdue: {
    title: "Không có đơn quá hạn",
    description: "Bạn không có đơn nào quá hạn trả — mọi thứ đang đúng hẹn.",
  },
};

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab");
  const initialTab = isValidOrderTab(paramTab) ? paramTab : "all";

  const { user, users } = useAuth();
  const { orders, getOrderListing } = useOrders({ userId: user?.id });
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (isValidOrderTab(paramTab) && paramTab !== tab) {
      setTab(paramTab);
    }
  }, [paramTab, tab]);

  const activeTab = isValidOrderTab(tab) ? tab : "all";

  const tabCounts = useMemo(() => countOrdersByTab(orders), [orders]);

  const filtered = useMemo(
    () => filterOrdersByTab(orders, activeTab),
    [orders, activeTab],
  );

  if (!user) return null;

  function selectTab(nextTab) {
    setTab(nextTab);
    const qs = nextTab === "all" ? "" : `?tab=${nextTab}`;
    router.replace(`/dashboard/orders${qs}`, { scroll: false });
  }

  const getCounterpartyName = (order) => {
    const counterpartyId =
      order.renterId === user.id ? order.lenderId : order.renterId;
    return users.find((u) => u.id === counterpartyId)?.name ?? "-";
  };

  const empty = EMPTY_COPY[activeTab] ?? EMPTY_COPY.all;

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Đơn hàng</h1>
          <p className="text-muted mt-2">
            Theo dõi các đơn thuê và cho thuê của bạn trên RELOO
          </p>
        </div>
      </div>

      <div className="tabs tabs--orders mt-6" role="tablist" aria-label="Lọc đơn hàng">
        {ORDER_TABS.map((t) => {
          const count = tabCounts[t.id] ?? 0;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tab ${isActive ? "tab--active" : ""}`}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
              <span className="tab__count">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="panel mt-6">
          <EmptyState
            icon="ClipboardX"
            title={empty.title}
            description={empty.description}
          />
        </div>
      ) : (
        <div key={activeTab} className="dashboard-order-cards mt-6">
          {filtered.map((order) => {
            const listing = getOrderListing(order);
            const role = order.renterId === user.id ? "Thuê từ" : "Cho thuê tới";
            return (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="panel dashboard-order-card panel-interactive"
              >
                <div
                  className="dashboard-order-card__image"
                  style={{
                    backgroundImage: listing?.images?.[0]
                      ? `url(${listing.images[0]})`
                      : undefined,
                  }}
                />
                <div className="dashboard-order-card__body">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold dashboard-order-card__title">
                      {listing?.title ?? order.id}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-muted mt-1 dashboard-order-card__meta">
                    <span className="dashboard-order-card__id">{order.id}</span>
                    <span aria-hidden="true"> · </span>
                    {role} {getCounterpartyName(order)}
                  </p>
                  <div className="flex items-center justify-between mt-3 gap-3">
                    <span className="text-xs text-muted">
                      {order.startDate ? formatDate(order.startDate) : "-"} –{" "}
                      {order.endDate ? formatDate(order.endDate) : "-"}
                    </span>
                    <Money amount={order.grandTotal} className="font-semibold" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-page">
          <div className="panel mt-6 p-8 text-center text-muted">Đang tải đơn hàng…</div>
        </div>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}
