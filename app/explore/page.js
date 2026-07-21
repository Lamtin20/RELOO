"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, MapPin, Navigation } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { CategoryPills } from "@/components/listings/CategoryPills";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { SearchBox } from "@/components/search/SearchBox";
import {
  ExploreLocationSheet,
  EXPLORE_DEFAULT_RADIUS,
} from "@/components/location/ExploreLocationSheet";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { buildLocationAddress, formatProvinceFilterLabel, listingMatchesProvince, listingMatchesWards } from "@/lib/listing-location";
import { fetchWards } from "@/lib/vn-address";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { listingDistanceKm } from "@/lib/utils";
import { setLastViewedCategory } from "@/lib/search-history";

const SORT_OPTIONS = [
  { value: "nearest", label: "Gần nhất" },
  { value: "featured", label: "Nổi bật" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "rating", label: "Đánh giá cao nhất" },
  { value: "newest", label: "Mới nhất" },
];

const DEFAULT_ADDRESS = "Quận 1, TP.HCM";

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, actions } = useReloo();
  const { user } = useAuth();
  const guestLocation = state.guestLocation;
  const geo = useGeolocation();

  const categorySlug = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") || "";
  const locParam = searchParams.get("loc") || "";
  const locMode = searchParams.get("locMode") || "current";
  const radiusParam = searchParams.get("radius") || String(EXPLORE_DEFAULT_RADIUS);
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
  const [radius, setRadius] = useState(Number(radiusParam) || EXPLORE_DEFAULT_RADIUS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const priceDebounceRef = useRef(null);
  const geoInitRef = useRef(false);
  const wardsInitRef = useRef(false);

  const sort = sortParam || "nearest";

  useEffect(() => setSearchInput(q), [q]);
  useEffect(() => {
    if (categorySlug) setLastViewedCategory(categorySlug);
  }, [categorySlug]);
  useEffect(() => setMinPrice(searchParams.get("min") || ""), [searchParams]);
  useEffect(() => setMaxPrice(searchParams.get("max") || ""), [searchParams]);
  useEffect(() => {
    setRadius(Number(radiusParam) || EXPLORE_DEFAULT_RADIUS);
  }, [radiusParam]);

  useEffect(() => {
    if (geoInitRef.current) return;
    if (locMode !== "current") return;
    if (guestLocation?.province) return;
    geoInitRef.current = true;
    let cancelled = false;
    (async () => {
      const nearest = await geo.request();
      if (!cancelled && nearest) {
        actions.setGuestLocation({ province: nearest, ward: null, wards: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locMode, guestLocation?.province, geo, actions]);

  useEffect(() => {
    if (wardsInitRef.current) return;
    if (locMode !== "province" || !wardsParam || !guestLocation?.province?.code) return;
    if (guestLocation?.wards?.length) return;

    wardsInitRef.current = true;
    let cancelled = false;
    const codes = wardsParam.split(",").filter(Boolean);

    fetchWards(guestLocation.province.code).then((allWards) => {
      if (cancelled) return;
      const selected = allWards.filter((w) => codes.includes(String(w.code)));
      if (selected.length) {
        actions.setGuestLocation({ ...guestLocation, wards: selected, ward: null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [locMode, wardsParam, guestLocation, actions]);

  const { listings, categories, dbLoading } = useListings({
    category: categorySlug || undefined,
    search: q || undefined,
    status: "available",
  });

  const provinceName =
    locMode === "province"
      ? guestLocation?.province?.name || locParam
      : null;

  const anchorAddress = useMemo(() => {
    if (locMode === "province" && provinceName) return provinceName;
    return buildLocationAddress(guestLocation, locParam || defaultAddress);
  }, [locMode, provinceName, guestLocation, locParam, defaultAddress]);

  const displayLabel = useMemo(() => {
    if (locMode === "province" && provinceName) {
      return formatProvinceFilterLabel(guestLocation?.province, guestLocation?.wards);
    }
    if (guestLocation?.ward?.name && guestLocation?.province?.name) {
      return `${guestLocation.ward.name}, ${guestLocation.province.name}`;
    }
    if (guestLocation?.province?.name) {
      return `Vị trí hiện tại · ${guestLocation.province.name}`;
    }
    return "Chọn khu vực";
  }, [locMode, provinceName, guestLocation]);

  const filtered = useMemo(() => {
    let result = listings.map((listing) => ({
      ...listing,
      _km: listingDistanceKm(listing, anchorAddress) ?? 999,
    }));

    if (locMode === "province") {
      result = result.filter((l) => listingMatchesProvince(l, provinceName));
      result = result.filter((l) => listingMatchesWards(l, guestLocation?.wards));
    } else {
      result = result.filter((l) => l._km <= radius);
    }

    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min != null && !Number.isNaN(min)) result = result.filter((l) => l.dailyPrice >= min);
    if (max != null && !Number.isNaN(max)) result = result.filter((l) => l.dailyPrice <= max);

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
        result.sort((a, b) => a.dailyPrice - b.dailyPrice);
        break;
      case "price_desc":
        result.sort((a, b) => b.dailyPrice - a.dailyPrice);
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
  }, [listings, anchorAddress, locMode, provinceName, guestLocation?.wards, radius, minPrice, maxPrice, sort]);

  function updateParams(updates) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value != null && value !== "") params.set(key, String(value));
      else params.delete(key);
    });
    const qs = params.toString();
    router.push(`/explore${qs ? `?${qs}` : ""}`);
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

  function handleLocationApply({ mode, location, radius: nextRadius, address }) {
    if (location?.province) {
      actions.setGuestLocation(location);
    }

    const updates = {
      locMode: mode,
      loc: mode === "province" ? location?.province?.name || address : address || "",
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

  const resultSubtitle =
    locMode === "province"
      ? `${filtered.length} sản phẩm tại ${provinceName || "khu vực đã chọn"}${wardFilterLabel}`
      : `${filtered.length} sản phẩm trong bán kính ${radius} km`;

  const emptyDescription =
    locMode === "province"
      ? guestLocation?.wards?.length
        ? `Không tìm thấy tin tại các phường/xã đã chọn trong “${provinceName}”. Hãy chọn thêm phường/xã hoặc chọn “Tất cả”.`
        : `Không tìm thấy tin tại “${provinceName}”. Hãy chọn tỉnh thành khác hoặc dùng vị trí hiện tại.`
      : `Không tìm thấy tin trong bán kính ${radius} km quanh “${anchorAddress}”. Hãy tăng bán kính hoặc đổi khu vực tìm kiếm.`;

  return (
    <MarketplaceShell>
      <div className="explore-header container">
        <h1>Khám phá</h1>
        <p className="text-muted">
          {resultSubtitle}
          {q && <> cho “{q}”</>}
        </p>
        <SearchBox
          variant="explore"
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearchQuery}
          showSubmitButton
          submitLabel="Tìm"
          className="explore-search-wrap"
        />
      </div>

      <div className="explore-categories">
        <div className="container">
          <CategoryPills
            variant="scroll"
            categories={categories}
            activeSlug={categorySlug}
            getHref={buildCategoryHref}
          />
        </div>
      </div>

      <div
        className={`explore-location container ${locMode === "province" ? "explore-location--province" : ""}`}
      >
        <div className="explore-loc-field">
          <label htmlFor="explore-loc-trigger">Vị trí tìm kiếm</label>
          <div className="explore-loc-input-wrap">
            <button
              id="explore-loc-trigger"
              type="button"
              className="explore-loc-trigger"
              onClick={() => setSheetOpen(true)}
            >
              <MapPin size={16} className="explore-loc-trigger__ic" />
              <span className="explore-loc-trigger__text">{displayLabel}</span>
              <ChevronDown size={16} className="explore-loc-trigger__chev" />
            </button>
            <button
              type="button"
              className="explore-loc-trigger__gps"
              onClick={refreshToCurrent}
              title="Dùng vị trí hiện tại"
              aria-label="Dùng vị trí hiện tại"
            >
              <Navigation size={14} />
            </button>
          </div>
        </div>

        {locMode === "current" && (
          <div className="explore-radius-field">
            <label htmlFor="explore-radius">Bán kính tìm kiếm</label>
            <div className="explore-radius-control">
              <span className="explore-radius-badge">{radius} km</span>
              <input
                id="explore-radius"
                type="range"
                min={1}
                max={50}
                step={1}
                value={radius}
                onChange={(e) => handleRadiusChange(e.target.value)}
                className="explore-radius-slider"
                style={{ "--radius-pct": `${((radius - 1) / 49) * 100}%` }}
              />
              <div className="explore-radius-scale">
                <span>1</span>
                <span>50</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <ExploreLocationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={{ mode: locMode, location: guestLocation }}
        radius={radius}
        onApply={handleLocationApply}
      />

      <div className="explore-toolbar container">
        <div className="explore-filters">
          <div className="explore-price-filter">
            <input
              type="number"
              min="0"
              placeholder="Giá từ"
              value={minPrice}
              onChange={(e) => handlePriceChange("min", e.target.value)}
              className="input-compact"
            />
            <span>-</span>
            <input
              type="number"
              min="0"
              placeholder="Giá đến"
              value={maxPrice}
              onChange={(e) => handlePriceChange("max", e.target.value)}
              className="input-compact"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="select-compact"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 64 }}>
        {dbLoading ? (
          <div className="db-loading" aria-label="Đang tải sản phẩm">
            <div className="dashboard-spinner" />
          </div>
        ) : (
          <ListingGrid
            listings={filtered}
            viewerAddress={anchorAddress}
            emptyTitle="Không có sản phẩm gần bạn"
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
      <ExploreContent />
    </Suspense>
  );
}
