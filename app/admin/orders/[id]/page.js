"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Package,
  Truck,
  ShieldCheck,
  Gavel,
  Hash,
  Calendar,
} from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/admin/PageHeader";
import { Avatar } from "@/components/admin/Avatar";
import { StatusPill } from "@/components/admin/StatusPill";
import { getOrderStatusMeta } from "@/lib/admin-helpers";
import { ORDER_STATUS_LIST } from "@/lib/constants";
import { formatDateTime, shortHash } from "@/lib/utils";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { state, actions } = useReloo();
  const { orders, listings, users, riskAlerts } = state;
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeResolution, setDisputeResolution] = useState("");

  const order = orders.find((o) => o.id === id);
  const listing = listings.find((l) => l.id === order?.listingId);
  const renter = users.find((u) => u.id === order?.renterId);
  const lender = users.find((u) => u.id === order?.lenderId);
  const relatedAlert = riskAlerts.find((a) => a.orderId === id && a.status === "active");

  const meta = useMemo(() => (order ? getOrderStatusMeta(order.status) : null), [order]);

  if (!order) {
    return (
      <EmptyState
        title="Không tìm thấy đơn hàng"
        description="Đơn hàng này không tồn tại hoặc đã bị xoá."
        action={
          <Link href="/admin/orders" className="btn btn-secondary">
            Về danh sách đơn hàng
          </Link>
        }
      />
    );
  }

  const resolveDispute = (favor) => {
    actions.updateOrderStatus(order.id, "completed", {
      disputeResolvedBy: "admin",
      disputeResolution: disputeResolution || `Trọng tài RELOO phân xử nghiêng về ${favor === "renter" ? "người thuê" : "chủ đồ"}`,
    });
    if (relatedAlert) {
      actions.resolveRisk(relatedAlert.id, disputeResolution || "Đã xử lý qua Trọng tài");
    }
    setDisputeOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={order.id}
        description={listing?.title}
        backHref="/admin/orders"
        backLabel="Đơn hàng"
        actions={
          <>
            <select
              className="select"
              style={{ width: "auto", minWidth: 180 }}
              value={order.status}
              onChange={(e) => actions.updateOrderStatus(order.id, e.target.value)}
            >
              {ORDER_STATUS_LIST.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
            {order.status === "disputed" && (
              <button type="button" className="btn btn-danger" onClick={() => setDisputeOpen(true)}>
                <Gavel size={16} /> Xử lý tranh chấp
              </button>
            )}
          </>
        }
      />

      <div className="detail-grid">
        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Package size={16} /> Tài sản thuê
              </span>
              <StatusPill label={meta.label} color={meta.color} />
            </div>
            <div className="flex items-center gap-3 mb-3">
              {listing?.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }}
                />
              )}
              <div>
                <div className="font-semibold">{listing?.title}</div>
                <div className="text-sm text-muted">{listing?.location}</div>
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Giá thuê / ngày</span>
              <span className="detail-row__value"><Money amount={order.dailyPrice} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Số ngày thuê</span>
              <span className="detail-row__value">{order.days} ngày</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Thời gian thuê</span>
              <span className="detail-row__value flex items-center gap-1">
                <Calendar size={13} />
                {order.startDate ? formatDateTime(order.startDate) : "-"} → {order.endDate ? formatDateTime(order.endDate) : "-"}
              </span>
            </div>
            {order.notes && (
              <div className="detail-row">
                <span className="detail-row__label">Ghi chú</span>
                <span className="detail-row__value">{order.notes}</span>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Truck size={16} /> Vận chuyển &amp; Green Audit
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Đơn vị vận chuyển</span>
              <span className="detail-row__value">{order.shippingProvider || "Chưa gán"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Mã vận đơn</span>
              <span className="detail-row__value">{order.trackingNumber || "-"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label flex items-center gap-1">
                <Hash size={13} /> Hash Green Audit - Giao đi
              </span>
              <span className="detail-row__value">
                {order.auditPickupHash ? (
                  <span className="copyable-hash">{shortHash(order.auditPickupHash)}</span>
                ) : (
                  "Chưa kiểm định"
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label flex items-center gap-1">
                <Hash size={13} /> Hash Green Audit - Trả đồ
              </span>
              <span className="detail-row__value">
                {order.auditReturnHash ? (
                  <span className="copyable-hash">{shortHash(order.auditReturnHash)}</span>
                ) : (
                  "Chưa kiểm định"
                )}
              </span>
            </div>
          </div>

          {order.status === "disputed" && order.disputeReason && (
            <div className="panel" style={{ borderColor: "var(--danger)", background: "var(--danger-light)" }}>
              <div className="panel-header">
                <span className="panel-title text-danger">⚠ Đang tranh chấp</span>
              </div>
              <p className="text-sm">{order.disputeReason}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Người thuê</span>
            </div>
            {renter && (
              <Link href={`/admin/users/${renter.id}`} className="flex items-center gap-3">
                <Avatar name={renter.name} src={renter.avatar} size={44} />
                <div>
                  <div className="font-semibold text-sm">{renter.name}</div>
                  <div className="text-xs text-muted">Trust Score: {renter.trustScore}</div>
                </div>
              </Link>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Chủ đồ</span>
            </div>
            {lender && (
              <Link href={`/admin/users/${lender.id}`} className="flex items-center gap-3">
                <Avatar name={lender.name} src={lender.avatar} size={44} />
                <div>
                  <div className="font-semibold text-sm">{lender.name}</div>
                  <div className="text-xs text-muted">Trust Score: {lender.trustScore}</div>
                </div>
              </Link>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <ShieldCheck size={16} /> Thanh toán
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Tiền thuê</span>
              <span className="detail-row__value"><Money amount={order.rentalTotal} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Phí sàn (15%)</span>
              <span className="detail-row__value"><Money amount={order.platformFee} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Gói An Tâm ({order.relooCarePlan})</span>
              <span className="detail-row__value"><Money amount={order.relooCareFee} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Tiền cọc</span>
              <span className="detail-row__value"><Money amount={order.deposit} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Phí vận chuyển</span>
              <span className="detail-row__value"><Money amount={order.shippingFee} /></span>
            </div>
            <div className="divider" />
            <div className="detail-row">
              <span className="detail-row__label font-semibold">Tổng thanh toán</span>
              <span className="detail-row__value" style={{ fontSize: 16 }}><Money amount={order.grandTotal} /></span>
            </div>
            <div className="mt-2">
              {order.paidAt ? (
                <Badge variant="green">Đã thanh toán {formatDateTime(order.paidAt)}</Badge>
              ) : (
                <Badge variant="warning">Chưa thanh toán</Badge>
              )}
            </div>
          </div>

          {relatedAlert && (
            <div className="panel" style={{ borderColor: "var(--danger)" }}>
              <div className="panel-header">
                <span className="panel-title text-danger">Cảnh báo rủi ro liên quan</span>
              </div>
              <p className="text-sm">{relatedAlert.title}</p>
              <Link href="/admin/risk" className="btn btn-secondary btn-sm mt-2">
                Xem Risk Ops
              </Link>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Trọng tài RELOO - Phân xử tranh chấp"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => resolveDispute("lender")}>
              Nghiêng về chủ đồ
            </button>
            <button type="button" className="btn btn-primary" onClick={() => resolveDispute("renter")}>
              Nghiêng về người thuê
            </button>
          </>
        }
      >
        <p className="text-sm text-muted mb-3">
          Lý do tranh chấp: <strong>{order.disputeReason}</strong>
        </p>
        <div className="input-group">
          <label className="input-label" htmlFor="resolution-note">Ghi chú phán quyết</label>
          <textarea
            id="resolution-note"
            className="textarea"
            rows={4}
            placeholder="Nhập kết luận đối soát Hash Blockchain và quyết định bồi thường..."
            value={disputeResolution}
            onChange={(e) => setDisputeResolution(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
