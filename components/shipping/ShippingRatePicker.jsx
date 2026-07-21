"use client";

import { Loader2, Truck } from "lucide-react";
import { formatVND } from "@/lib/utils";

/**
 * Chọn biểu phí vận chuyển từ Goship
 */
export function ShippingRatePicker({
  rates = [],
  selectedId,
  onSelect,
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <div className="shipping-rate-picker shipping-rate-picker--loading">
        <Loader2 size={18} className="spin" />
        <span>Đang tra cước phí vận chuyển qua Goship…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shipping-rate-picker shipping-rate-picker--error" role="alert">
        <Truck size={18} />
        <span>{error}</span>
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="shipping-rate-picker shipping-rate-picker--empty text-muted text-sm">
        Hoàn tất địa chỉ lấy hàng và giao hàng để xem phí vận chuyển.
      </div>
    );
  }

  return (
    <div className="shipping-rate-picker">
      <div className="shipping-rate-picker__title">Chọn đơn vị vận chuyển</div>
      <ul className="shipping-rate-list">
        {rates.map((rate) => {
          const fee = Number(rate.total_fee ?? rate.total_amount ?? 0);
          const active = selectedId === rate.id;
          return (
            <li key={rate.id}>
              <button
                type="button"
                className={`shipping-rate-item ${active ? "shipping-rate-item--active" : ""}`}
                onClick={() => onSelect?.(rate)}
              >
                {rate.carrier_logo && (
                  <img src={rate.carrier_logo} alt="" className="shipping-rate-item__logo" />
                )}
                <div className="shipping-rate-item__body">
                  <strong>{rate.carrier_name}</strong>
                  <span>{rate.service}</span>
                  <span className="shipping-rate-item__eta">{rate.expected}</span>
                </div>
                <div className="shipping-rate-item__fee">{formatVND(fee)}</div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
