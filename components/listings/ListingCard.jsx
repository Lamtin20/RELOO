"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Star, Heart, ShieldCheck, Sparkles } from "lucide-react";

import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui";
import {
  formatCondition,
  formatTimeAgo,
  distanceKm,
  formatDistance,
} from "@/lib/utils";

export function ListingCard({ listing, viewerAddress }) {
  const { state } = useReloo();
  const owner = state.users.find((u) => u.id === listing.ownerId);
  const [liked, setLiked] = useState(false);

  const km = viewerAddress ? distanceKm(viewerAddress, listing.location) : null;
  const isNew = Date.now() - new Date(listing.createdAt).getTime() < 7 * 86400000;
  const isVerified = listing.trustBadges?.includes("verified");
  const isBoosted = listing.isBoosted;

  const trustPercent = owner ? Math.round((owner.trustScore ?? 0) / 10) : 0;

  return (
    <Link href={`/product/${listing.id}`} className="lc">
      <div className="lc__media">
        <img
          src={listing.images?.[0]}
          alt={listing.title}
          className="lc__image"
          loading="lazy"
        />

        <div className="lc__ribbons">
          {isBoosted && (
            <span className="lc__ribbon lc__ribbon--boost">
              <Sparkles size={11} /> Nổi bật
            </span>
          )}
          {isNew && !isBoosted && <span className="lc__ribbon lc__ribbon--new">MỚI</span>}
        </div>

        <button
          type="button"
          className={`lc__like ${liked ? "lc__like--on" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setLiked((v) => !v);
          }}
          aria-label="Yêu thích"
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} />
        </button>

        {km != null && (
          <span className="lc__distance">
            <MapPin size={11} /> {formatDistance(km)}
          </span>
        )}
      </div>

      <div className="lc__body">
        <div className="lc__price-row">
          <Money amount={listing.dailyPrice} className="lc__price" />
          <span className="lc__price-unit">/ ngày</span>
        </div>

        <h3 className="lc__title">{listing.title}</h3>

        <div className="lc__location">
          <MapPin size={12} />
          <span>{listing.location}</span>
        </div>

        <div className="lc__meta">
          <span className="lc__rating">
            <Star size={12} />
            {(listing.rating ?? 0).toFixed(1)}
            <span className="lc__rating-count">({listing.reviewCount ?? 0})</span>
          </span>
          <span className="lc__dot">·</span>
          <span className="lc__condition">{formatCondition(listing.condition)}</span>
          {isVerified && (
            <>
              <span className="lc__dot">·</span>
              <span className="lc__verified">
                <ShieldCheck size={11} /> Đã kiểm định
              </span>
            </>
          )}
        </div>

        <div className="lc__footer">
          {owner && (
            <div className="lc__owner">
              <img src={owner.avatar} alt={owner.name} className="lc__owner-avatar" />
              <div className="lc__owner-info">
                <span className="lc__owner-name">{owner.name}</span>
                <span className="lc__owner-ts">TS {trustPercent}/100 · KYC {owner.kycLevel}</span>
              </div>
            </div>
          )}
          <span className="lc__time">{formatTimeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
