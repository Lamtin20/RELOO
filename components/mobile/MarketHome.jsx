"use client";
import {SuperAppEntry} from '@/components/superapp/SuperAppEntry';
import {useState} from 'react';
import {superappCopy} from '@/lib/i18n/superapp';
import {homeDiscoveryHref} from '@/lib/search/home-discovery';
import {homeDiscoveryCopy} from '@/lib/i18n/home-discovery';
import {useLocale} from '@/components/settings/LocaleProvider';
import {homeDesignCopy} from '@/lib/i18n/home-design';

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Gift,
  Wallet,
  ShieldCheck,
  Store,
  ShoppingBag,
  Clock3,
  PackageCheck,
  Link2,
} from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import {RentalBenefits} from "@/components/listings/RentalBenefits";
import { MainCategories } from "@/components/listings/MainCategories";
import {NearbyNeedTeaser} from '@/components/listings/NearbyNeedTeaser';
import {NeighborhoodTeaser} from '@/components/neighborhood/NeighborhoodTeaser';
import {Recommendations,usePersonalizedProducts} from '@/components/rental-care/Recommendations';
import { CategorySheet } from "@/components/listings/CategorySheet";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { BannerPlacement } from "@/components/content/BannerPlacement";
import { useAuth,useReloo } from "@/lib/store";
import {
  MARKET_CHANNELS,
  matchesMarketChannel,
} from "@/lib/marketplace-channels";
export function MarketHome({
  categories,
  items,
  address,
  dbLoading,
  mode,
  setMode,
}) {
  const channel='ALL';const {state}=useReloo();
  const {locale}=useLocale(),homeCopy=homeDiscoveryCopy[locale]||homeDiscoveryCopy['vi-VN'];
  const design=homeDesignCopy[locale]||homeDesignCopy['vi-VN'];
  const sc=superappCopy[locale]||superappCopy['vi-VN'],[feedWindow,setFeedWindow]=useState({mode:null,count:24});
  const visibleCount=feedWindow.mode===mode?feedWindow.count:24;
  const { isAuthenticated } = useAuth();
  const personalized=usePersonalizedProducts(items);
  const filtered = [...new Map((mode==='suggested'?personalized.items:personalized.baseItems).filter((item) => matchesMarketChannel(item, channel)).map(item=>[item.id,item])).values()];
  return (
    <div className="market-home">
      <SuperAppEntry/>
      <Link className="market-see-all" href="/ban-do">{locale==='en-US'?'Explore the map':'Khám phá trên bản đồ'}<MorphIcon icon={ArrowUpRight} size={17}/></Link>
      <BannerPlacement placement="home_top"/>
      <section className="market-category-area">
        <header>
          <h2>{design.categories}</h2>
          <CategorySheet categories={categories} />
        </header>
        <MainCategories categories={categories} />
      </section>
      <Recommendations items={items}/>
      <section
        className="market-discover"
        aria-labelledby="market-discover-title"
      >
        <header>
          <div>
            <span>{design.discoverEyebrow}</span>
            <h2 id="market-discover-title">{design.discoverTitle}</h2>
          </div>
        </header>
        <nav className="market-channels" aria-label="Loại sản phẩm">
          {MARKET_CHANNELS.map((tab) => (
            <Link className="market-channel-link" key={tab.id} href={homeDiscoveryHref({intent:tab.id,location:state.guestLocation})}>
              <MorphIcon
                icon={
                  tab.id === "RENT"
                    ? Clock3
                    : tab.id === "SALE"
                      ? ShoppingBag
                      : tab.id === "BRAND"
                        ? Store
                        : tab.id === "AFFILIATE"
                          ? Link2
                          : PackageCheck
                }
                size={18}
              />
              {tab.id==='ALL'?homeCopy.allProducts:homeCopy[tab.id]}
            </Link>
          ))}
        </nav>
        <>
            <div className="market-sort">
              <p>
                {channel === "RENT"
                  ? "Dùng khi cần, trả khi xong"
                  : channel === "SALE"
                    ? "Món đồ mới cho kế hoạch của bạn"
                    : design.discoverIntro}
              </p>
              <label>
                <span className="sr-only">Sắp xếp sản phẩm</span>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="suggested">Gợi ý</option>
                  <option value="nearest">Gần bạn</option>
                  <option value="newest">Mới đăng</option>
                </select>
              </label>
            </div>
            {dbLoading && !items.length ? (
              <div
                className="native-listing-skeleton"
                role="status"
                aria-label="Đang tải sản phẩm"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <span />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            ) : (
              <ListingGrid
                listings={filtered.slice(0, visibleCount)}
                priceMode={channel === "SALE" ? "SALE" : null}
                viewerAddress={address}
                emptyTitle="Chưa có món đồ phù hợp"
                emptyDescription="Thử danh mục hoặc khu vực khác nhé."
              />
            )}
            {visibleCount<filtered.length?<button type="button" className="market-see-all" onClick={()=>setFeedWindow({mode,count:visibleCount+24})}>{sc.loadMore}<MorphIcon icon={ArrowRight} size={17}/></button>:filtered.length>0&&<p role="status" className="sa-note">{sc.end}</p>}
            <Link
              className="market-see-all"
              href={homeDiscoveryHref({intent:channel,location:state.guestLocation})}
            >
              Xem thêm{" "}
              {channel === "RENT"
                ? "đồ cho thuê"
                : channel === "SALE"
                  ? "đồ đang bán"
                  : "sản phẩm"}{" "}
              <MorphIcon icon={ArrowRight} size={17} />
            </Link>
          </>
      </section>
      <NearbyNeedTeaser/>
      <NeighborhoodTeaser/>
      <BannerPlacement placement="home_middle" />
      <div className="market-extras-grid">
      <section className="market-cashback">
        <span className="market-service-art">
          <MorphIcon icon={Gift} size={38} />
        </span>
        <div>
          <span>ƯU ĐÃI LIÊN KẾT</span>
          <h2>
            Mua đúng món,
            <br />
            thêm cơ hội hoàn tiền.
          </h2>
          <p>Xem điều kiện và ưu đãi trước khi mua tại đối tác.</p>
          <Link href="/cashback">
            Khám phá hoàn tiền <MorphIcon icon={ArrowRight} size={17} />
          </Link>
        </div>
      </section>
      <div className="market-service-pair">
        <section className="market-income">
          <MorphIcon icon={Wallet} size={30} />
          <h2>
            Đồ ít dùng,
            <br />
            thêm giá trị.
          </h2>
          <p>Theo dõi thu nhập từ hoạt động của bạn.</p>
          <Link
            href={
              isAuthenticated
                ? "/dashboard/cashflow"
                : "/auth?next=%2Fdashboard%2Fcashflow"
            }
          >
            Xem thu nhập <MorphIcon icon={ArrowUpRight} size={16} />
          </Link>
        </section>
        <section className="market-safety">
          <MorphIcon icon={ShieldCheck} size={30} />
          <h2>
            Hiểu rõ,
            <br />
            an tâm hơn.
          </h2>
          <p>Kiểm tra hồ sơ và thỏa thuận trước giao dịch.</p>
          <Link href="/safety">
            Trung tâm an tâm <MorphIcon icon={ArrowUpRight} size={16} />
          </Link>
        </section>
      </div>
      </div>
      <RentalBenefits/>
      <BannerPlacement placement="home_bottom"/>
    </div>
  );
}
