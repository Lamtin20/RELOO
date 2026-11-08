export const SOURCE_LABELS = {
  ALL: "Tất cả nguồn",
  BANK: "Ngân hàng",
  RENTAL: "Cho thuê",
  DEPOSIT: "Tiền cọc",
  REFUND: "Tiền hoàn giao dịch",
  SHOPEE: "Shopee",
  TIKTOK: "TikTok Shop",
};
export const SOURCE_TITLES = {
  BANK: "Giao dịch ngân hàng",
  RENTAL: "Thu nhập cho thuê",
  DEPOSIT: "Tiền cọc / ký quỹ",
  REFUND: "Tiền hoàn giao dịch thuê",
  SHOPEE: "Hoàn tiền Shopee",
  TIKTOK: "Hoàn tiền TikTok Shop",
};
export const STATUS_LABELS = {
  RECONCILED: "Đã đối soát",
  PENDING: "Chờ xác nhận",
  APPROVED: "Đã xác nhận",
  REJECTED: "Không được duyệt",
  REQUESTED: "Chờ duyệt",
  PROCESSING: "Đang chuyển",
  PAID: "Đã chuyển",
  CANCELLED: "Đã hủy",
};
export function formatMoney(value) {
  if (value === null || value === undefined) return "Chờ xác nhận";
  return new Intl.NumberFormat("vi-VN").format(BigInt(value)) + " ₫";
}
export function walletDate(value) {
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
