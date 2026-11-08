"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * RELOO wordmark logo (uses image asset from /public/brand/).
 * Sizes: sm | md | lg | xl or explicit height in px.
 */
export function Logo({
  size = "md",
  href = "/",
  className = "",
  alt = "RELOO",
  crm = false,
}) {
  const [src, setSrc] = useState("/brand/reloo-logo.png");
  useEffect(() => {
    if (!crm) return;
    const load = () =>
      fetch("/api/brand")
        .then((r) => r.json())
        .then((r) => {
          if (r.ok) setSrc(r.crmLogo);
        })
        .catch(() => {});
    load();
    window.addEventListener("reloo-brand-updated", load);
    return () => window.removeEventListener("reloo-brand-updated", load);
  }, [crm]);
  const heights = { sm: 22, md: 28, lg: 36, xl: 52 };
  const h = typeof size === "number" ? size : (heights[size] ?? heights.md);

  const img = (
    <img
      src={src}
      alt={alt}
      className="brand-logo-img"
      style={{ height: h, width: "auto" }}
    />
  );

  return href ? (
    <Link
      href={href}
      className={`brand-logo-link ${className}`.trim()}
      aria-label="RELOO Trang chủ"
    >
      {img}
    </Link>
  ) : (
    img
  );
}
