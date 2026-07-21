"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Share2,
  UserPlus,
  MapPin,
  MessageCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { Badge, EmptyState, Money, TrustScore } from "@/components/ui";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { LISTING_STATUS } from "@/lib/constants";
import { formatDate, formatMemberDuration, formatTimeAgo } from "@/lib/utils";

const REVIEW_SNIPPETS = [
  "Giao đồ nhanh, đúng mô tả, chủ đồ nhiệt tình.",
  "Sản phẩm sạch sẽ, đóng gói cẩn thận. Sẽ thuê lại.",
  "Tư vấn rõ ràng, hỗ trợ đổi ngày linh hoạt.",
  "Uy tín, Green Audit minh bạch, rất yên tâm.",
  "Giá hợp lý so với chất lượng thực tế.",
];

function buildOwnerReviews(owner, listings, users) {
  const rated = listings.filter((l) => (l.reviewCount ?? 0) > 0);
  if (rated.length === 0) return [];

  return rated.slice(0, 5).map((listing, i) => {
    const reviewer = users[(i + 2) % users.length];
    return {
      id: `rev_${owner.id}_${listing.id}`,
      rating: Math.min(5, Math.max(4, Math.round(listing.rating ?? 5))),
      text: REVIEW_SNIPPETS[i % REVIEW_SNIPPETS.length],
      date: listing.createdAt,
      listing,
      reviewer,
    };
  });
}

export default function UserWallPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { state } = useReloo();
  const { allListings } = useListings();

  const [tab, setTab] = useState("active");
  const [following, setFollowing] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");

  const owner = state.users.find((u) => u.id === id);

  const ownerListings = useMemo(
    () => allListings.filter((l) => l.ownerId === id),
    [allListings, id]
  );

  const activeListings = ownerListings.filter(
    (l) => l.status === LISTING_STATUS.AVAILABLE.code || l.status === LISTING_STATUS.RENTED.code
  );
  const completedListings = ownerListings.filter((l) => l.status === LISTING_STATUS.RENTED.code);

  const displayedListings = tab === "active" ? activeListings : completedListings;

  const avgRating = useMemo(() => {
    const rated = ownerListings.filter((l) => (l.reviewCount ?? 0) > 0);
    if (!rated.length) return 0;
    return rated.reduce((s, l) => s + (l.rating ?? 0), 0) / rated.length;
  }, [ownerListings]);

  const totalReviews = ownerListings.reduce((s, l) => s + (l.reviewCount ?? 0), 0);
  const followers = Math.max(12, Math.round((owner?.totalRentals ?? 0) * 11.5 + 40));
  const reviews = owner ? buildOwnerReviews(owner, ownerListings, state.users) : [];

  if (!owner) {
    return (
      <MarketplaceShell>
        <div className="container" style={{ padding: "64px 0" }}>
          <EmptyState
            icon="UserCircle"
            title="Không tìm thấy người dùng"
            description="Tài khoản này không tồn tại hoặc đã bị ẩn."
            action={
              <button type="button" className="btn btn-primary" onClick={() => router.push("/explore")}>
                Khám phá RELOO
              </button>
            }
          />
        </div>
      </MarketplaceShell>
    );
  }

  const trustPercent = Math.round((owner.trustScore ?? 0) / 10);
  const isSelf = currentUser?.id === owner.id;

  return (
    <MarketplaceShell>
      <div className="user-wall">
        <header className="user-wall__topbar">
          <button type="button" className="user-wall__back" onClick={() => router.back()} aria-label="Quay lại">
            <ArrowLeft size={22} />
          </button>
          <span className="user-wall__topbar-title">Tường cá nhân</span>
          <span className="user-wall__topbar-spacer" />
        </header>

        <section className="user-wall__hero">
          <img src={owner.avatar} alt={owner.name} className="user-wall__avatar" />
          <h1>{owner.name}</h1>

          <div className="user-wall__rating-row">
            <Star size={16} fill="#f5a524" color="#f5a524" />
            <strong>{avgRating > 0 ? avgRating.toFixed(1) : "—"}</strong>
            <span>({totalReviews} đánh giá)</span>
            <span className="user-wall__dot">·</span>
            <span>Người theo dõi {followers.toLocaleString("vi-VN")}</span>
          </div>

          <div className="user-wall__actions">
            <button type="button" className="user-wall__action-btn">
              <Share2 size={16} />
              Chia sẻ
            </button>
            {!isSelf && (
              <button
                type="button"
                className={`user-wall__action-btn user-wall__action-btn--primary ${following ? "is-following" : ""}`}
                onClick={() => setFollowing((v) => !v)}
              >
                <UserPlus size={16} />
                {following ? "Đang theo dõi" : "Theo dõi"}
              </button>
            )}
          </div>

          <ul className="user-wall__facts">
            <li>
              <MessageCircle size={15} />
              <span>
                Tỷ lệ phản hồi:{" "}
                <strong>{(owner.trustScore ?? 0) >= 700 ? "Thường xuyên" : "Thỉnh thoảng"}</strong>
              </span>
            </li>
            <li>
              <MapPin size={15} />
              <span>{owner.address || "TP. Hồ Chí Minh"}</span>
            </li>
            <li>
              <Clock size={15} />
              <span>Đã tham gia: {formatMemberDuration(owner.joinedAt)}</span>
            </li>
          </ul>

          <div className="user-wall__trust">
            <TrustScore score={trustPercent} size={48} showLabel={false} />
            <div>
              <strong>{owner.trustScore ?? 0}/1000 uy tín</strong>
              <span>KYC {owner.kycLevel} · {owner.totalRentals ?? 0} lượt cho thuê</span>
            </div>
            {owner.isPro && <Badge variant="blue">Chủ đồ Pro</Badge>}
          </div>

          {owner.bio && <p className="user-wall__bio">{owner.bio}</p>}
        </section>

        <section className="user-wall__section">
          <div className="user-wall__section-head">
            <h2>Tất cả tin đăng ({ownerListings.length})</h2>
          </div>
          <div className="user-wall__tabs">
            <button
              type="button"
              className={tab === "active" ? "is-active" : ""}
              onClick={() => setTab("active")}
            >
              Tin đang hoạt động ({activeListings.length})
            </button>
            <button
              type="button"
              className={tab === "completed" ? "is-active" : ""}
              onClick={() => setTab("completed")}
            >
              Đã cho thuê ({completedListings.length})
            </button>
          </div>

          {displayedListings.length === 0 ? (
            <EmptyState
              icon="Package"
              title="Chưa có tin đăng"
              description="Chủ đồ chưa có tin nào trong mục này."
            />
          ) : (
            <div className="user-wall__listings">
              {displayedListings.map((listing) => (
                <Link key={listing.id} href={`/product/${listing.id}`} className="user-wall-listing">
                  <div
                    className="user-wall-listing__thumb"
                    style={{ backgroundImage: `url(${listing.images?.[0]})` }}
                  />
                  <div className="user-wall-listing__body">
                    <p>{listing.title}</p>
                    <Money amount={listing.dailyPrice} suffix="/ngày" />
                    <span>
                      <MapPin size={12} />
                      {listing.location}
                      <span className="user-wall__dot">·</span>
                      {formatTimeAgo(listing.createdAt)}
                    </span>
                  </div>
                  <ChevronRight size={18} className="user-wall-listing__chev" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="user-wall__section">
          <h2>Đánh giá</h2>
          <div className="user-wall__review-summary">
            <div className="user-wall__review-score">
              <Star size={22} fill="#f5a524" color="#f5a524" />
              <strong>{avgRating > 0 ? avgRating.toFixed(1) : "—"}</strong>
            </div>
            <div>
              <strong>{avgRating >= 4.5 ? "Rất hài lòng" : avgRating >= 4 ? "Hài lòng" : "Đang nhận đánh giá"}</strong>
              <span>({totalReviews} đánh giá từ người thuê)</span>
            </div>
          </div>

          <div className="user-wall__review-tabs">
            {[
              { id: "all", label: `Tất cả (${reviews.length})` },
              { id: "renter", label: `Từ người thuê (${reviews.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={reviewFilter === f.id ? "is-active" : ""}
                onClick={() => setReviewFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {reviews.length === 0 ? (
            <p className="text-muted text-sm user-wall__no-reviews">Chưa có đánh giá công khai.</p>
          ) : (
            <div className="user-wall__reviews">
              {reviews.map((review) => (
                <article key={review.id} className="user-wall-review">
                  <div className="user-wall-review__head">
                    <img src={review.reviewer.avatar} alt="" className="user-wall-review__avatar" />
                    <div className="user-wall-review__identity">
                      <div className="user-wall-review__name-row">
                        <strong>{review.reviewer.name}</strong>
                        <span className="user-wall-review__badge">Người thuê</span>
                      </div>
                      <div className="user-wall-review__meta">
                        <div className="user-wall-review__stars" aria-label={`${review.rating} sao`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={13}
                              fill={i < review.rating ? "#d4a017" : "none"}
                              color={i < review.rating ? "#d4a017" : "#d1d5db"}
                              strokeWidth={i < review.rating ? 0 : 1.5}
                            />
                          ))}
                        </div>
                        <time className="user-wall-review__date">{formatDate(review.date)}</time>
                      </div>
                    </div>
                  </div>
                  <blockquote className="user-wall-review__quote">{review.text}</blockquote>
                  <Link href={`/product/${review.listing.id}`} className="user-wall-review__product">
                    <div
                      className="user-wall-review__product-thumb"
                      style={{ backgroundImage: `url(${review.listing.images?.[0]})` }}
                    />
                    <div className="user-wall-review__product-info">
                      <span className="user-wall-review__product-label">Sản phẩm đã thuê</span>
                      <span className="user-wall-review__product-title">{review.listing.title}</span>
                      <span className="user-wall-review__product-price">
                        <Money amount={review.listing.dailyPrice} suffix="/ngày" />
                      </span>
                    </div>
                    <ChevronRight size={16} className="user-wall-review__product-chev" aria-hidden />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </MarketplaceShell>
  );
}
