const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const COMPACT_FORMATTER = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

export function Money({
  amount = 0,
  compact = false,
  suffix = "",
  className = "",
  showSign = false,
}) {
  const numeric = Number(amount) || 0;
  const formatted = compact
    ? `${COMPACT_FORMATTER.format(numeric)}₫`
    : VND_FORMATTER.format(numeric);

  const sign = showSign && numeric > 0 ? "+" : "";

  return (
    <span className={`money ${className}`.trim()} data-amount={numeric}>
      {sign}
      {formatted}
      {suffix}
    </span>
  );
}
