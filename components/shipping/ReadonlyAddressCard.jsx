"use client";

import { MapPin, Phone, User } from "lucide-react";

/**
 * Thẻ địa chỉ chỉ đọc (lấy hàng / giao hàng đã khai báo sẵn)
 */
export function ReadonlyAddressCard({
  title,
  subtitle,
  name,
  phone,
  addressLine,
  badge,
  action,
}) {
  return (
    <div className="readonly-address-card panel-inset">
      <div className="readonly-address-card__head">
        <MapPin size={16} className="text-green" />
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
        {badge && <span className="readonly-address-card__badge">{badge}</span>}
      </div>

      <div className="readonly-address-card__body">
        {(name || phone) && (
          <div className="readonly-address-card__contact">
            {name && (
              <span>
                <User size={13} /> {name}
              </span>
            )}
            {phone && (
              <span>
                <Phone size={13} /> {phone}
              </span>
            )}
          </div>
        )}
        <p className="readonly-address-card__line">{addressLine || "Chưa có địa chỉ"}</p>
      </div>

      {action}
    </div>
  );
}
