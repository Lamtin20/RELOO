/**
 * Lưu tạm sự kiện webhook Goship phía server (demo — đồng bộ qua API tracking)
 * order_id trong webhook = mã đơn RELOO (RL-...)
 */

const trackingByOrderId = new Map();

function normalizeEvent(payload) {
  const orderId = payload.order_id ?? payload.orderId;
  if (!orderId) return null;

  return {
    orderId,
    gcode: payload.gcode ?? null,
    carrierCode: payload.code ?? null,
    status: String(payload.status ?? ""),
    statusText: payload.status_text ?? payload.statusText ?? "",
    message: payload.message ?? "",
    description: payload.description ?? "",
    trackingUrl: payload.tracking_url ?? payload.trackingUrl ?? null,
    carrierShortName: payload.carrier_short_name ?? payload.carrierShortName ?? null,
    updateTime: payload.update_time ?? payload.updateTime ?? null,
    receivedAt: new Date().toISOString(),
  };
}

export function appendGoshipTrackingEvent(payload) {
  const event = normalizeEvent(payload);
  if (!event) return null;

  const list = trackingByOrderId.get(event.orderId) ?? [];
  const exists = list.some(
    (e) =>
      e.status === event.status &&
      e.updateTime === event.updateTime &&
      e.message === event.message,
  );
  if (!exists) {
    list.unshift(event);
    trackingByOrderId.set(event.orderId, list.slice(0, 50));
  }

  return event;
}

export function getGoshipTrackingEvents(orderId) {
  return trackingByOrderId.get(orderId) ?? [];
}

export function getLatestGoshipTracking(orderId) {
  const list = getGoshipTrackingEvents(orderId);
  return list[0] ?? null;
}

/** Khởi tạo dữ liệu mẫu cho demo */
export function seedGoshipTracking(orderId, events = []) {
  if (!orderId || !events.length) return;
  trackingByOrderId.set(
    orderId,
    events.map((e) => ({ ...e, receivedAt: e.receivedAt ?? new Date().toISOString() })),
  );
}
