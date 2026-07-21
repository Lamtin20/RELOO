"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Nút quay lại trang trước — fallback khi không có history
 */
export function PageBackButton({
  fallback = "/",
  label = "Quay lại",
  variant = "inline",
  showLabel = true,
  className = "",
  ariaLabel = "Quay lại trang trước",
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  const variantClass =
    variant === "floating"
      ? "page-back-btn page-back-btn--floating"
      : variant === "topbar"
        ? "page-back-btn page-back-btn--topbar"
        : "page-back-btn page-back-btn--inline";

  return (
    <button
      type="button"
      className={`${variantClass} ${className}`.trim()}
      onClick={handleBack}
      aria-label={ariaLabel}
    >
      <ArrowLeft size={variant === "topbar" ? 20 : 22} strokeWidth={2} />
      {showLabel && variant !== "floating" && <span>{label}</span>}
    </button>
  );
}
