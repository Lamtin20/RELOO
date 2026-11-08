'use client';
import { Icon } from "./Icon";
import {useLocale} from '@/components/settings/LocaleProvider';
import {surfaceCopy} from '@/lib/i18n/surfaces';
import { Mascot } from "@/components/brand/Mascot";

export function EmptyState({
  icon = "PackageOpen",
  title,
  description,
  action,
  className = "",
  showMascot = false,
}) {
  const {locale}=useLocale(),t=surfaceCopy[locale]||surfaceCopy['vi-VN'];
  return (
    <div className={`empty-state ${className}`.trim()}>
      {showMascot ? (
        <Mascot size="sm" className="empty-state__mascot" />
      ) : (
        <div className="empty-state__icon">
          <Icon name={icon} size="lg" />
        </div>
      )}
      <h3 className="empty-state__title">{title||t.empty}</h3>
      {description&&<p className="empty-state__desc">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
