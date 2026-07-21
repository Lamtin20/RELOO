"use client";

import Link from "next/link";
import { Shield, ArrowRight, Info, Lock } from "lucide-react";

import { USER_TERMS } from "@/lib/constants";
import { Money } from "@/components/ui";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getUserEscrowHolds } from "@/lib/escrow-holds";

export function EscrowHoldPanel({
  userId,
  orders = [],
  getListingTitle,
  compact = false,
  className = "",
}) {
  const holds = getUserEscrowHolds(userId, orders, getListingTitle);

  if (!holds.hasAny) {
    return (
      <section
        id="escrow"
        className={`escrow-panel escrow-panel--empty ${className}`.trim()}
      >
        <div className="escrow-panel__head">
          <Shield size={20} />
          <div>
            <h2>{USER_TERMS.ESCROW_ACCOUNT}</h2>
            <p className="text-muted text-sm">
              RELOO chưa tạm giữ khoản nào từ bạn. Khi thanh toán đơn thuê, số tiền sẽ
              hiển thị tại đây cho đến khi trả đồ an toàn.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const allItems = [...holds.renter.items, ...holds.lender.items].slice(
    0,
    compact ? 3 : 8,
  );

  return (
    <section id="escrow" className={`escrow-panel ${className}`.trim()}>
      <div className="escrow-panel__head">
        <Shield size={20} />
        <div>
          <h2>{USER_TERMS.ESCROW_ACCOUNT}</h2>
          <p className="text-muted text-sm">
            Số tiền RELOO đang tạm giữ an toàn — minh bạch theo từng đơn hàng
          </p>
        </div>
      </div>

      <div className={`escrow-panel__stats${compact ? " escrow-panel__stats--compact" : ""}`}>
        {holds.renter.total > 0 && (
          <div className="escrow-stat escrow-stat--renter">
            <span className="escrow-stat__label">Bạn đang thuê · tạm giữ</span>
            <Money amount={holds.renter.total} className="escrow-stat__value" />
            {!compact && (
              <div className="escrow-stat__break">
                <span>
                  Tiền cọc: <Money amount={holds.renter.deposit} />
                </span>
                <span>
                  Thuê &amp; phí: <Money amount={holds.renter.rentalAndFees} />
                </span>
              </div>
            )}
            <span className="escrow-stat__meta">{holds.renter.count} đơn đang giữ</span>
          </div>
        )}

        {holds.lender.total > 0 && (
          <div className="escrow-stat escrow-stat--lender">
            <span className="escrow-stat__label">Bạn cho thuê · chờ giải ngân</span>
            <Money amount={holds.lender.total} className="escrow-stat__value" />
            <span className="escrow-stat__meta">
              {holds.lender.count} đơn · giải ngân sau khi hoàn tất
            </span>
          </div>
        )}
      </div>

      <div className="dashboard-notice escrow-panel__notice">
        <Info size={16} />
        <span>
          Tiền cọc và phí thuê được giữ tại <strong>{USER_TERMS.ESCROW_ACCOUNT} RELOO</strong> cho
          đến khi trả đồ và đối chiếu bằng chứng xong. Cọc được hoàn theo quy trình kiểm
          tra tình trạng.
        </span>
      </div>

      {allItems.length > 0 && (
        <div className="escrow-panel__list">
          <div className="escrow-panel__list-head">
            <h3>Chi tiết theo đơn</h3>
            {!compact && (
              <Link href="/dashboard/orders" className="text-sm text-green font-semibold">
                Xem tất cả đơn
              </Link>
            )}
          </div>
          {allItems.map((item) => (
            <Link
              key={`${item.role}-${item.orderId}`}
              href={`/dashboard/orders/${item.orderId}`}
              className="escrow-row"
            >
              <span className="escrow-row__icon" aria-hidden="true">
                <Lock size={18} strokeWidth={2} />
              </span>
              <div className="escrow-row__body">
                <span className="escrow-row__title">{item.title}</span>
                <p className="escrow-row__sub">
                  <span>{item.role === "renter" ? "Người thuê" : "Chủ đồ"}</span>
                  <span className="escrow-row__dot" aria-hidden="true">
                    ·
                  </span>
                  <span className="escrow-row__id">{item.orderId}</span>
                </p>
                <StatusBadge status={item.status} className="escrow-row__badge" />
              </div>
              <span className="escrow-row__aside">
                <Money amount={item.total} className="escrow-row__amount" />
                <ArrowRight size={16} className="escrow-row__arrow" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}

      {compact && (
        <Link href="/dashboard/wallet#escrow" className="escrow-panel__more btn btn-ghost btn-sm">
          Xem chi tiết ký quỹ <ArrowRight size={14} />
        </Link>
      )}
    </section>
  );
}
