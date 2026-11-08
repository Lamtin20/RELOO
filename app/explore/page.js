"use client";
import {PartnerDiscovery} from '@/components/search/PartnerDiscovery';


import Link from 'next/link';
import {useLocale} from '@/components/settings/LocaleProvider';
import {discoveryCopy} from '@/lib/i18n/discovery';
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, MapPin, Navigation, X } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import {DiscoveryIntent} from '@/components/search/DiscoveryIntent';
import { ExploreFilters } from "@/components/search/ExploreFilters";
import { CategorySheet } from "@/components/listings/CategorySheet";
import { CategoryPills } from "@/components/listings/CategoryPills";
import {locationLabel} from '@/lib/location-label';
import {ExploreResultsMap} from '@/components/location/ExploreResultsMap';
import { ListingGrid } from "@/components/listings/ListingGrid";
import { SearchBox } from "@/components/search/SearchBox";
import {
  ExploreLocationSheet,
  EXPLORE_DEFAULT_RADIUS,
} from "@/components/location/ExploreLocationSheet";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useSavedListings } from "@/lib/hooks/useSavedListings";
import {
  buildLocationAddress,
  formatProvinceFilterLabel,
  listingMatchesProvince,
  listingMatchesWards,
} from "@/lib/listing-location";
import { fetchWards } from "@/lib/vn-address";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { listingDistanceKm } from "@/lib/utils";
import { setLastViewedCategory } from "@/lib/search-history";
import { getSpecGroupId } from "@/lib/category-specs";
import { CATEGORY_MAIN_LABELS } from "@/lib/category-artwork";
import { rentalDays } from "@/lib/rental-estimate";
import {calendarRange} from '@/lib/rental-calendar';
import {Recommendations,usePersonalizedProducts} from '@/components/rental-care/Recommendations';
import {SearchInterestSignal} from '@/components/rental-care/InterestSignal';

const SORT_OPTIONS = [
  { value: "nearest", label: "Gần nhất" },
  { value: "featured", label: "Nổi bật" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "rating", label: "Đánh giá cao nhất" },
  { value: "newest", label: "Mới nhất" },
];

const DEFAULT_ADDRESS = "";

function ExploreEntry(){const params=useSearchParams(),channel=params.get('channel');return ['BRAND','AFFILIATE'].includes(channel)?<PartnerDiscovery channel={channel}/>:<ExploreContent/>;}
function ExploreContent() {
  const router = useRouter();
  const {locale}=useLocale(),copy=discoveryCopy[locale]||discoveryCopy["vi-VN"];
  const searchParams = useSearchParams();
  const { state, actions } = useReloo();
  const { user } = useAuth();
  const guestLocation = state.guestLocation;
  const geo = useGeolocation();
  const { savedIds } = useSavedListings();
  const savedOnly = searchParams.get("saved") === "1";

  const categorySlug = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";
  const estimatedDays = rentalDays(searchParams.get("days"));
  const selectedRental={startDate:searchParams.get('start')||'',endDate:searchParams.get('end')||'',startTime:searchParams.get('pickupTime')||'',endTime:searchParams.get('returnTime')||''};
  const sortParam = searchParams.get("sort") || "";
  const locParam = searchParams.get("loc") || "";
  const locMode = searchParams.get("locMode") || "current";
  const radiusParam =
    searchParams.get("radius") || String(EXPLORE_DEFAULT_RADIUS);
  const wardsParam = searchParams.get("wards") || "";

  const defaultAddress = useMemo(() => {
    if (guestLocation?.ward?.name && guestLocation?.province?.name) {
      return `${guestLocation.ward.name}, ${guestLocation.province.name}`;
    }
    if (guestLocation?.province?.name) return guestLocation.province.name;
    return user?.address || DEFAULT_ADDRESS;
  }, [guestLocation, user]);

  const [searchInput, setSearchInput] = useState(q);
  const [minPrice, setMinPrice] = useState(searchParams.get("min") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max") || "");
  const [radius, setRadius] = useState(
    Number(radiusParam) || EXPLORE_DEFAULT_RADIUS,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const priceDebounceRef = useRef(null);

  const wardsInitRef = useRef(false);

  const sort = sortParam || "nearest";

  useEffect(() => {
    const timer = setTimeout(() => setSearchInput(q), 0);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    if (categorySlug) setLastViewedCategory(categorySlug);
  }, [categorySlug]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinPrice(searchParams.get("min") || "");
      setMaxPrice(searchParams.get("max") || "");
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);
  useEffect(() => {
    const timer = setTimeout(
      () => setRadius(Number(radiusParam) || EXPLORE_DEFAULT_RADIUS),
      0,
    );
    return () => clearTimeout(timer);
  }, [radiusParam]);



  useEffect(() => {
    if (wardsInitRef.current) return;
    if (locMode !== "province" || !wardsParam || !guestLocation?.province?.code)
      return;
    if (guestLocation?.wards?.length) return;

    wardsInitRef.current = true;
    let cancelled = false;
    const codes = wardsParam.split(",").filter(Boolean);

    fetchWards(guestLocation.province.code).then((allWards) => {
      if (cancelled) return;
      const selected = allWards.filter((w) => codes.includes(String(w.code)));
      if (selected.length) {
        actions.setGuestLocation({
          ...guestLocation,
          wards: selected,
          ward: null,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [locMode, wardsParam, guestLocation, actions]);

  const { listings, allListings, categories, dbLoading } = useListings({
    category: categorySlug || undefined,
    search: q || undefined,
    status: "available",
  });

  const provinceName =
    locMode === "province" ? guestLocation?.province?.name || locParam : null;

  const anchorAddress = useMemo(() => {
    if (locMode === "province" && provinceName) return provinceName;
    return buildLocationAddress(guestLocation, locParam || defaultAddress);
  }, [locMode, provinceName, guestLocation, locParam, defaultAddress]);

  const displayLabel = useMemo(() => {
    if (locMode === "province" && provinceName) {
      return formatProvinceFilterLabel(
        guestLocation?.province,
        guestLocation?.wards,
    guestLocation?.coords,guestLocation?.province?.coords,geo.coords,
      );
    }
    if (guestLocation?.ward?.name && guestLocation?.province?.name) {
      return `${guestLocation.ward.name}, ${guestLocation.province.name}`;
    }
    if (guestLocation?.province?.name) {
      return `Vị trí hiện tại · ${guestLocation.province.name}`;
    }
    return "Chọn khu vực";
  }, [locMode, provinceName, guestLocation,geo.coords]);

  const filtered = useMemo(() => {
    let result = listings.map((listing) => ({
      ...listing,
      _km: listingDistanceKm(listing, anchorAddress,geo.coords||guestLocation?.coords||guestLocation?.province?.coords) ?? 999,
    }));
    const group = searchParams.get("group");
    if (group)
      result = result.filter((l) => getSpecGroupId(l.category) === group);
    const transaction = searchParams.get("transaction");
    if (transaction === "SALE")
      result = result.filter((l) =>
        ["SALE", "BOTH"].includes(l.transactionMode),
      );
    if (transaction === "RENT")
      result = result.filter((l) => l.transactionMode !== "SALE");
    const price = (l) =>
      transaction === "SALE" || l.transactionMode === "SALE"
        ? Number(l.salePrice)
        : l.dailyPrice;
    if (savedOnly)
      result = result.filter((listing) => savedIds.includes(listing.id));

    if (!savedOnly && locMode === "province") {
      result = result.filter((l) => listingMatchesProvince(l, provinceName));
      result = result.filter((l) =>
        listingMatchesWards(l, guestLocation?.wards),
      );
    } else if (!savedOnly && anchorAddress && searchParams.has("radius")) {
      result = result.filter((l) => l._km <= radius);
    }

    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min != null && !Number.isNaN(min))
      result = result.filter((l) => price(l) >= min);
    if (max != null && !Number.isNaN(max))
      result = result.filter((l) => price(l) <= max);

    const sorter = sort === "featured" ? "nearest" : sort;

    switch (sorter) {
      case "nearest":
        result.sort((a, b) => {
          if (a._km !== b._km) return a._km - b._km;
          if (a.isBoosted && !b.isBoosted) return -1;
          if (!a.isBoosted && b.isBoosted) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        break;
      case "price_asc":
        result.sort((a, b) => price(a) - price(b));
        break;
      case "price_desc":
        result.sort((a, b) => price(b) - price(a));
        break;
      case "rating":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    return result;
  }, [
    searchParams,
    listings,
    anchorAddress,
    locMode,
    provinceName,
    guestLocation?.wards,
    guestLocation?.coords,guestLocation?.province?.coords,geo.coords,
    radius,
    minPrice,
    maxPrice,
    sort,
    savedOnly,
    savedIds,
  ]);

  const personalized=usePersonalizedProducts(filtered,{...(locMode==='province'&&guestLocation?.province?.code?{province:String(guestLocation.province.code)}:{}),...(categorySlug?{category:categorySlug}:{})});
  function updateParams(updates) {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value != null && value !== "") params.set(key, String(value));
      else params.delete(key);
    });
    const qs = params.toString();
    router.push(`/explore${qs ? `?${qs}` : ""}`,{scroll:false});
  }

  function updateParam(key, value) {
    updateParams({ [key]: value });
  }

  function handleSearchQuery(term) {
    updateParam("q", term.trim());
  }

  function handlePriceChange(key, value) {
    if (key === "min") setMinPrice(value);
    else setMaxPrice(value);
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => updateParam(key, value), 500);
  }

  function handleRadiusChange(value) {
    const next = Number(value);
    setRadius(next);
    updateParam("radius", next);
  }

  function handleLocationApply({
    mode,
    location,
    radius: nextRadius,
    address,
  }) {
    if (location?.province) {
      actions.setGuestLocation(location);
    }

    const updates = {
      locMode: mode,
      loc:
        mode === "province"
          ? location?.province?.name || address
          : address || "",
    };

    if (mode === "province") {
      updates.wards =
        location?.wards?.length > 0
          ? location.wards.map((w) => w.code).join(",")
          : "";
      updates.radius = "";
    } else {
      updates.wards = "";
      updates.radius = nextRadius ?? EXPLORE_DEFAULT_RADIUS;
    }

    updateParams(updates);
  }

  async function refreshToCurrent(e) {
    e?.stopPropagation?.();
    const nearest = await geo.request();
    if (nearest) {
      actions.setGuestLocation({ province: nearest, ward: null, wards: null });
      updateParams({
        locMode: "current",
        loc: nearest.name,
        radius: radius || EXPLORE_DEFAULT_RADIUS,
        wards: "",
      });
    }
  }

  function buildCategoryHref(slug) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("group");
    if (slug) params.set("category", slug);
    else params.delete("category");
    const qs = params.toString();
    return `/explore${qs ? `?${qs}` : ""}`;
  }

  const wardFilterLabel = useMemo(() => {
    const wards = guestLocation?.wards;
    if (!wards?.length) return "";
    if (wards.length === 1) return ` · ${wards[0].name}`;
    return ` · ${wards.length} phường/xã`;
  }, [guestLocation?.wards]);

  const resultSubtitle = savedOnly
    ? `${filtered.length} tin đã lưu`
    : locMode === "province"
      ? `${filtered.length} sản phẩm ${provinceName ? `tại ${provinceName}${wardFilterLabel}` : "trên toàn quốc"}`
      : `${filtered.length} sản phẩm gần khu vực của bạn`;

  const emptyDescription = savedOnly
    ? "Không có tin đã lưu phù hợp với bộ lọc hiện tại."
    : locMode === "province"
      ? guestLocation?.wards?.length
        ? `Không tìm thấy tin tại các phường/xã đã chọn trong “${provinceName}”. Hãy chọn thêm phường/xã hoặc chọn “Tất cả”.`
        : provinceName
          ? `Không tìm thấy tin tại “${provinceName}”. Hãy chọn tỉnh thành khác hoặc dùng vị trí hiện tại.`
          : "Thử từ khóa khác hoặc chọn khu vực để tìm đồ phù hợp."
      : `Chưa tìm thấy sản phẩm phù hợp quanh “${anchorAddress}”. Thử danh mục hoặc khu vực khác nhé.`;

  return (
    <MarketplaceShell>
      <DiscoveryIntent params={searchParams} count={filtered.length} loading={dbLoading&&!allListings.length} hasLocation={Boolean(anchorAddress)} groupLabel={CATEGORY_MAIN_LABELS[searchParams.get("group")]} categoryLabel={categories.find(c=>c.slug===categorySlug)?.name||categorySlug} onChange={updates=>{if('min' in updates||'max' in updates){clearTimeout(priceDebounceRef.current);if('min' in updates)setMinPrice(updates.min);if('max' in updates)setMaxPrice(updates.max);}updateParams(updates);}}/>
      <SearchInterestSignal query={q} category={categorySlug} filterKey={minPrice+':'+maxPrice+':'+estimatedDays}/>
      {searchParams.get("group") && (
        <div className="container explore-group-title">
          <span>{CATEGORY_MAIN_LABELS[searchParams.get("group")]}</span>
          <button
            type="button"
            className="market-group-reset"
            onClick={() => updateParams({ group: null })}
          >
            Xem mọi danh mục <X size={14} />
          </button>
        </div>
      )}
      <div className="explore-categories">
        <div className="container market-explore-category">
          <div className="market-explore-category__heading"><strong>Danh mục sản phẩm</strong>
          <CategorySheet
            categories={categories}
            hrefFor={(cat) => buildCategoryHref(cat.slug)}
          />
          </div>
          <CategoryPills
            variant="scroll"
            categories={categories}
            activeSlug={categorySlug}
            getHref={buildCategoryHref}
          />
        </div>
      </div>

      <div className="explore-controls container">
        <div className="explore-control-location">
          <label htmlFor="explore-loc-trigger">Khu vực tìm kiếm</label>
          <div className="explore-loc-input-wrap">
            <button
              id="explore-loc-trigger"
              type="button"
              className="explore-loc-trigger"
              onClick={() => setSheetOpen(true)}
            >
              <MapPin size={16} className="explore-loc-trigger__ic" />
              <span className="explore-loc-trigger__text">{locationLabel(displayLabel)}</span>
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              className="explore-loc-trigger__gps"
              onClick={refreshToCurrent}
              aria-label="Dùng vị trí hiện tại"
            >
              <Navigation size={16} />
            </button>
          </div>
        </div>
        <ExploreFilters
          minimumDays={searchParams.get("rentalPlan")==="LONG"?30:1}
          locationLabel={locationLabel(displayLabel)}
          onLocation={()=>setSheetOpen(true)}
          locationOpen={sheetOpen}
          group={searchParams.get('group')||''}
          query={q}
          rentalSelection={selectedRental}
          showTransaction={false}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sort={sort}
          transaction={searchParams.get("transaction") || ""}
          sortOptions={SORT_OPTIONS}
          onTransaction={(value) => updateParam("transaction", value)}
          onPrice={handlePriceChange}
          onSort={(value) => updateParam("sort", value)}
          onApply={(values) => {
            clearTimeout(priceDebounceRef.current);
            setMinPrice(values.min);
            setMaxPrice(values.max);
            updateParams({
              ...(values.q!==undefined?{q:values.q}:{}),
              ...(values.group!==undefined?{group:values.group,...(values.group!==searchParams.get('group')?{category:''}:{})}:{}),
              ...(values.calendar?{start:values.calendar.startDate,end:values.calendar.endDate,pickupTime:values.calendar.startTime,returnTime:values.calendar.endTime,days:calendarRange(values.calendar).days||''}:{}),
              min: values.min,
              max: values.max,
              sort: values.sort,
            });
          }}
        />
      </div>
      <ExploreLocationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={{ mode: locMode, location: guestLocation }}
        radius={radius}
        onApply={handleLocationApply}
      />
      {estimatedDays > 0 && searchParams.get("transaction")!=="SALE" && (
        <div className="container rental-estimate-notice">
          <CalendarDays size={18} />
          <div>
            <strong>Chi phí tham khảo cho {estimatedDays} ngày</strong>
            <span>
              Tính theo giá ngày trên tin đăng, chưa gồm tiền cọc và giao nhận.
              Lịch trống và giá cuối cùng do hai bên xác nhận.
            </span>
          </div>
          <button
            type="button"
            title="Bỏ thời lượng dự kiến"
            aria-label="Bỏ thời lượng dự kiến"
            onClick={() => updateParams({days:"",start:"",end:"",pickupTime:"",returnTime:""})}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="container" style={{ paddingBottom: 64 }}>
        <ExploreResultsMap listings={!sortParam?personalized.items:personalized.baseItems} rentalSelection={!calendarRange(selectedRental).error?selectedRental:null} sale={searchParams.get("transaction")==="SALE"}/>
        <Recommendations items={filtered} province={locMode==='province'&&guestLocation?.province?.code?String(guestLocation.province.code):undefined} category={categorySlug||undefined}/>
        {dbLoading && !allListings.length ? (
          <div className="db-loading" aria-label="Đang tải sản phẩm">
            <div className="dashboard-spinner" />
          </div>
        ) : (
          <ListingGrid
            rentalSelection={!calendarRange(selectedRental).error?selectedRental:null}
            listings={!sortParam?personalized.items:personalized.baseItems}
            estimatedDays={estimatedDays}
            priceMode={
              searchParams.get("transaction") === "SALE" ? "SALE" : null
            }
            viewerAddress={anchorAddress}
            emptyAction={<div className="di-empty-actions"><button type="button" className="btn btn-secondary" onClick={()=>{clearTimeout(priceDebounceRef.current);setMinPrice("");setMaxPrice("");updateParams({q:"",category:"",group:"",min:"",max:"",saved:"",days:"",sort:"",start:"",end:"",pickupTime:"",returnTime:""});}}>{copy.clear}</button><Link className="btn btn-primary" href="/needs">{copy.postNeed}</Link></div>}
            emptyTitle="Chưa tìm thấy đồ phù hợp"
            emptyDescription={emptyDescription}
          />
        )}
      </div>
    </MarketplaceShell>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreEntry />
    </Suspense>
  );
}
