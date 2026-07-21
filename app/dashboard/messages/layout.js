"use client";

import { SwipeBackHandler } from "@/lib/hooks/useSwipeBack";

export default function MessagesLayout({ children }) {
  return (
    <div className="messages-shell">
      <SwipeBackHandler enabled fallback="/dashboard" />
      {children}
    </div>
  );
}
