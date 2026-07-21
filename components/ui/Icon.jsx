import * as LucideIcons from "lucide-react";

const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export function Icon({ name, size = "md", className = "", strokeWidth = 1.75, ...props }) {
  const LucideIcon = LucideIcons[name];

  if (!LucideIcon) {
    return null;
  }

  const pixelSize = typeof size === "number" ? size : ICON_SIZES[size] ?? ICON_SIZES.md;

  return (
    <LucideIcon
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}
