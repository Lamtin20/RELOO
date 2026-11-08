"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  History,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { LISTING_STATUS } from "@/lib/constants";
import { getActiveListingOrder } from "@/lib/rental-availability";
import { formatTimeAgo } from "@/lib/utils";

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      return;
    }

    let frameId = 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return target<=0?0:value;
}

function computeOwnerStats(owner, listings, orders) {
  const ownerListings = listings.filter((l) => l.ownerId === owner.id);

  const availableCount = ownerListings.filter(
    (l) => l.status === LISTING_STATUS.AVAILABLE.code,
  ).length;

  const rentedCount = ownerListings.filter((l) => {
    if (l.status === LISTING_STATUS.RENTED.code) return true;
    return Boolean(getActiveListingOrder(orders, l.id));
  }).length;

  const rated = ownerListings.filter((l) => (l.rating ?? 0) > 0);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
      : 0;

  const totalReviews = ownerListings.reduce((sum, l) => sum + (l.reviewCount ?? 0), 0);

  const lastActive = ownerListings.reduce((latest, l) => {
    const t = new Date(l.updatedAt ?? l.createdAt ?? 0).getTime();
    return t > latest ? t : latest;
  }, new Date(owner.joinedAt ?? 0).getTime());

  const responseRate = Math.min(
    99,
    Math.max(45, Math.round(62 + (owner.trustScore ?? 0) / 25)),
  );

  return {
    availableCount,
    rentedCount,
    avgRating,
    totalReviews,
    lastActiveLabel: formatTimeAgo(new Date(lastActive).toISOString()) ?? "Gần đây",
    responseRate,
    totalRentals: owner.totalRentals ?? 0,
  };
}

function StatCell({ value, label, icon: Icon, tone, delay = 0, pulse = false }) {
  const animated = useCountUp(value);

  return (
    <div
      className={`lender-stat-cell lender-stat-cell--${tone} ${pulse ? "lender-stat-cell--pulse" : ""}`.trim()}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon size={13} strokeWidth={2.25} className="lender-stat-cell__icon" />
      <strong className="lender-stat-cell__value">{animated.toLocaleString("vi-VN")}</strong>
      <span className="lender-stat-cell__label">{label}</span>
    </div>
  );
}

/**
 * Card gian hàng chủ đồ — 3 cột: avatar · nội dung · đánh giá
 */
export function LenderShopProfileCard({ owner, listings = [], orders = [], className = "" }) {
  const stats = owner ? computeOwnerStats(owner, listings, orders) : null;
  const responseAnimated = useCountUp(stats?.responseRate ?? 0, 700);

  if (!owner || !stats) return null;

  const ratingDisplay = stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—";

  return (
    <Link
      href={`/user/${owner.id}`}
      className={`lender-shop-profile ${className}`.trim()}
    >
      <img src={owner.avatar} alt={owner.name} className="lender-shop-profile__avatar" />

      <div className="lender-shop-profile__content">
        <div className="lender-shop-profile__title-row">
          <span className="lender-shop-profile__name">{owner.name}</span>
          <span className="lender-shop-profile__badges">
            {owner.isPro && (
              <span className="lender-shop-profile__badge lender-shop-profile__badge--pro">
                <Crown size={10} /> Pro
              </span>
            )}
            {owner.kycLevel && (
              <span className="lender-shop-profile__badge lender-shop-profile__badge--kyc">
                <ShieldCheck size={10} /> {owner.kycLevel}
              </span>
            )}
            <span className="lender-shop-profile__badge lender-shop-profile__badge--biz">
              <Briefcase size={10} />
            </span>
          </span>
        </div>

        <div className="lender-shop-profile__stats">
          <StatCell
            value={stats.totalRentals}
            label="Lượt thuê"
            icon={History}
            tone="neutral"
            delay={0}
          />
          <StatCell
            value={stats.availableCount}
            label="Sẵn sàng"
            icon={CheckCircle2}
            tone="ready"
            delay={60}
          />
          <StatCell
            value={stats.rentedCount}
            label="Đang thuê"
            icon={CalendarClock}
            tone="rented"
            delay={120}
            pulse={stats.rentedCount > 0}
          />
        </div>

        <div className="lender-shop-profile__meta">
          <span className="lender-shop-profile__meta-item">
            <Clock3 size={12} />
            <span>Hoạt động</span>
            <em>{stats.lastActiveLabel}</em>
          </span>
          <span className="lender-shop-profile__meta-dot" aria-hidden>·</span>
          <span className="lender-shop-profile__meta-item lender-shop-profile__meta-item--response">
            <MessageCircle size={12} />
            <span>Phản hồi</span>
            <em>{responseAnimated}%</em>
            <span className="lender-shop-profile__meta-bar" aria-hidden>
              <span style={{ width: `${responseAnimated}%` }} />
            </span>
          </span>
        </div>
      </div>

      <div className="lender-shop-profile__aside">
        <div className="lender-shop-profile__rating">
          <strong>{ratingDisplay}</strong>
          <Star size={15} fill="#f5a524" color="#f5a524" />
        </div>
        <span className="lender-shop-profile__reviews">
          {stats.totalReviews.toLocaleString("vi-VN")} đánh giá
        </span>
        <ChevronRight size={16} className="lender-shop-profile__chev" aria-hidden />
      </div>
    </Link>
  );
}
