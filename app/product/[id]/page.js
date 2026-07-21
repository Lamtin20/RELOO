"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { listingMapUrl } from "@/lib/listing-location";
import {
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
} from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { Badge, EmptyState, Money } from "@/components/ui";
import { OwnerActiveListingsPanel } from "@/components/owner/OwnerActiveListingsPanel";
import { ListingAvailabilityBanner } from "@/components/listings/ListingAvailabilityBanner";
import { LISTING_STATUS } from "@/lib/constants";
import {
  buildListingAvailability,
  getWaitlistForListing,
} from "@/lib/rental-availability";
import { ListingLabelChips } from "@/components/listings/ListingLabelChips";
import { NftPassportCompact } from "@/components/listings/NftPassportCompact";
import { ProductSidebarDesktopExtras } from "@/components/listings/ProductSidebarDesktopExtras";
import { ProductMetaBar } from "@/components/listings/ProductMetaBar";
import { CategorySpecDisplay } from "@/components/listings/CategorySpecFields";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { CATEGORIES, LISTING_CONDITIONS } from "@/lib/constants";
import { getInquiryThreadId, formatDate } from "@/lib/utils";

const REVIEW_TEMPLATES = [
  "Sản phẩm đúng như mô tả, đóng gói kỹ, Green Audit rõ ràng minh bạch.",
  "Chủ đồ nhiệt tình, giao nhận đúng hẹn. Sẽ thuê lại lần sau.",
  "Chất lượng tốt hơn mong đợi, giá hợp lý so với thị trường.",
  "Quy trình Green Audit giúp mình yên tâm hơn nhiều so với thuê ngoài.",
  "Đóng gói cẩn thận, tài sản còn rất mới so với mô tả.",
];

function formatTimeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Hôm nay";
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

function buildMockReviews(listing, users) {
  const count = Math.min(listing.reviewCount ?? 0, 5);
  const reviewers = users.filter((u) => u.id !== listing.ownerId);
  if (!reviewers.length || count === 0) return [];

  return Array.from({ length: count }).map((_, i) => {
    const reviewer = reviewers[i % reviewers.length];
    const daysAgo = 6 + i * 11;
    const date = new Date(Date.now() - daysAgo * 86400000);
    return {
      id: `${listing.id}-review-${i}`,
      reviewer,
      rating: Math.max(3, Math.round((listing.rating ?? 5) - (i % 2))),
      text: REVIEW_TEMPLATES[i % REVIEW_TEMPLATES.length],
      date,
    };
  });
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { state, actions } = useReloo();
  const { getListingById, getOwner, dbLoading, allListings } = useListings();

  const listing = getListingById(params.id);
  const owner = listing ? getOwner(listing.ownerId) : null;

  const [activeImage, setActiveImage] = useState(0);

  const category = listing ? CATEGORIES.find((c) => c.id === listing.category) : null;
  const condition = listing ? LISTING_CONDITIONS[listing.condition?.toUpperCase()] : null;

  const reviews = useMemo(() => {
    if (!listing) return [];
    return buildMockReviews(listing, state.users);
  }, [listing, state.users]);

  const availability = useMemo(
    () => (listing ? buildListingAvailability(listing, state.orders) : null),
    [listing, state.orders],
  );

  const waitlistCount = useMemo(
    () => (listing ? getWaitlistForListing(state.rentWaitlists, listing.id).length : 0),
    [listing, state.rentWaitlists],
  );

  const isRented = listing?.status === LISTING_STATUS.RENTED.code || availability?.rented;

  if (dbLoading && !listing) {
    return (
      <MarketplaceShell>
        <div className="container db-loading" style={{ padding: "96px 0" }} aria-label="Đang tải sản phẩm">
          <div className="dashboard-spinner" />
        </div>
      </MarketplaceShell>
    );
  }

  if (!listing) {
    return (
      <MarketplaceShell>
        <div className="container" style={{ padding: "64px 0" }}>
          <EmptyState
            icon="PackageX"
            title="Không tìm thấy sản phẩm"
            description="Sản phẩm này không tồn tại hoặc đã bị gỡ khỏi RELOO."
            action={
              <button className="btn btn-primary" onClick={() => router.push("/explore")}>
                Quay lại khám phá
              </button>
            }
          />
        </div>
      </MarketplaceShell>
    );
  }

  function handleRent() {
    if (!user) {
      router.push(`/auth?next=/rent/${listing.id}${isRented ? "?mode=waitlist" : ""}`);
      return;
    }
    if (isRented) {
      router.push(`/rent/${listing.id}?mode=waitlist`);
      return;
    }
    router.push(`/rent/${listing.id}`);
  }

  function handleChat() {
    if (!user) {
      router.push(`/auth?next=/product/${listing.id}`);
      return;
    }
    if (user.id === listing.ownerId) return;
    actions.ensureInquiryThread(listing.id, user.id);
    router.push(`/dashboard/messages?thread=${getInquiryThreadId(listing.id, user.id)}`);
  }

  const isOwner = user?.id === listing.ownerId;

  const postedAgo = formatTimeAgo(listing.createdAt);
  const imageCount = listing.images?.length ?? 0;

  function prevImage() {
    if (imageCount <= 1) return;
    setActiveImage((i) => (i === 0 ? imageCount - 1 : i - 1));
  }

  function nextImage() {
    if (imageCount <= 1) return;
    setActiveImage((i) => (i === imageCount - 1 ? 0 : i + 1));
  }

  return (
    <MarketplaceShell>
      <div className="product-page-wrap">
        <nav className="container product-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">RELOO</Link>
          <span aria-hidden>›</span>
          <Link href="/explore">Khám phá</Link>
          {category && (
            <>
              <span aria-hidden>›</span>
              <Link href={`/explore?category=${category.slug}`}>{category.name}</Link>
            </>
          )}
          <span aria-hidden>›</span>
          <span className="product-breadcrumb__current">{listing.title}</span>
        </nav>

        <div className="container product-layout">
          <div className="product-layout__left-stack">
            <div className="product-layout__gallery">
              <div className="product-gallery">
                <div className="product-gallery__main">
                  <ListingLabelChips listing={listing} overlay className="product-gallery__labels" />
                  <img src={listing.images?.[activeImage]} alt={listing.title} />
                  {imageCount > 1 && (
                    <>
                      <button
                        type="button"
                        className="product-gallery__nav product-gallery__nav--prev"
                        onClick={prevImage}
                        aria-label="Ảnh trước"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        className="product-gallery__nav product-gallery__nav--next"
                        onClick={nextImage}
                        aria-label="Ảnh sau"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>
                {imageCount > 1 && (
                  <div className="product-gallery__thumbs">
                    {listing.images.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        className={`product-gallery__thumb ${i === activeImage ? "product-gallery__thumb--active" : ""}`}
                        onClick={() => setActiveImage(i)}
                      >
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement?.classList.add("product-gallery__thumb--broken");
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <section className="product-layout__desc product-detail-card">
              <h2 className="product-detail-card__title">Mô tả chi tiết</h2>
              <div className="product-description">
                <p>{listing.description}</p>
                <div className="product-description__conditions">
                  {condition && <Badge variant="green">Tình trạng: {condition.label}</Badge>}
                  <Badge variant="muted">{listing.viewCount ?? 0} lượt xem</Badge>
                </div>
              </div>
            </section>

            <section className="product-layout__specs product-detail-card product-detail-card--specs">
              <CategorySpecDisplay listing={listing} inline detailCard />
            </section>
          </div>

          <aside className="product-layout__sidebar">
            <div className="product-layout__intro product-sidebar-card">
              {isRented && (
                <ListingAvailabilityBanner
                  listing={listing}
                  availability={availability}
                  waitlistCount={waitlistCount}
                />
              )}

              <ProductMetaBar
                category={category}
                condition={condition}
                trustBadgeIds={listing.trustBadges}
              />

              <h1 className="product-info__title">{listing.title}</h1>

              <div className="product-hero__price-block">
                {condition && (
                  <span className="product-hero__condition-tag">{condition.label}</span>
                )}
                <div className="product-price-row">
                  <span className="product-price-row__value">
                    <Money amount={listing.dailyPrice} />
                  </span>
                  <span className="text-muted">/ ngày</span>
                </div>
              </div>

              <div className="product-rating-row">
                <span className="product-rating-row__stars">
                  <Star size={14} />
                  {(listing.rating ?? 0).toFixed(1)}
                </span>
                <span className="product-rating-row__sep" aria-hidden />
                <span>{listing.reviewCount ?? 0} lượt đánh giá</span>
                <span className="product-rating-row__sep" aria-hidden />
                <span className="product-rating-row__location">
                  <MapPin size={13} /> {listing.location}
                </span>
                {postedAgo && (
                  <>
                    <span className="product-rating-row__sep" aria-hidden />
                    <span>{postedAgo}</span>
                  </>
                )}
                {listingMapUrl(listing) && (
                  <>
                    <span className="product-rating-row__sep product-rating-row__sep--hide-mobile" aria-hidden />
                    <a
                      href={listingMapUrl(listing)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="product-location-map-link product-rating-row__map-link"
                    >
                      <ExternalLink size={12} /> Bản đồ
                    </a>
                  </>
                )}
              </div>

              {!isOwner && (
                <div className="product-hero__actions">
                  <button type="button" className="product-hero__btn product-hero__btn--chat" onClick={handleChat}>
                    <MessageCircle size={18} />
                    Chat
                  </button>
                  <button
                    type="button"
                    className={`product-hero__btn product-hero__btn--rent ${isRented ? "product-hero__btn--waitlist" : ""}`}
                    onClick={handleRent}
                  >
                    {isRented ? "Đặt lệnh chờ" : "Thuê ngay"}
                  </button>
                </div>
              )}
            </div>

            <div className="product-layout__trust">
              <NftPassportCompact
                passport={listing.nftPassport}
                listingId={listing.id}
                listingTitle={listing.title}
                ownerId={listing.ownerId}
                orders={state.orders}
              />
            </div>

            <ProductSidebarDesktopExtras
              listing={listing}
              availability={availability}
              waitlistCount={waitlistCount}
              isRented={isRented}
            />

          </aside>

          <div className="product-layout__bottom">
            <div className="product-layout__owner">
              <OwnerActiveListingsPanel
                owner={owner}
                currentListingId={listing.id}
                listings={allListings}
                orders={state.orders}
              />
            </div>

            <div className="product-layout__reviews product-detail-card reviews-panel">
              <div className="reviews-panel__title">
                <h2 className="product-detail-card__title">Đánh giá từ người thuê</h2>
                <span className="flex items-center gap-1 font-semibold">
                  <Star size={14} style={{ color: "#f5a524", fill: "#f5a524" }} />
                  {(listing.rating ?? 0).toFixed(1)} ({listing.reviewCount ?? 0})
                </span>
              </div>

              {reviews.length === 0 ? (
                <EmptyState
                  icon="MessageSquare"
                  title="Chưa có đánh giá"
                  description="Hãy là người đầu tiên thuê và đánh giá sản phẩm này."
                />
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="review-item">
                    <img src={review.reviewer.avatar} alt={review.reviewer.name} className="review-item__avatar" />
                    <div className="review-item__body">
                      <div className="review-item__head">
                        <span className="review-item__name">{review.reviewer.name}</span>
                        <span className="review-item__stars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} style={{ opacity: i < review.rating ? 1 : 0.25 }} />
                          ))}
                        </span>
                      </div>
                      <p className="review-item__text">{review.text}</p>
                      <span className="review-item__date">{formatDate(review.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="product-sticky-bar">
          <button type="button" className="product-sticky-bar__chat" onClick={handleChat}>
            <MessageCircle size={20} />
            Chat
          </button>
          <button type="button" className="product-sticky-bar__rent" onClick={handleRent}>
            {isRented ? "Đặt lệnh chờ" : "Thuê ngay"}
          </button>
        </div>
      )}

    </MarketplaceShell>
  );
}
