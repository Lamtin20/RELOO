"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  return cells;
}

export function DateRangeCalendar({ startDate, endDate, onSelect, minDate = null }) {
  const today = startOfDay(new Date());
  const earliest = minDate ? startOfDay(minDate) : today;
  const selectableFrom = earliest > today ? earliest : today;
  const [viewDate, setViewDate] = useState(startOfDay(startDate ?? selectableFrom));

  const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  function handleCellClick(day) {
    if (!day || day < selectableFrom) return;
    if (!startDate || (startDate && endDate)) {
      onSelect(startOfDay(day), null);
      return;
    }
    if (day < startDate) {
      onSelect(startOfDay(day), null);
    } else if (isSameDay(day, startDate)) {
      onSelect(startOfDay(day), null);
    } else {
      onSelect(startDate, startOfDay(day));
    }
  }

  function changeMonth(delta) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="date-calendar">
      <div className="date-calendar__header">
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="date-calendar__title">{monthLabel}</span>
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => changeMonth(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="date-calendar__weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="date-calendar__grid">
        {cells.map((day, i) => {
          if (!day) return <span key={i} className="date-calendar__cell date-calendar__cell--blank" />;

          const disabled = day < selectableFrom;
          const isStart = startDate && isSameDay(day, startDate);
          const isEnd = endDate && isSameDay(day, endDate);
          const inRange = startDate && endDate && day > startDate && day < endDate;

          const classes = ["date-calendar__cell"];
          if (disabled) classes.push("date-calendar__cell--disabled");
          if (inRange) classes.push("date-calendar__cell--in-range");
          if (isStart || isEnd) classes.push("date-calendar__cell--start");

          return (
            <span key={i} className={classes.join(" ")} onClick={() => handleCellClick(day)}>
              {day.getDate()}
            </span>
          );
        })}
      </div>

      <div className="date-calendar__summary">
        <span>
          {startDate ? formatDate(startDate) : "Chọn ngày nhận"} →{" "}
          {endDate ? formatDate(endDate) : "Chọn ngày trả"}
        </span>
        {startDate && endDate && (
          <strong>{Math.max(1, Math.round((endDate - startDate) / 86400000))} ngày</strong>
        )}
      </div>
    </div>
  );
}
