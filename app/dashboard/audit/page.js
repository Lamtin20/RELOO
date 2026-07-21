"use client";

import Link from "next/link";
import { Leaf, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth, useOrders } from "@/lib/store";
import { EmptyState, Badge } from "@/components/ui";
import { formatDate, shortHash } from "@/lib/utils";

export default function AuditListPage() {
  const { user } = useAuth();
  const { orders, getOrderListing } = useOrders({ userId: user?.id });

  if (!user) return null;

  const needsAudit = orders.filter((o) => {
    if (o.lenderId === user.id && o.status === "paid") return true;
    if (o.renterId === user.id && o.status === "in_use") return true;
    return false;
  });

  const auditHistory = orders.filter(
    (o) => o.auditPickupHash || o.auditReturnHash
  );

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Green Audit</h1>
          <p className="text-muted mt-2">
            Kiểm định 5 bước trước khi giao/nhận tài sản - dữ liệu được băm
            SHA-256 và ghi nhận minh bạch.
          </p>
        </div>
      </div>

      <div className="panel mt-6">
        <div className="panel-header">
          <h2 className="panel-title">Cần thực hiện</h2>
        </div>

        {needsAudit.length === 0 ? (
          <EmptyState
            icon="Leaf"
            title="Không có audit nào cần thực hiện"
            description="Khi có đơn hàng cần giao hoặc nhận tài sản, kiểm định sẽ hiển thị tại đây."
          />
        ) : (
          <div className="dashboard-audit-list">
            {needsAudit.map((order) => {
              const listing = getOrderListing(order);
              const type = order.lenderId === user.id ? "pickup" : "return";
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/audit/${order.id}`}
                  className="dashboard-audit-row"
                >
                  <div className="dashboard-audit-row__icon">
                    <Leaf size={18} />
                  </div>
                  <div className="dashboard-audit-row__main">
                    <span className="font-semibold text-sm">
                      {listing?.title ?? order.id}
                    </span>
                    <span className="text-xs text-muted">
                      {order.id} ·{" "}
                      {type === "pickup" ? "Kiểm định giao đi" : "Kiểm định trả đồ"}
                    </span>
                  </div>
                  <Badge variant="warning">Chờ kiểm định</Badge>
                  <ArrowRight size={16} className="text-muted" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel mt-6">
        <div className="panel-header">
          <h2 className="panel-title">Lịch sử kiểm định</h2>
        </div>

        {auditHistory.length === 0 ? (
          <p className="text-sm text-muted">Chưa có lịch sử kiểm định.</p>
        ) : (
          <div className="dashboard-audit-history">
            {auditHistory.map((order) => {
              const listing = getOrderListing(order);
              return (
                <div key={order.id} className="dashboard-audit-history__row">
                  <div>
                    <span className="font-semibold text-sm">
                      {listing?.title ?? order.id}
                    </span>
                    <span className="text-xs text-muted block">
                      {order.id} · {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {order.auditPickupHash && (
                      <Badge variant="green" icon={CheckCircle2}>
                        Giao: {shortHash(order.auditPickupHash, 4, 3)}
                      </Badge>
                    )}
                    {order.auditReturnHash && (
                      <Badge variant="blue" icon={CheckCircle2}>
                        Trả: {shortHash(order.auditReturnHash, 4, 3)}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
