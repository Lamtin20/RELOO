"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({
  open = false,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = size === "lg" ? 640 : size === "sm" ? 360 : 480;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div
        className={`modal ${className}`.trim()}
        style={{ maxWidth }}
      >
        {(title || onClose) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {onClose && (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={onClose}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
