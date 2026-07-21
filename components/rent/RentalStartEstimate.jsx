"use client";

import { Clock, Info, Truck, UserCheck } from "lucide-react";
import { DELIVERY_MODE } from "@/lib/constants";
import {
  estimateRentalStartDate,
  estimateShipByDate,
} from "@/lib/rental-availability";
import { formatDate } from "@/lib/utils";

/**
 * Giải thích mốc bắt đầu tính thời gian thuê theo hình thức giao
 */
export function RentalStartEstimate({
  deliveryMode,
  desiredStartDate,
  transitDays = 0,
}) {
  if (!desiredStartDate) return null;

  const isLender = deliveryMode === DELIVERY_MODE.LENDER.code;
  const rentalStart = estimateRentalStartDate({
    deliveryMode,
    desiredStartDate,
    transitDays,
  });
  const shipBy = !isLender ? estimateShipByDate(desiredStartDate, transitDays) : null;

  return (
    <div className="rental-start-estimate panel-inset">
      <div className="rental-start-estimate__head">
        {isLender ? <UserCheck size={16} /> : <Truck size={16} />}
        <strong>Mốc bắt đầu tính thuê</strong>
      </div>

      {isLender ? (
        <p className="rental-start-estimate__text">
          <strong>Chủ đồ tự giao:</strong> thời gian thuê bắt đầu khi chủ đồ{" "}
          <strong>xác nhận giao hàng thành công</strong> — có thể lệch so với ngày bạn chọn (
          {formatDate(desiredStartDate)} là mốc tham chiếu).
        </p>
      ) : (
        <>
          <p className="rental-start-estimate__text">
            <strong>Shipper Goship:</strong> thời gian thuê bắt đầu tính từ khi bạn{" "}
            <strong>nhận được hàng</strong> (dự kiến {formatDate(rentalStart)}).
          </p>
          {transitDays > 0 && shipBy && (
            <p className="rental-start-estimate__meta">
              <Clock size={13} /> Vận chuyển ~{transitDays} ngày · Cần gửi hàng trước{" "}
              <strong>{formatDate(shipBy)}</strong> để kịp nhận đúng ngày
            </p>
          )}
        </>
      )}

      <p className="rental-start-estimate__note">
        <Info size={12} />
        Rule Engine RELOO ghi nhận mốc thực tế trên đơn hàng (Chronicle) khi xác nhận nhận hàng.
      </p>
    </div>
  );
}
