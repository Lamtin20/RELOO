"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MapPin, Package, Truck } from "lucide-react";
import { formatGoshipUpdateTime, goshipStatusMeta } from "@/lib/goship/shipment-status";

/**
 * Hiển thị tiến trình vận chuyển Goship (webhook)
 */
export function GoshipTrackingPanel({ orderId, orderStatus, fallbackTrackingNumber }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    if (!orderId || orderStatus !== "shipping") {
      setLoading(false);
      return;
    }

    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/goship/tracking/${encodeURIComponent(orderId)}`);
        const json = await res.json();
        if (!alive) return;
        if (!json.ok) throw new Error(json.error || "Không tải được tracking");
        setTracking(json.data);
      } catch (err) {
        if (alive) setError(err.message || "Lỗi tracking Goship");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [orderId, orderStatus]);

  if (orderStatus !== "shipping") return null;

  const latest = tracking?.latest;
  const events = tracking?.events ?? [];
  const meta = goshipStatusMeta(latest?.status);

  return (
    <div className="goship-tracking panel mt-6">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-blue" />
          <h2 className="panel-title">Theo dõi vận chuyển Goship</h2>
        </div>
      </div>

      {loading && !latest && (
        <p className="text-sm text-muted flex items-center gap-2">
          <Loader2 size={14} className="spin" /> Đang đồng bộ trạng thái từ Goship…
        </p>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {latest && (
        <div className={`goship-tracking__current goship-tracking__current--${meta.phase}`}>
          <div className="goship-tracking__status-row">
            <Package size={18} />
            <div>
              <strong>{latest.statusText || meta.label}</strong>
              <p className="text-sm text-muted mt-1">
                {latest.description || latest.message || "Đang cập nhật vị trí đơn hàng"}
              </p>
            </div>
          </div>
          <div className="goship-tracking__meta text-xs text-muted">
            {latest.carrierShortName && (
              <span>HVC: {String(latest.carrierShortName).toUpperCase()}</span>
            )}
            {latest.carrierCode && <span>Mã vận đơn: {latest.carrierCode}</span>}
            {latest.gcode && <span>Goship: {latest.gcode}</span>}
            {latest.updateTime && (
              <span>Cập nhật: {formatGoshipUpdateTime(latest.updateTime)}</span>
            )}
          </div>
          {latest.trackingUrl && (
            <a
              href={latest.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm mt-3"
            >
              <ExternalLink size={14} /> Xem trên hãng vận chuyển
            </a>
          )}
        </div>
      )}

      {!latest && fallbackTrackingNumber && (
        <div className="goship-tracking__fallback text-sm">
          <MapPin size={14} /> Mã vận đơn: <strong>{fallbackTrackingNumber}</strong>
        </div>
      )}

      {events.length > 0 && (
        <ol className="goship-tracking__timeline">
          {events.map((evt, idx) => {
            const evtMeta = goshipStatusMeta(evt.status);
            return (
              <li
                key={`${evt.status}-${evt.updateTime}-${idx}`}
                className={`goship-tracking__event ${idx === 0 ? "goship-tracking__event--latest" : ""}`}
              >
                <div className="goship-tracking__dot" data-phase={evtMeta.phase} />
                <div>
                  <strong>{evt.statusText || evtMeta.label}</strong>
                  <p className="text-sm text-muted">
                    {evt.message || evt.description || "—"}
                  </p>
                  {evt.updateTime && (
                    <span className="text-xs text-muted">
                      {formatGoshipUpdateTime(evt.updateTime)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-xs text-muted mt-4">
        Dữ liệu cập nhật tự động qua webhook Goship.{" "}
        <Link href="https://doc.goship.io/api/shipment/webhooks" target="_blank" rel="noopener">
          Tài liệu webhook
        </Link>
      </p>
    </div>
  );
}
