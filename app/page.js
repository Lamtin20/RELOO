"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShieldCheck,
  Wallet,
  Clock3,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { HeroTypewriterLine } from "@/components/home/HeroTypewriterLine";
import { HomeMobileHero } from "@/components/home/HomeMobileHero";
import { HomeBookingCard } from "@/components/home/HomeBookingCard";
import { TrustBenefitsCarousel } from "@/components/home/TrustBenefitsCarousel";
import { PopularAreasRow } from "@/components/home/PopularAreasRow";
import { ServiceModeCards } from "@/components/home/ServiceModeCards";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { CategoryRow } from "@/components/listings/CategoryPills";
import { SearchBox } from "@/components/search/SearchBox";
import { useListings, useReloo, useAuth } from "@/lib/store";
import { USER_TERMS } from "@/lib/constants";
import { distanceKm, extractDistrict } from "@/lib/utils";
import {
  getInterestSurvey,
  isSurveyCompleted,
  rankCategoriesWithPreferences,
  sortListingsByPreferences,
  getPersonalizedQuickSearches,
} from "@/lib/user-preferences";
import { buildHeroRotatingLines, HERO_TITLE_LEAD } from "@/lib/hero-rotating-lines";

const DEFAULT_ADDRESS = "Quận 1, TP.HCM";

const HERO_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Kiểm tra minh bạch",
    desc: "Video tình trạng trước khi giao — lưu bằng chứng đối chiếu",
  },
  {
    icon: Wallet,
    title: "Thanh toán VietQR",
    desc: "Tiền giữ tại tài khoản ký quỹ cho đến khi trả đồ",
  },
  {
    icon: BadgeCheck,
    title: "Chứng nhận tài sản số",
    desc: "Bảo chứng Blockchain & điểm tin cậy chủ đồ",
  },
];

const HERO_QUICK_SEARCHES_FALLBACK = ["Máy ảnh", "Lều camping", "Váy dạ hội", "Laptop", "Mẹ & Bé"];

export default function HomePage() {
  const router = useRouter();
  const { listings, categories, dbLoading } = useListings({ status: "available" });
  const { state } = useReloo();
  const { user } = useAuth();
  const guestLocation = state.guestLocation;

  const [heroQuery, setHeroQuery] = useState("");

  const survey = useMemo(() => getInterestSurvey(), []);
  const preferredSlugs = survey?.interestedCategories ?? [];
  const hasPersonalization = isSurveyCompleted();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("reloo-welcome-seen");
    if (!seen && !user) {
      router.replace("/welcome");
    }
  }, [user, router]);

  const activeAddress = useMemo(() => {
    if (guestLocation?.ward?.name && guestLocation?.province?.name) {
      return `${guestLocation.ward.name}, ${guestLocation.province.name}`;
    }
    if (guestLocation?.province?.name) return guestLocation.province.name;
    return user?.address || DEFAULT_ADDRESS;
  }, [guestLocation, user]);

  const displayLocation = guestLocation?.ward?.name
    ? guestLocation.ward.name
    : guestLocation?.province?.name || extractDistrict(activeAddress);

  const available = useMemo(
    () => listings.filter((l) => l.status === "available"),
    [listings]
  );

  const personalizedCategories = useMemo(
    () => rankCategoriesWithPreferences(categories, available, preferredSlugs),
    [categories, available, preferredSlugs],
  );

  const heroQuickSearches = useMemo(
    () => getPersonalizedQuickSearches(preferredSlugs),
    [preferredSlugs],
  );

  const nearby = useMemo(() => {
    const withKm = available.map((l) => ({
      ...l,
      _km: distanceKm(activeAddress, l.location) ?? 99,
    }));
    return sortListingsByPreferences(withKm, preferredSlugs, (a, b) => a._km - b._km).slice(
      0,
      8,
    );
  }, [available, activeAddress, preferredSlugs]);

  const forYou = useMemo(() => {
    if (!hasPersonalization || !preferredSlugs.length) return [];
    return sortListingsByPreferences(
      available.filter((l) => preferredSlugs.includes(l.category)),
      preferredSlugs,
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ).slice(0, 8);
  }, [available, preferredSlugs, hasPersonalization]);

  const recent = useMemo(
    () =>
      sortListingsByPreferences(available, preferredSlugs, (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt),
      ).slice(0, 8),
    [available, preferredSlugs],
  );

  const boosted = useMemo(
    () => available.filter((l) => l.isBoosted).slice(0, 4),
    [available]
  );

  const heroRotatingLines = useMemo(() => buildHeroRotatingLines(), []);

  const locationShortLabel = useMemo(() => {
    if (guestLocation?.province?.name) {
      return guestLocation.province.name.replace(/^Thành phố\s+/i, "TP. ");
    }
    return "TP. Hồ Chí Minh";
  }, [guestLocation]);

  const heroLongestLine = useMemo(
    () =>
      heroRotatingLines.reduce(
        (a, b) => (a.length >= b.length ? a : b),
        heroRotatingLines[0] ?? "",
      ),
    [heroRotatingLines],
  );

  function handleHeroSearch(q) {
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  }

  return (
    <MarketplaceShell>
      <HomeMobileHero
        locationLabel={locationShortLabel}
        onSearch={handleHeroSearch}
      />

      <section className="hero-band hero-band--desktop">
        <div className="hero-band__decor" aria-hidden="true" />
        <div className="container hero-band__inner">
          <div className="hero-band__copy">
            <span className="hero-band__eyebrow">
              <BadgeCheck size={14} /> Sàn cho thuê P2P có {USER_TERMS.GREEN_AUDIT} &amp;{" "}
              {USER_TERMS.NFT_PASSPORT}
            </span>
            <h1 className="hero-band__title hero-band__title--tagline">
              <span className="hero-band__title-sizer" aria-hidden="true">
                {HERO_TITLE_LEAD} {heroLongestLine}
              </span>
              <span className="hero-band__title-live">
                <span className="hero-band__title-lead">{HERO_TITLE_LEAD} </span>
                <span className="hero-band__title-accent">
                  <HeroTypewriterLine lines={heroRotatingLines} inline />
                </span>
              </span>
            </h1>
            <p className="hero-band__sub">
              Máy ảnh, camping, thời trang, Mẹ &amp; Bé — có sẵn gần nhà bạn.
              Thanh toán VietQR, bảo chứng minh bạch, kiểm tra tình trạng trước giao.
            </p>

            <SearchBox
              variant="hero"
              value={heroQuery}
              onChange={setHeroQuery}
              onSearch={handleHeroSearch}
              showSubmitButton
              className="hero-band__search-wrap"
            />

            <HomeBookingCard
              locationLabel={locationShortLabel}
              onSearch={handleHeroSearch}
              className="hero-band__booking-card"
            />
          </div>

          <aside className="hero-band__panel" aria-label="Điểm nổi bật RELOO">
            {HERO_HIGHLIGHTS.map((item) => {
              const IconEl = item.icon;
              return (
                <div key={item.title} className="hero-band__card">
                  <span className="hero-band__card-icon">
                    <IconEl size={18} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </aside>
        </div>
      </section>

      <section className="section section--compact section--categories container">
        <CategoryRow categories={personalizedCategories} />
      </section>

      <TrustBenefitsCarousel />

      <section className="section container home-for-you home-feed">
        <div className="section__header section__header--ct">
          <div>
            <Link href="/explore" className="section__title-link">
              <h2>Gợi ý cho bạn</h2>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            {hasPersonalization && (
              <p className="section__subtitle">Theo sở thích của bạn</p>
            )}
          </div>
        </div>
        <div className="home-quick-tags">
          {(hasPersonalization ? heroQuickSearches : HERO_QUICK_SEARCHES_FALLBACK).map(
            (term) => (
              <button
                key={term}
                type="button"
                className="home-quick-tags__pill"
                onClick={() => handleHeroSearch(term)}
              >
                {term}
              </button>
            ),
          )}
        </div>
        {forYou.length > 0 && (
          <ListingGrid
            listings={forYou}
            viewerAddress={activeAddress}
            layout="carousel"
          />
        )}
        <div className="section__footer">
          <Link href="/explore" className="section__more">
            Xem thêm
          </Link>
        </div>
      </section>

      <section className="section container home-feed">
        <div className="section__header section__header--ct">
          <div>
            <Link href="/explore" className="section__title-link">
              <h2>Gần bạn ở {displayLocation}</h2>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <p className="section__subtitle">Sắp xếp theo khoảng cách</p>
          </div>
        </div>
        <ListingGrid
          listings={nearby}
          viewerAddress={activeAddress}
          layout="carousel"
        />
        <div className="section__footer">
          <Link href="/explore" className="section__more">
            Xem thêm
          </Link>
        </div>
      </section>

      <PopularAreasRow />

      {boosted.length > 0 && (
        <section className="section container home-feed">
          <div className="section__header section__header--ct">
            <div>
              <Link href="/explore" className="section__title-link">
                <h2>Tin nổi bật</h2>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
              <p className="section__subtitle">Được gợi ý bởi RELOO</p>
            </div>
          </div>
          <ListingGrid
            listings={boosted}
            viewerAddress={activeAddress}
            layout="carousel"
          />
          <div className="section__footer">
            <Link href="/explore" className="section__more">
              Xem thêm
            </Link>
          </div>
        </section>
      )}

      <section className="section container home-feed">
        <div className="section__header section__header--ct">
          <div>
            <Link href="/explore?sort=newest" className="section__title-link">
              <h2>Tin mới đăng</h2>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <p className="section__subtitle">Cập nhật liên tục quanh khu vực bạn</p>
          </div>
        </div>
        <ListingGrid
          listings={recent}
          viewerAddress={activeAddress}
          layout="carousel"
        />
        <div className="section__footer">
          <Link href="/explore?sort=newest" className="section__more">
            Xem thêm
          </Link>
        </div>
      </section>

      <section className="how-band how-band--mioto">
        <div className="container">
          <div className="how-band__head">
            <div>
              <h2>Hướng dẫn thuê đồ</h2>
              <p className="text-muted">
                Chỉ với 4 bước đơn giản để trải nghiệm thuê trên RELOO nhanh chóng
              </p>
            </div>
          </div>
          <div className="how-band__grid how-band__grid--mioto">
            <div className="how-card how-card--mioto">
              <div className="how-card__num">01</div>
              <Search size={20} className="how-card__ic" />
              <h4>Đặt thuê trên RELOO</h4>
              <p>Chọn đồ, ngày thuê và hình thức giao nhận trên app/web.</p>
            </div>
            <div className="how-card how-card--mioto">
              <div className="how-card__num">02</div>
              <Wallet size={20} className="how-card__ic" />
              <h4>Nhận đồ</h4>
              <p>Đối chiếu CCCD gốc · Green Audit khi bàn giao tài sản.</p>
            </div>
            <div className="how-card how-card--mioto">
              <div className="how-card__num">03</div>
              <ShieldCheck size={20} className="how-card__ic" />
              <h4>Sử dụng &amp; bảo quản</h4>
              <p>Dùng đúng mục đích — Reloo Care hỗ trợ rủi ro ngoài ý muốn.</p>
            </div>
            <div className="how-card how-card--mioto">
              <div className="how-card__num">04</div>
              <Clock3 size={20} className="how-card__ic" />
              <h4>Trả đồ &amp; hoàn ký quỹ</h4>
              <p>Green Audit trả đồ — ký quỹ hoàn về sau đối chiếu bằng chứng.</p>
            </div>
          </div>
        </div>
      </section>

      <ServiceModeCards />

      <section className="section section--compact container">
        <div className="cta-band">
          <div className="cta-band__body">
            <span className="cta-band__eyebrow">Dành cho chủ đồ</span>
            <h3>Đồ ít dùng trong nhà? Cho thuê để sinh lời</h3>
            <p>
              Đăng tin miễn phí. Phí sàn chỉ 15% khi có đơn thành công. Thu nhập rút về
              ngân hàng liên kết.
            </p>
          </div>
          <div className="cta-band__actions">
            <Link href="/auth/register" className="btn btn-primary">
              Mở tài khoản chủ đồ
            </Link>
            <Link href="/cms/about" className="btn btn-ghost">
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </section>
    </MarketplaceShell>
  );
}
