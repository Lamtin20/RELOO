import { ORDER_STATUS } from './constants';

const EXCLUDED_STATUSES = new Set([
  ORDER_STATUS.PENDING.code,
  ORDER_STATUS.CANCELLED.code,
]);

const STATUS_BY_CODE = Object.fromEntries(
  Object.values(ORDER_STATUS).map((s) => [s.code, s]),
);

/**
 * Lịch sử cho thuê của một listing — từ đơn hàng thực + bổ sung demo nếu auditCount cao hơn.
 */
export function getListingRentalHistory(orders, listingId, passport) {
  const real = (orders ?? [])
    .filter((o) => o.listingId === listingId && !EXCLUDED_STATUSES.has(o.status))
    .map((o) => ({
      id: o.id,
      orderId: o.id,
      startDate: o.startDate,
      endDate: o.endDate,
      days: o.days,
      status: o.status,
      statusLabel: STATUS_BY_CODE[o.status]?.label ?? o.status,
      auditPickupHash: o.auditPickupHash ?? null,
      auditReturnHash: o.auditReturnHash ?? null,
      completedAt: o.completedAt ?? null,
      synthetic: false,
    }))
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  const targetCount = passport?.auditCount ?? real.length;
  const completedReal = real.filter((r) => r.status === ORDER_STATUS.COMPLETED.code).length;
  const missing = Math.max(0, targetCount - completedReal);

  if (missing === 0) return real;

  const oldest = real.length
    ? new Date(real[real.length - 1].startDate)
    : passport?.mintedAt
      ? new Date(passport.mintedAt)
      : new Date();

  const synthetic = [];
  for (let i = 0; i < missing; i += 1) {
    const end = new Date(oldest);
    end.setDate(end.getDate() - (i * 14 + 7));
    const days = 2 + (i % 4);
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    synthetic.push({
      id: `archived-${listingId}-${i}`,
      orderId: null,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days,
      status: ORDER_STATUS.COMPLETED.code,
      statusLabel: ORDER_STATUS.COMPLETED.label,
      auditPickupHash: null,
      auditReturnHash: null,
      completedAt: end.toISOString(),
      synthetic: true,
    });
  }

  return [...real, ...synthetic].sort(
    (a, b) => new Date(b.startDate) - new Date(a.startDate),
  );
}

export function countCompletedRentals(rentalHistory) {
  return (rentalHistory ?? []).filter(
    (r) => r.status === ORDER_STATUS.COMPLETED.code,
  ).length;
}
