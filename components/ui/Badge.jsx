const VARIANTS = {
  green: "badge-green",
  blue: "badge-blue",
  muted: "badge-muted",
  danger: "badge-danger",
  warning: "badge-warning",
};

export function Badge({
  children,
  variant = "muted",
  icon: IconComponent,
  className = "",
}) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.muted;

  return (
    <span className={`badge ${variantClass} ${className}`.trim()}>
      {IconComponent && <IconComponent size={12} strokeWidth={2} />}
      {children}
    </span>
  );
}
