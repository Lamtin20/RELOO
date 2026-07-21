"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, MapPin, Package } from "lucide-react";
import { LISTING_STATUS } from "@/lib/constants";
import {
  estimateListingAvailableDate,
  getActiveListingOrder,
} from "@/lib/rental-availability";
import { formatDate } from "@/lib/utils";
import { Money, EmptyState } from "@/components/ui";
import { LenderShopProfileCard } from "@/components/owner/LenderShopProfileCard";

function ListingRow({ item, isCurrent, availableDate, badge }) {
  const content = (
    <>
      <div
        className="owner-listings-panel__thumb"
        style={{ backgroundImage: item.images?.[0] ? `url(${item.images[0]})` : undefined }}
      />
      <div className="owner-listings-panel__body">
        <p className="owner-listings-panel__name">{item.title}</p>
        <Money amount={item.dailyPrice} suffix="/ ngày" className="owner-listings-panel__price" />
        <span className="owner-listings-panel__meta">
          <MapPin size={12} />
          {item.location}
        </span>
        {availableDate && (
          <span className="owner-listings-panel__eta">
            <CalendarClock size={12} />
            Dự kiến trống {formatDate(availableDate)}
          </span>
        )}
      </div>
      {badge ? (
        <span
          className={`owner-listings-panel__badge ${badge === "rented" ? "owner-listings-panel__badge--rented" : ""}`}
        >
          {badge === "rented" ? "Đang thuê" : badge}
        </span>
      ) : (
        <ChevronRight size={18} className="owner-listings-panel__chev" aria-hidden />
      )}
    </>
  );

  if (isCurrent) {
    return (
      <div className="owner-listings-panel__item owner-listings-panel__item--current">{content}</div>
    );
  }

  return (
    <Link href={`/product/${item.id}`} className="owner-listings-panel__item">
      {content}
    </Link>
  );
}

/**
 * Sản phẩm của chủ đồ: sẵn sàng + đang được thuê (kèm dự kiến trống)
 */
export function OwnerActiveListingsPanel({
  owner,
  currentListingId,
  listings = [],
  orders = [],
  className = "",
}) {
  if (!owner) return null;

  const ownerListings = listings
    .filter((l) => l.ownerId === owner.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const availableListings = ownerListings.filter(
    (l) => l.status === LISTING_STATUS.AVAILABLE.code,
  );

  const rentedListings = ownerListings.filter((l) => {
    if (l.status === LISTING_STATUS.RENTED.code) return true;
    return Boolean(getActiveListingOrder(orders, l.id));
  });

  return (
    <div className={`owner-listings-panel panel ${className}`.trim()}>
      <LenderShopProfileCard owner={owner} listings={listings} orders={orders} />

      {availableListings.length > 0 && (
        <section className="owner-listings-panel__section">
          <h3 className="owner-listings-panel__section-title">Sẵn sàng cho thuê</h3>
          <ul className="owner-listings-panel__list">
            {availableListings.map((item) => (
              <li key={item.id}>
                <ListingRow
                  item={item}
                  isCurrent={item.id === currentListingId}
                  badge={item.id === currentListingId ? "Đang xem" : null}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rentedListings.length > 0 && (
        <section className="owner-listings-panel__section">
          <h3 className="owner-listings-panel__section-title">Đang được cho thuê</h3>
          <ul className="owner-listings-panel__list">
            {rentedListings.map((item) => {
              const activeOrder = getActiveListingOrder(orders, item.id);
              const availableDate = activeOrder
                ? estimateListingAvailableDate(activeOrder)
                : null;
              const isCurrent = item.id === currentListingId;

              return (
                <li key={item.id}>
                  <ListingRow
                    item={item}
                    isCurrent={isCurrent}
                    availableDate={availableDate}
                    badge={isCurrent ? "Đang xem" : "rented"}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {availableListings.length === 0 && rentedListings.length === 0 && (
        <EmptyState
          icon="Package"
          title="Chưa có tin đăng"
          description="Chủ đồ chưa có sản phẩm nào trên RELOO."
        />
      )}

      <Link href={`/user/${owner.id}`} className="owner-listings-panel__footer btn btn-ghost btn-sm w-full">
        <Package size={14} />
        Xem tất cả tin của {owner.name}
      </Link>
    </div>
  );
}
