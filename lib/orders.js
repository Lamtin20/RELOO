/** Trạng thái cho phép người thuê tự hủy (chủ đồ chưa xác nhận / chưa gửi hàng) */
const RENTER_CANCELABLE = new Set(["paid"]);

export function canRenterCancelOrder(order) {
  if (!order) return false;
  return RENTER_CANCELABLE.has(order.status);
}

export function canLenderCancelOrder(order) {
  if (!order) return false;
  return order.status === "pending" || order.status === "paid";
}
