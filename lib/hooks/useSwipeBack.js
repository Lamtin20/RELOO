"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vuốt từ mép trái màn hình để quay lại (mobile)
 */
export function useSwipeBack({ enabled = true, fallback = "/" } = {}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const EDGE_PX = 28;
    const MIN_SWIPE_PX = 72;
    const MAX_VERTICAL_PX = 64;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onTouchStart(e) {
      const touch = e.touches[0];
      if (!touch || touch.clientX > EDGE_PX) return;
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    }

    function onTouchEnd(e) {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);

      if (dx >= MIN_SWIPE_PX && dy <= MAX_VERTICAL_PX) {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, fallback, router]);
}

export function SwipeBackHandler({ enabled = true, fallback = "/" }) {
  useSwipeBack({ enabled, fallback });
  return null;
}
