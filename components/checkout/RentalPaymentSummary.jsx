"use client";

import { Info, ShieldCheck } from "lucide-react";
import { Money } from "@/components/ui";
import { formatVND } from "@/lib/utils";

/**
 * Tóm tắt chi phí thuê — tiền thuê, cọc, tổng thanh toán
 */
export function RentalPaymentSummary({
  days = 0,
  dailyPrice = 0,
  rentalTotal = 0,
  rentalSubtotal = 0,
  rentalDiscount = 0,
  discountRate = 0,
  deposit = 0,
  relooCareFee = 0,
  relooCareLabel = "",
  shippingFee = 0,
  grandTotal = 0,
  showShipping = true,
  showCare = true,
  compact = false,
}) {
  if (!days || !dailyPrice) {
    return (
      <div className={`rental-payment-summary rental-payment-summary--empty ${compact ? "rental-payment-summary--compact" : ""}`}>
        <p className="rental-payment-summary__hint">Chọn ngày thuê để xem tổng tiền và tiền cọc.</p>
      </div>
    );
  }

  return (
    <div className={`rental-payment-summary ${compact ? "rental-payment-summary--compact" : ""}`}>
      <div className="rental-payment-summary__title">Chi phí dự kiến</div>

      <div className="rental-payment-summary__rows">
        {rentalDiscount > 0 ? (
          <>
            <div className="rental-payment-summary__row rental-payment-summary__row--muted">
              <span>
                Giá gốc ({days} ngày × {formatVND(dailyPrice)})
              </span>
              <span>{formatVND(rentalSubtotal)}</span>
            </div>
            <div className="rental-payment-summary__row rental-payment-summary__row--discount">
              <span>Giảm giá thuê dài hạn ({Math.round(discountRate * 100)}%)</span>
              <span>-{formatVND(rentalDiscount)}</span>
            </div>
          </>
        ) : null}

        <div className="rental-payment-summary__row rental-payment-summary__row--subtotal">
          <span>Tổng tiền thuê</span>
          <strong>{formatVND(rentalTotal)}</strong>
        </div>

        {showCare && relooCareFee > 0 && (
          <div className="rental-payment-summary__row">
            <span>{relooCareLabel || "Gói An Tâm Reloo Care"}</span>
            <span>{formatVND(relooCareFee)}</span>
          </div>
        )}

        {showShipping && shippingFee > 0 && (
          <div className="rental-payment-summary__row rental-payment-summary__row--muted">
            <span>Phí vận chuyển (Goship)</span>
            <span>{formatVND(shippingFee)}</span>
          </div>
        )}

        <div className="rental-payment-summary__row rental-payment-summary__row--deposit">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} /> Tiền cọc
          </span>
          <strong>{deposit === 0 ? "Miễn cọc" : formatVND(deposit)}</strong>
        </div>
      </div>

      <div className="rental-payment-summary__divider" />

      <div className="rental-payment-summary__total">
        <span>Tổng thanh toán</span>
        <Money amount={grandTotal} />
      </div>

      <p className="rental-payment-summary__note">
        <Info size={13} />
        Tiền cọc được giữ trong tài khoản ký quỹ và hoàn lại sau khi trả đồ & Green Audit.
      </p>
    </div>
  );
}
