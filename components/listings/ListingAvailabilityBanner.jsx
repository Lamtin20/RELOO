"use client";

import Link from "next/link";
import { Bell, CalendarClock } from "lucide-react";
import { ORDER_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const STATUS_LABEL = Object.fromEntries(
  Object.values(ORDER_STATUS).map((s) => [s.code, s.label]),
);

/**
 * Banner trên trang sản phẩm khi đang được cho thuê
 */
export function ListingAvailabilityBanner({ listing, availability, waitlistCount = 0 }) {
  if (!availability?.rented) return null;

  const { availableDate, activeOrder, currentRenterEndDate } = availability;

  return (
    <div className="listing-availability-banner" role="status">
      <div className="listing-availability-banner__icon">
        <CalendarClock size={20} />
      </div>
      <div className="listing-availability-banner__body">
        <strong>Đang được cho thuê</strong>
        <p>
          {activeOrder && (
            <>
              Trạng thái đơn: {STATUS_LABEL[activeOrder.status] ?? activeOrder.status}
              {currentRenterEndDate && (
                <>
                  {" "}
                  · Trả dự kiến {formatDate(currentRenterEndDate)}
                </>
              )}
              <br />
            </>
          )}
          {availableDate ? (
            <>
              Dự kiến có thể thuê tiếp từ{" "}
              <strong>{formatDate(availableDate)}</strong> (đã cộng buffer trả đồ & kiểm tra).
            </>
          ) : (
            <>Thời gian trống sẽ được cập nhật khi đơn hiện tại kết thúc.</>
          )}
        </p>
        {waitlistCount > 0 && (
          <p className="listing-availability-banner__queue">
            <Bell size={13} /> {waitlistCount} lệnh chờ đang xếp hàng
          </p>
        )}
      </div>
      <Link href={`/rent/${listing.id}?mode=waitlist`} className="btn btn-secondary btn-sm">
        Đặt lệnh chờ
      </Link>
    </div>
  );
}
