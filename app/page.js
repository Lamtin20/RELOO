"use client";
import {useMemo,useState} from "react";
import {MarketplaceShell} from "@/components/layout/MarketplaceShell";
import {MarketHome} from "@/components/mobile/MarketHome";
import {useListings,useReloo} from "@/lib/store";
import {listingDistanceKm} from "@/lib/utils";
export default function HomePage() {
  const { listings, categories, dbLoading } = useListings({
    status: "available",
  });
  const { state } = useReloo();
  const [mode, setMode] = useState("nearest");
  const location = state.guestLocation?.province?.name || "";
  const address = state.user?.address || location;
  const items = useMemo(() => {
    const available = listings.filter((item) => item.status === "available");
    if (mode === "newest")
      return [...available].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
    if (mode === "nearest")
      return [...available].sort(
        (a, b) =>
          (listingDistanceKm(a, address,state.guestLocation?.coords||state.guestLocation?.province?.coords) ?? Infinity) -
          (listingDistanceKm(b, address,state.guestLocation?.coords||state.guestLocation?.province?.coords) ?? Infinity) || new Date(b.createdAt)-new Date(a.createdAt),
      );
    return [...available].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }, [listings, mode, address,state.guestLocation]);

  return <MarketplaceShell><MarketHome categories={categories} items={items} address={address} dbLoading={dbLoading} mode={mode} setMode={setMode}/></MarketplaceShell>;
}
