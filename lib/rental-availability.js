import {
  DELIVERY_MODE,
  ORDER_STATUS,
  RENTAL_RETURN_BUFFER_DAYS,
  RENTAL_START_RULE,
} from './constants';

/** Đơn đang chiếm slot cho thuê */
const ACTIVE_ORDER_STATUSES = new Set([
  ORDER_STATUS.PAID.code,
  ORDER_STATUS.AUDIT_PICKUP.code,
  ORDER_STATUS.SHIPPING.code,
  ORDER_STATUS.IN_USE.code,
  ORDER_STATUS.AUDIT_RETURN.code,
  ORDER_STATUS.OVERDUE.code,
  ORDER_STATUS.DISPUTED.code,
]);

export function getActiveListingOrder(orders, listingId) {
  return (orders ?? []).find(
    (o) => o.listingId === listingId && ACTIVE_ORDER_STATUSES.has(o.status),
  );
}

export function isListingCurrentlyRented(listing, orders) {
  if (!listing) return false;
  if (listing.status === 'rented') return true;
  return Boolean(getActiveListingOrder(orders, listing.id));
}

/**
 * Dự kiến ngày sản phẩm trống để cho thuê tiếp (sau trả đồ + buffer)
 */
export function estimateListingAvailableDate(order, bufferDays = RENTAL_RETURN_BUFFER_DAYS) {
  if (!order?.endDate) return null;
  const d = startOfDay(new Date(order.endDate));
  d.setDate(d.getDate() + bufferDays);
  return d;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Parse số ngày vận chuyển từ biểu phí Goship (expected: "2-3 ngày") */
export function parseTransitDaysFromRate(rate, fallback = 2) {
  const text = String(rate?.expected ?? rate?.estimated ?? rate?.delivery_time ?? '');
  const range = text.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    return Math.max(parseInt(range[1], 10), parseInt(range[2], 10));
  }
  const single = text.match(/(\d+)/);
  if (single) return parseInt(single[1], 10);
  return fallback;
}

export function getRentalStartRule(deliveryMode) {
  return deliveryMode === DELIVERY_MODE.LENDER.code
    ? RENTAL_START_RULE.ON_LENDER_CONFIRM
    : RENTAL_START_RULE.ON_RECEIVE;
}

/**
 * Ngày bắt đầu tính thuê dự kiến
 * - Shipper: ngày người thuê chọn nhận hàng (= ngày nhận thực tế)
 * - Chủ đồ giao: khi xác nhận giao — dùng ngày chọn làm mốc tham chiếu
 */
export function estimateRentalStartDate({
  deliveryMode,
  desiredStartDate,
  transitDays = 0,
  confirmedAt = null,
}) {
  if (deliveryMode === DELIVERY_MODE.LENDER.code) {
    if (confirmedAt) return startOfDay(new Date(confirmedAt));
    return desiredStartDate ? startOfDay(new Date(desiredStartDate)) : null;
  }

  if (!desiredStartDate) return null;
  return startOfDay(new Date(desiredStartDate));
}

/** Ngày cần gửi hàng để kịp nhận đúng mốc (shipper) */
export function estimateShipByDate(desiredReceiveDate, transitDays) {
  if (!desiredReceiveDate || !transitDays) return null;
  return addDays(startOfDay(new Date(desiredReceiveDate)), -transitDays);
}

export function buildListingAvailability(listing, orders) {
  const activeOrder = getActiveListingOrder(orders, listing?.id);
  const rented = isListingCurrentlyRented(listing, orders);
  const availableDate = activeOrder ? estimateListingAvailableDate(activeOrder) : null;

  return {
    rented,
    activeOrder,
    availableDate,
    currentRenterEndDate: activeOrder?.endDate ? new Date(activeOrder.endDate) : null,
    orderStatus: activeOrder?.status ?? null,
  };
}

export function getWaitlistForListing(waitlists, listingId) {
  return (waitlists ?? []).filter(
    (w) => w.listingId === listingId && w.status === 'waiting',
  );
}

export function userHasWaitlist(waitlists, listingId, userId) {
  if (!userId) return false;
  return (waitlists ?? []).some(
    (w) =>
      w.listingId === listingId &&
      w.renterId === userId &&
      w.status === 'waiting',
  );
}
