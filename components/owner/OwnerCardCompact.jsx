"use client";

import Link from "next/link";
import { Crown, BadgeCheck, ChevronRight, Star } from "lucide-react";
import { Badge, TrustScore } from "@/components/ui";

export function OwnerCardCompact({ owner, listingRating, reviewCount, className = "" }) {
  if (!owner) return null;

  const trustPercent = Math.round((owner.trustScore ?? 0) / 10);
  const tier =
    (owner.trustScore ?? 0) >= 800
      ? "Xuất sắc"
      : (owner.trustScore ?? 0) >= 700
        ? "Tốt"
        : (owner.trustScore ?? 0) >= 600
          ? "Khá"
          : "Đang xây dựng";

  const ratingDisplay =
    listingRating != null ? Number(listingRating).toFixed(1) : null;

  return (
    <div className={`owner-card-v2 panel ${className}`.trim()}>
      <div className="owner-card-v2__header">
        <img src={owner.avatar} alt={owner.name} className="owner-card-v2__avatar" />
        <div className="owner-card-v2__intro">
          <Link href={`/user/${owner.id}`} className="owner-card-v2__name">
            {owner.name}
          </Link>
          <div className="owner-card-v2__badges">
            {owner.isPro && (
              <Badge variant="blue" icon={Crown}>
                Chủ đồ Pro
              </Badge>
            )}
            <Badge variant="green" icon={BadgeCheck}>
              KYC {owner.kycLevel}
            </Badge>
          </div>
          {owner.bio && <p className="owner-card-v2__bio">{owner.bio}</p>}
        </div>
        <div className="owner-card-v2__trust-wrap">
          <TrustScore score={trustPercent} size={48} showLabel={false} />
        </div>
      </div>

      <div className="owner-card-v2__stats">
        <div className="owner-card-v2__stat">
          <strong>{tier}</strong>
          <span>{owner.trustScore ?? 0}/1000 uy tín</span>
        </div>
        <div className="owner-card-v2__stat">
          <strong>{owner.totalRentals ?? 0}</strong>
          <span>Lượt cho thuê</span>
        </div>
        <div className="owner-card-v2__stat">
          <strong className="owner-card-v2__rating">
            {ratingDisplay != null ? (
              <>
                <Star size={12} fill="#d4a017" color="#d4a017" />
                {ratingDisplay}
              </>
            ) : (
              "—"
            )}
          </strong>
          <span>{reviewCount ?? 0} đánh giá tin</span>
        </div>
      </div>

      <Link href={`/user/${owner.id}`} className="owner-card-v2__cta btn btn-ct w-full">
        Xem tường cá nhân
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
