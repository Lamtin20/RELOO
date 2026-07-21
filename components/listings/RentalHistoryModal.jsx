"use client";

import { CalendarDays, CheckCircle2, Clock, Hash } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatDate, shortHash } from "@/lib/utils";
import { ORDER_STATUS } from "@/lib/constants";

export function RentalHistoryModal({ open, onClose, listingTitle, rentalHistory = [] }) {
  const completedCount = rentalHistory.filter(
    (r) => r.status === ORDER_STATUS.COMPLETED.code,
  ).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lịch sử cho thuê"
      size="lg"
    >
      <p className="rental-history-modal__intro">
        {listingTitle ? (
          <>
            <strong>{listingTitle}</strong> — đã hoàn tất{" "}
            <strong>{completedCount}</strong> lần cho thuê trên RELOO.
          </>
        ) : (
          <>Tổng cộng <strong>{completedCount}</strong> lần cho thuê đã hoàn tất.</>
        )}
      </p>

      {rentalHistory.length === 0 ? (
        <p className="text-muted text-sm">Chưa có lượt thuê nào.</p>
      ) : (
        <ul className="rental-history-list">
          {rentalHistory.map((rental, index) => (
            <li key={rental.id} className="rental-history-item">
              <div className="rental-history-item__head">
                <span className="rental-history-item__index">
                  Lần {rentalHistory.length - index}
                </span>
                <Badge
                  variant={
                    rental.status === ORDER_STATUS.COMPLETED.code
                      ? "green"
                      : rental.status === ORDER_STATUS.IN_USE.code ||
                          rental.status === ORDER_STATUS.SHIPPING.code
                        ? "blue"
                        : "muted"
                  }
                >
                  {rental.statusLabel}
                </Badge>
              </div>

              <div className="rental-history-item__dates">
                <CalendarDays size={14} />
                <span>
                  {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
                </span>
                <strong>{rental.days} ngày</strong>
              </div>

              {rental.orderId && (
                <div className="rental-history-item__meta">
                  <Clock size={13} />
                  <span>Mã đơn: {rental.orderId}</span>
                </div>
              )}

              {(rental.auditPickupHash || rental.auditReturnHash) && (
                <div className="rental-history-item__audit">
                  <CheckCircle2 size={13} className="text-green" />
                  <span>Green Audit</span>
                  {rental.auditPickupHash && (
                    <span className="rental-history-item__hash">
                      <Hash size={11} /> Giao: {shortHash(rental.auditPickupHash, 6, 4)}
                    </span>
                  )}
                  {rental.auditReturnHash && (
                    <span className="rental-history-item__hash">
                      <Hash size={11} /> Trả: {shortHash(rental.auditReturnHash, 6, 4)}
                    </span>
                  )}
                </div>
              )}

              {rental.synthetic && (
                <p className="rental-history-item__archived text-xs text-muted">
                  Lượt thuê trước khi ghi nhận đơn chi tiết trên hệ thống.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
