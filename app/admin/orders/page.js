"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Search, Eye } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { getOrderStatusMeta } from "@/lib/admin-helpers";
import { ORDER_STATUS_LIST } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

function OrdersPageInner() {
  const { state, actions } = useReloo();
  const { orders, listings, users } = state;
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");

  const getListing = (lid) => listings.find((l) => l.id === lid);
  const getUserName = (uid) => users.find((u) => u.id === uid)?.name || "-";

  const filtered = useMemo(() => {
    let result = [...orders];
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => {
        const listing = getListing(o.listingId);
        return (
          o.id.toLowerCase().includes(q) ||
          listing?.title.toLowerCase().includes(q) ||
          getUserName(o.renterId).toLowerCase().includes(q) ||
          getUserName(o.lenderId).toLowerCase().includes(q)
        );
      });
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Quản lý đơn hàng"
        description="Theo dõi và cập nhật trạng thái tất cả giao dịch thuê trên sàn."
      />

      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Tìm theo mã đơn, tài sản, người dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          {ORDER_STATUS_LIST.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Không có đơn hàng" description="Không tìm thấy đơn hàng khớp với bộ lọc." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Tài sản</th>
                <th>Người thuê</th>
                <th>Chủ đồ</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: "right" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const meta = getOrderStatusMeta(o.status);
                const listing = getListing(o.listingId);
                return (
                  <tr key={o.id}>
                    <td className="font-semibold">{o.id}</td>
                    <td style={{ maxWidth: 220 }} className="text-sm">
                      {listing?.title || "-"}
                    </td>
                    <td className="text-sm">{getUserName(o.renterId)}</td>
                    <td className="text-sm">{getUserName(o.lenderId)}</td>
                    <td>
                      <Money amount={o.grandTotal} compact />
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{
                          width: "auto",
                          minWidth: 150,
                          padding: "6px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: meta.color,
                          borderColor: `${meta.color}44`,
                          background: `${meta.color}0f`,
                        }}
                        value={o.status}
                        onChange={(e) => actions.updateOrderStatus(o.id, e.target.value)}
                      >
                        {ORDER_STATUS_LIST.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-sm text-muted">{formatDateTime(o.createdAt)}</td>
                    <td>
                      <div className="flex justify-end">
                        <Link href={`/admin/orders/${o.id}`} className="btn btn-ghost btn-icon" title="Xem chi tiết">
                          <Eye size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-muted">
        Đang hiển thị {filtered.length} / {orders.length} đơn hàng.
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  );
}
