import Link from "next/link";

/**
 * RELOO wordmark logo (uses image asset from /public/brand/).
 * Sizes: sm | md | lg | xl or explicit height in px.
 */
export function Logo({ size = "md", href = "/", className = "", alt = "RELOO" }) {
  const heights = { sm: 22, md: 28, lg: 36, xl: 52 };
  const h = typeof size === "number" ? size : heights[size] ?? heights.md;

  const img = (
    <img
      src="/brand/reloo-logo.png"
      alt={alt}
      className="brand-logo-img"
      style={{ height: h, width: "auto" }}
    />
  );

  return href ? (
    <Link href={href} className={`brand-logo-link ${className}`.trim()} aria-label="RELOO Trang chủ">
      {img}
    </Link>
  ) : (
    img
  );
}
