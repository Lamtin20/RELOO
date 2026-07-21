"use client";

import { Icon } from "@/components/ui/Icon";
import { TRUST_BADGES } from "@/lib/constants";

/**
 * Hàng meta gọn — danh mục, tình trạng, huy hiệu uy tín
 */
export function ProductMetaBar({ category, condition, trustBadgeIds = [] }) {
  const trustBadges = trustBadgeIds
    .map((id) => TRUST_BADGES[id.toUpperCase()])
    .filter(Boolean);

  if (!category && !condition && trustBadges.length === 0) return null;

  return (
    <div className="product-meta-bar">
      {(category || condition) && (
        <div className="product-meta-bar__primary">
          {category && (
            <span className="product-meta-bar__category">
              {category.icon && <Icon name={category.icon} size={13} />}
              {category.name}
            </span>
          )}
          {category && condition && <span className="product-meta-bar__divider" aria-hidden />}
          {condition && (
            <span className="product-meta-bar__condition">
              <span className="product-meta-bar__dot" />
              {condition.label}
            </span>
          )}
        </div>
      )}

      {trustBadges.length > 0 && (
        <div className="product-meta-bar__trust" role="list" aria-label="Huy hiệu uy tín">
          {trustBadges.map((badge) => (
            <span key={badge.id} className="product-meta-bar__trust-chip" role="listitem">
              {badge.icon && <Icon name={badge.icon} size={12} />}
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
