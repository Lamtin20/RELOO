"use client";

import { DELIVERY_MODE } from "@/lib/constants";

export function DeliveryModePicker({ value, onChange, disabled = false }) {
  return (
    <div className="delivery-mode-picker">
      <span className="input-label">Hình thức giao nhận</span>
      <div className="delivery-mode-picker__grid">
        {Object.values(DELIVERY_MODE).map((mode) => (
          <button
            key={mode.code}
            type="button"
            disabled={disabled}
            className={`delivery-mode-picker__option ${value === mode.code ? "delivery-mode-picker__option--active" : ""}`}
            onClick={() => onChange?.(mode.code)}
          >
            <strong>{mode.label}</strong>
            <span>{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
