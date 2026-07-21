"use client";

import { useState } from "react";
import { Bell, BellOff, CalendarDays, Loader2 } from "lucide-react";
import { DELIVERY_MODE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { DateRangeCalendar } from "@/components/booking/DateRangeCalendar";

/**
 * Đặt lệnh chờ khi sản phẩm đang được cho thuê
 */
export function RentWaitlistForm({
  listing,
  availability,
  user,
  existingWaitlist,
  waitlistCount = 0,
  onSubmit,
  onCancel,
  compact = false,
}) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState(DELIVERY_MODE.SHIPPER.code);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const minDate = availability?.availableDate ?? new Date();

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Vui lòng đăng nhập để đặt lệnh chờ.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Chọn khoảng thời gian bạn muốn thuê.");
      return;
    }
    if (startDate < minDate) {
      setError(
        `Ngày bắt đầu phải từ ${formatDate(minDate)} trở đi (dự kiến sản phẩm trống).`,
      );
      return;
    }

    setSubmitting(true);
    try {
      onSubmit?.({
        requestedStartDate: startDate.toISOString(),
        requestedEndDate: endDate.toISOString(),
        deliveryMode,
        notes: notes.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Không thể đặt lệnh chờ.");
    } finally {
      setSubmitting(false);
    }
  }

  if (existingWaitlist && !done) {
    return (
      <div className={`rent-waitlist panel ${compact ? "rent-waitlist--compact" : ""}`.trim()}>
        <div className="rent-waitlist__active">
          <Bell size={20} className="text-green" />
          <div>
            <strong>Bạn đã đặt lệnh chờ</strong>
            <p className="text-sm text-muted mt-1">
              {formatDate(existingWaitlist.requestedStartDate)} →{" "}
              {formatDate(existingWaitlist.requestedEndDate)}
            </p>
            <p className="text-xs text-muted mt-1">
              Hệ thống sẽ ưu tiên thông báo khi sản phẩm trống (Rule Engine).
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm w-full"
          onClick={() => onCancel?.(existingWaitlist.id)}
        >
          <BellOff size={14} /> Hủy lệnh chờ
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div
        className={`rent-waitlist panel rent-waitlist--success ${compact ? "rent-waitlist--compact" : ""}`.trim()}
      >
        <Bell size={22} className="text-green" />
        <strong>Đã ghi nhận lệnh chờ</strong>
        <p className="text-sm text-muted">
          RELOO sẽ thông báo khi <strong>{listing?.title}</strong> sẵn sàng cho thuê trong khoảng
          thời gian bạn chọn.
        </p>
      </div>
    );
  }

  return (
    <form
      className={`rent-waitlist panel ${compact ? "rent-waitlist--compact" : ""}`.trim()}
      onSubmit={handleSubmit}
    >
      <div className="rent-waitlist__head">
        <CalendarDays size={18} />
        <div>
          <h3>Đặt lệnh chờ</h3>
          <p className="text-sm text-muted">
            Sản phẩm đang được thuê
            {availability?.availableDate && (
              <>
                {" "}
                · Dự kiến trống từ <strong>{formatDate(availability.availableDate)}</strong>
              </>
            )}
          </p>
          {waitlistCount > 0 && (
            <p className="text-xs text-muted mt-1">{waitlistCount} lệnh chờ khác đang xếp hàng</p>
          )}
        </div>
      </div>

      <DateRangeCalendar
        startDate={startDate}
        endDate={endDate}
        minDate={minDate}
        onSelect={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setError(null);
        }}
      />

      <div className="rent-waitlist__modes">
        <span className="input-label">Hình thức giao (dự kiến)</span>
        <div className="rent-waitlist__mode-row">
          {Object.values(DELIVERY_MODE).map((mode) => (
            <button
              key={mode.code}
              type="button"
              className={`rent-waitlist__mode ${deliveryMode === mode.code ? "rent-waitlist__mode--active" : ""}`}
              onClick={() => setDeliveryMode(mode.code)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="waitlist-notes">
          Ghi chú (tuỳ chọn)
        </label>
        <textarea
          id="waitlist-notes"
          className="textarea"
          rows={2}
          placeholder="VD: Cần giao cuối tuần, linh hoạt giờ nhận…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="rent-page__error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 size={16} className="spin" /> Đang ghi nhận…
          </>
        ) : (
          <>
            <Bell size={16} /> Đặt lệnh chờ
          </>
        )}
      </button>
    </form>
  );
}
