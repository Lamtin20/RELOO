"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, X } from "lucide-react";
import {locationLabel} from '@/lib/location-label';
import { LocationPicker } from "./LocationPicker";
import { useReloo } from "@/lib/store";
import { useGeolocation } from "@/lib/hooks/useGeolocation";

/**
 * LocationChip - chip nhỏ hiển thị vị trí hiện tại,
 * bấm sẽ mở modal cho phép chọn tỉnh/phường.
 * Đồng bộ với store (state.guestLocation).
 * autoRequest: lần đầu vào app sẽ tự đề nghị định vị GPS.
 */
export function LocationChip({ compact = false, autoRequest = false }) {
  const { state, actions } = useReloo();
  const location = state.guestLocation;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(location || null);
  const panelRef = useRef(null);
  const geo = useGeolocation();

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...(panelRef.current?.querySelectorAll(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
        ) || []),
      ].filter((element) => element.getClientRects().length);
    focusable()[0]?.focus();
    function keyboard(event) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const elements = focusable(),
        first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      previousFocus?.focus();
    };
  }, [open]);

  // Auto request location on first visit if user hasn't picked.
  useEffect(() => {
    if (!autoRequest) return;
    if (location?.province) return;
    let cancelled = false;
    (async () => {
      const nearest = await geo.request();
      if (!cancelled && nearest) {
        actions.setGuestLocation({ province: nearest, ward: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoRequest, location?.province, geo, actions]);

  function commit() {
    if (pending?.province) {
      actions.setGuestLocation(pending);
    }
    setOpen(false);
  }

  const label = location?.province?.name
    ? locationLabel([location.ward?.name,location.province.name].filter(Boolean).join(', '))
    : "Ch\u1ecdn khu v\u1ef1c";

  return (
    <>
      <button
        type="button"
        className={`location-chip ${compact ? "location-chip--compact" : ""}`}
        onClick={() => {
          setPending(location || null);
          setOpen(true);
        }}
        aria-label="Chọn khu vực"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MapPin size={14} />
        <span className="location-chip__text">{label}</span>
      </button>

      {open &&
        createPortal(
          <div
            className="location-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Khu vực của bạn"
          >
            <div
              className="location-modal__backdrop"
              onClick={() => setOpen(false)}
            />
            <div className="location-modal__panel" ref={panelRef}>
              <div className="location-modal__head">
                <div>
                  <h3>Khu vực của bạn</h3>
                  <p className="text-muted">
                    Chọn tỉnh và phường/xã để xem sản phẩm gần bạn.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="location-modal__body">
                <LocationPicker
                  value={pending || {}}
                  onChange={setPending}
                  autoGeo
                  label={null}
                />
              </div>

              <div className="location-modal__foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={commit}
                  disabled={!pending?.province}
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
