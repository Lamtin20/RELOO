"use client";


import {RentalOperationsSettings} from '@/components/neighborhood/RentalOperationsSettings';
import { useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle, Edit3, Rocket, Eye, Star } from "lucide-react";
import { useAuth, useListings } from "@/lib/store";
import { Money, Badge, EmptyState } from "@/components/ui";
import { ListingStatusBadge } from "@/components/dashboard/StatusBadge";
import {rentalPeriodRate} from '@/lib/rental-selection';

const TABS = [
  { id: "available", label: "Đang hiển thị" },
  { id: "rented", label: "Đang cho thuê" },
  { id: "draft", label: "Bản nháp" },
  { id: "paused", label: "Tạm ẩn" },
  { id: "suspended", label: "Tạm ngưng" },
];

export default function AssetsPage() {
  const { user } = useAuth();
  const { listings, boostListing } = useListings({ ownerId: user?.id });
  const [tab, setTab] = useState("available");

  const counts = useMemo(() => {
    const c = { available: 0, rented: 0, draft: 0, paused: 0, suspended: 0 };
    listings.forEach((l) => {
      if (c[l.status] !== undefined) c[l.status]++;
    });
    return c;
  }, [listings]);

  const filtered = useMemo(
    () => listings.filter((l) => l.status === tab),
    [listings, tab]
  );

  if (!user) return null;

  const handleBoost = (id) => {
    boostListing(id, { labels: ["Tin ưu tiên"], durationDays: 3 });
  };

  return (
    <div className="dashboard-page animate-fade-up manage-listings">
      <Link className="btn btn-secondary" href="/dashboard/analytics">Hiệu quả sản phẩm</Link>
      <div className="manage-listings__head">
        <h1>Quản lý tin đăng</h1>
        <Link href="/dashboard/assets/new" className="btn btn-ct manage-listings__post-btn">
          <PlusCircle size={18} /> Đăng tin
        </Link>
      </div>

      <RentalOperationsSettings/>
      <div className="manage-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`manage-tabs__item ${tab === t.id ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label} ({counts[t.id] ?? 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="PackageOpen"
          title="Không tìm thấy tin đăng"
          description="Bạn hiện không có tin nào ở trạng thái này."
          className="manage-empty"
        />
      ) : (
        <div className="dashboard-asset-grid mt-4">
          {filtered.map((listing) => (
            <div key={listing.id} className="dashboard-asset-card panel">
              <div
                className="dashboard-asset-card__image"
                style={{
                  backgroundImage: listing.images?.[0]
                    ? `url(${listing.images[0]})`
                    : undefined,
                }}
              />
              <div className="dashboard-asset-card__body">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <ListingStatusBadge status={listing.status} />
                  {listing.isBoosted && (
                    <Badge variant="warning" icon={Rocket}>
                      Đang đẩy
                    </Badge>
                  )}
                </div>

                <h3 className="mt-2 dashboard-asset-card__title">
                  {listing.title}
                </h3>

                <Money
                  amount={listing.transactionMode==='SALE'?listing.salePrice:rentalPeriodRate(listing).price}
                  suffix={listing.transactionMode==='SALE'?'/sản phẩm':{DAY:'/ngày',WEEK:'/tuần',MONTH:'/tháng (30 ngày)'}[rentalPeriodRate(listing).unit]}
                  className="dashboard-asset-card__price"
                />

                <div className="dashboard-asset-card__meta text-xs text-muted mt-2">
                  <span className="flex items-center gap-1">
                    <Eye size={12} /> {listing.viewCount ?? 0} lượt xem
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={12} /> {listing.reviewCount>0?`${listing.rating} (${listing.reviewCount})`:'Chưa có đánh giá'}
                  </span>
                </div>

                <div className="dashboard-asset-card__actions mt-4">
                  <Link href={`/product/${listing.id}`} className="btn btn-secondary btn-sm"><Eye size={14}/>Xem</Link>
                  <Link
                    href={`/dashboard/assets/${listing.id}/edit`}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit3 size={14} /> Sửa
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={listing.isBoosted||listing.status!=='available'}
                    onClick={() => handleBoost(listing.id)}
                  >
                    <Rocket size={14} />
                    {listing.isBoosted ? "Đã đẩy" : "Đẩy tin"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
