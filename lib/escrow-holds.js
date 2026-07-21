/** Trạng thái đơn mà tiền đã thanh toán và đang tạm giữ tại ký quỹ */
export const HELD_ESCROW_STATUSES = [
  "paid",
  "audit_pickup",
  "shipping",
  "in_use",
  "audit_return",
  "overdue",
  "disputed",
  "risk",
];

export function isOrderEscrowHeld(order) {
  if (!order?.paidAt) return false;
  return HELD_ESCROW_STATUSES.includes(order.status);
}

export function getLenderPayout(order) {
  return Math.max(0, (order.rentalTotal ?? 0) - (order.platformFee ?? 0));
}

function mapRenterItem(order, getListingTitle) {
  const deposit = order.deposit ?? 0;
  const grandTotal = order.grandTotal ?? 0;
  return {
    orderId: order.id,
    title: getListingTitle?.(order) ?? order.listingId,
    status: order.status,
    role: "renter",
    deposit,
    rentalAndFees: Math.max(0, grandTotal - deposit),
    total: grandTotal,
  };
}

function mapLenderItem(order, getListingTitle) {
  return {
    orderId: order.id,
    title: getListingTitle?.(order) ?? order.listingId,
    status: order.status,
    role: "lender",
    deposit: 0,
    rentalAndFees: getLenderPayout(order),
    total: getLenderPayout(order),
  };
}

/**
 * Tổng hợp số tiền RELOO đang tạm giữ / chờ giải ngân theo vai trò người dùng.
 */
export function getUserEscrowHolds(userId, orders = [], getListingTitle) {
  const held = orders.filter(
    (o) =>
      isOrderEscrowHeld(o) &&
      (o.renterId === userId || o.lenderId === userId),
  );

  const renterOrders = held.filter((o) => o.renterId === userId);
  const lenderOrders = held.filter((o) => o.lenderId === userId);

  const renterItems = renterOrders.map((o) => mapRenterItem(o, getListingTitle));
  const lenderItems = lenderOrders.map((o) => mapLenderItem(o, getListingTitle));

  const renterDeposit = renterItems.reduce((s, i) => s + i.deposit, 0);
  const renterRental = renterItems.reduce((s, i) => s + i.rentalAndFees, 0);
  const renterTotal = renterItems.reduce((s, i) => s + i.total, 0);

  const lenderTotal = lenderItems.reduce((s, i) => s + i.total, 0);

  return {
    renter: {
      total: renterTotal,
      deposit: renterDeposit,
      rentalAndFees: renterRental,
      count: renterItems.length,
      items: renterItems,
    },
    lender: {
      total: lenderTotal,
      count: lenderItems.length,
      items: lenderItems,
    },
    hasAny: renterTotal > 0 || lenderTotal > 0,
  };
}
