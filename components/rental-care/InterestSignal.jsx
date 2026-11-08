"use client";
import { useEffect } from "react";
import { usePersonalization } from "./PersonalizationProvider";
export function InterestSignal({ asset, kind = "VIEW" }) {
  const { record, enabled } = usePersonalization();
  useEffect(() => {
    if (!asset || !enabled) return;
    record(kind, { asset });
    if (kind !== "VIEW") return;
    let active = 0,
      last = performance.now(),
      engaged = false;
    const timer = setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === "visible" && document.hasFocus())
        active += Math.min(2000, now - last);
      last = now;
      if (active >= 12000 && !engaged) {
        engaged = true;
        record("ENGAGED_VIEW", {
          asset,
          activeSeconds: Math.min(120, Math.floor(active / 1000)),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [asset, kind, record, enabled]);
  return null;
}
export function SearchInterestSignal({ query, category, filterKey }) {
  const { record } = usePersonalization();
  useEffect(() => {
    if (query) record("SEARCH", { query });
    if (category) record("CATEGORY", { category });
    if (category && filterKey) record("FILTER", { category });
  }, [query, category, filterKey, record]);
  return null;
}
