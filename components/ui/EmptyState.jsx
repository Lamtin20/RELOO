import { Icon } from "./Icon";
import { Mascot } from "@/components/brand/Mascot";

export function EmptyState({
  icon = "PackageOpen",
  title = "Chưa có dữ liệu",
  description = "Nội dung sẽ hiển thị tại đây khi có thông tin.",
  action,
  className = "",
  showMascot = false,
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {showMascot ? (
        <Mascot size="sm" className="empty-state__mascot" />
      ) : (
        <div className="empty-state__icon">
          <Icon name={icon} size="lg" />
        </div>
      )}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__desc">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
