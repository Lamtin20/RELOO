export function StatusPill({ label, color = "#6B7280", className = "" }) {
  return (
    <span
      className={`badge ${className}`.trim()}
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
