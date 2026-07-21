"use client";

import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Leaf,
  ShieldCheck,
  Truck,
  UserCheck,
  Bell,
} from "lucide-react";
import { DELIVERY_MODE, ORDER_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const STATUS_LABEL = Object.fromEntries(
  Object.values(ORDER_STATUS).map((s) => [s.code, s.label]),
);

const RENT_STEPS = [
  { icon: CalendarCheck, label: "Chọn ngày thuê", desc: "Lịch linh hoạt theo nhu cầu" },
  { icon: ShieldCheck, label: "Thanh toán ký quỹ", desc: "PayOS · tài khoản ký quỹ RELOO" },
  { icon: Leaf, label: "Green Audit", desc: "Kiểm tra tình trạng minh bạch" },
  { icon: CheckCircle2, label: "Nhận & trả đồ", desc: "Chronicle ghi nhận bất biến" },
];

/**
 * Nội dung bổ sung sidebar trang sản phẩm — chỉ hiển thị desktop (≥901px)
 * Biểu đồ uy tín / eKYC: chỉ hiển thị tại /dashboard/kyc (TrustProfile)
 */
export function ProductSidebarDesktopExtras({
  listing,
  availability,
  waitlistCount = 0,
  isRented,
}) {
  if (!listing) return null;

  const { availableDate, activeOrder, currentRenterEndDate } = availability ?? {};

  return (
    <div className="product-sidebar-desktop-extras" aria-label="Thông tin thuê bổ sung">
      <section className="product-sidebar-extra-card">
        <h3 className="product-sidebar-extra-card__title">
          {isRented ? <CalendarClock size={16} /> : <CalendarCheck size={16} />}
          Lịch cho thuê
        </h3>
        {isRented ? (
          <div className="product-sidebar-extra-card__body">
            <p className="product-sidebar-extra-card__status product-sidebar-extra-card__status--rented">
              Đang được cho thuê
            </p>
            {activeOrder && (
              <p className="text-sm text-muted">
                Đơn hiện tại: {STATUS_LABEL[activeOrder.status] ?? activeOrder.status}
                {currentRenterEndDate && (
                  <> · Trả dự kiến {formatDate(currentRenterEndDate)}</>
                )}
              </p>
            )}
            {availableDate && (
              <p className="text-sm mt-1">
                Dự kiến trống từ <strong>{formatDate(availableDate)}</strong>
              </p>
            )}
            {waitlistCount > 0 && (
              <p className="product-sidebar-extra-card__hint">
                <Bell size={12} /> {waitlistCount} lệnh chờ đang xếp hàng
              </p>
            )}
          </div>
        ) : (
          <div className="product-sidebar-extra-card__body">
            <p className="product-sidebar-extra-card__status product-sidebar-extra-card__status--ready">
              Sẵn sàng cho thuê
            </p>
            <p className="text-sm text-muted">Chọn ngày nhận và trả đồ khi bấm Thuê ngay.</p>
          </div>
        )}
      </section>

      <section className="product-sidebar-extra-card">
        <h3 className="product-sidebar-extra-card__title">
          <Truck size={16} /> Giao nhận & mốc thuê
        </h3>
        <ul className="product-sidebar-extra-card__list">
          <li>
            <UserCheck size={14} className="text-muted" />
            <span>
              <strong>{DELIVERY_MODE.LENDER.label}</strong>
              <br />
              <span className="text-muted text-xs">{DELIVERY_MODE.LENDER.description}</span>
            </span>
          </li>
          <li>
            <Truck size={14} className="text-muted" />
            <span>
              <strong>{DELIVERY_MODE.SHIPPER.label}</strong>
              <br />
              <span className="text-muted text-xs">{DELIVERY_MODE.SHIPPER.description}</span>
            </span>
          </li>
        </ul>
      </section>

      <section className="product-sidebar-extra-card">
        <h3 className="product-sidebar-extra-card__title">Quy trình thuê RELOO</h3>
        <ol className="product-sidebar-extra-card__steps">
          {RENT_STEPS.map(({ icon: Icon, label, desc }) => (
            <li key={label}>
              <span className="product-sidebar-extra-card__step-icon">
                <Icon size={14} />
              </span>
              <span>
                <strong>{label}</strong>
                <span className="text-xs text-muted">{desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
