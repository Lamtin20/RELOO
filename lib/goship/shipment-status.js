/** Nhãn trạng thái vận đơn Goship (webhook status) */
export const GOSHIP_SHIPMENT_STATUS = {
  "901": { label: "Chờ lấy hàng", phase: "pickup" },
  "902": { label: "Đang lấy hàng", phase: "pickup" },
  "903": { label: "Đã lấy hàng", phase: "transit" },
  "904": { label: "Đang vận chuyển", phase: "transit" },
  "905": { label: "Đang giao hàng", phase: "delivery" },
  "906": { label: "Giao thành công", phase: "done" },
  "907": { label: "Giao thất bại", phase: "issue" },
  "908": { label: "Hoàn hàng", phase: "return" },
  "909": { label: "Hủy vận đơn", phase: "cancelled" },
};

export function goshipStatusMeta(status) {
  const key = String(status ?? "");
  return (
    GOSHIP_SHIPMENT_STATUS[key] ?? {
      label: "Đang cập nhật",
      phase: "transit",
    }
  );
}

export function formatGoshipUpdateTime(unixSeconds) {
  if (!unixSeconds) return "";
  const ms = Number(unixSeconds) * 1000;
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
