import { Icon } from "./Icon";

export function StatCard({
  label,
  value,
  change,
  changeDirection = "up",
  icon,
  className = "",
}) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <span className="stat-card__label">{label}</span>
        {icon && (
          <div className="stat-card__icon">
            <Icon name={icon} size="md" />
          </div>
        )}
      </div>
      <span className="stat-card__value">{value}</span>
      {change != null && (
        <span
          className={`stat-card__change stat-card__change--${changeDirection}`}
        >
          {changeDirection === "up" ? "↑" : "↓"} {change}
        </span>
      )}
    </div>
  );
}
