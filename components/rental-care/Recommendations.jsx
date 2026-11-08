"use client";
import {discoveryFeed} from '@/lib/discovery-feed';
import {rankProducts} from '@/lib/personalization/domain';
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ListingImage } from "@/components/listings/ListingImage";
import { careText } from "@/lib/rental-care/content";
import { text as categoryText } from "@/lib/neighborhood/content";
import { usePersonalization, careFetch } from "./PersonalizationProvider";
import "./rental-care.css";
import { RecommendationControls } from "./RecommendationControls";
export function usePersonalizedProducts(items, context = {}) {
  const {
      actor,
      epoch,
      revision,
      signalRevision,
      rankingWindow,
      configurationRevision,
      enabled,guestCategories=[],exclusions=[],categories=[],
    } = usePersonalization(),
    [response, setResponse] = useState(null),
    [refresh, bump] = useState(0);
  const key = JSON.stringify({
    actor,
    epoch,
    revision,
    configurationRevision,
    signalRevision,
    rankingWindow,
    enabled,guestCategories,exclusions,categories,
    ids: items.map((i) => i.id),
    context,
    refresh,
  });
  useEffect(() => {
    const request = JSON.parse(key);
    if (!request.actor || (!request.enabled&&!request.categories?.length) || request.ids.length > 300) return;
    const controller = new AbortController();
    let live = true;
    careFetch(
      "/api/personalization",
      {
        subject: request.actor,
        action: "recommend",
        ids: request.ids,
        ...request.context,
      },
      controller.signal,
    )
      .then((data) => {
        if (live) setResponse({ key, data });
      })
      .catch((error) => {
        if (live && error.name !== "AbortError")
          setResponse({
            key,
            data: { items: [], recent: [], eligibleIds: [], error: "service" },
          });
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [key]);
  const data = response?.key === key ? response.data : null;
  const ordered = useMemo(()=>{const suggestions=data?.items||(!actor&&guestCategories.length?rankProducts(items,{enabled:false,manualCategories:guestCategories},0,items.length).items:[]);return discoveryFeed(items,suggestions,actor?exclusions:[]);},[items,data,actor,guestCategories,exclusions]);
  const baseItems=useMemo(()=>discoveryFeed(items,[],actor?exclusions:[]),[items,actor,exclusions]);
  return {
    items: ordered,baseItems,
    recommended: data?.items || [],
    recent: data?.recent || [],
    personalized: !!data?.enabled,
    ready: !!data||!actor||(!enabled&&!categories.length),
    error: data?.error,
    refresh: () => bump((n) => n + 1),
  };
}
export function Recommendations({
  items = [],
  province,
  locale = "vi-VN",
  category,
  start,
  end,
  allowGlobal = false,
}) {
  const { actor, enabled, signedIn, available,guestCategories=[],manualCategories=[] } = usePersonalization(),
    results = usePersonalizedProducts(items, {
      allowGlobal,
      ...(province ? { province } : {}),
      ...(category ? { category } : {}),
      ...(start && end ? { start, end } : {}),
    });
  const t = (k) => careText(locale, k),
    fallback = items
      .filter((i) => i.status === "available" && !i.isBoosted),
    list = actor ? results.recommended : rankProducts(fallback,{enabled:false,manualCategories:guestCategories},0,4).items;
  const label =
    results.personalized && list.some((i) => i.reason === "interest")
      ? "forYou"
      : province
        ? "area"
        : "explore";
  if (
    (!enabled&&!guestCategories.length&&!manualCategories?.length) ||
    available === false ||
    (signedIn && !actor) ||
    (!items.length && !allowGlobal)
  )
    return null;
  if (actor && !results.ready)
    return (
      <section className="rc-recommendations" role="status">
        {t("loading")}
      </section>
    );
  if (results.error)
    return (
      <section className="rc-recommendations" role="alert">
        <p>{t("service")}</p>
        <button className="rc-secondary" onClick={results.refresh}>
          {t("retry")}
        </button>
      </section>
    );
  if (!list.length && !results.recent.length) return null;
  const cards = (rows) => (
    <div className="rc-reco-grid">
      {rows.map((item) => (
        <article data-analytics-asset={item.id} data-analytics-placement="recommendation" className="rc-reco-card" key={item.id}>
          <Link href={"/product/" + encodeURIComponent(item.id)}>
            <ListingImage
              images={item.images}
              alt={item.title}
              loading="lazy"
              fallbackLabel={t("imageUnavailable")}
              loadingLabel={t("loadingImage")}
            />
            <div className="rc-reco-body">
              <h3>{item.title}</h3>
              <strong>
                {new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency: "VND",
                  maximumFractionDigits: 0,
                }).format(
                  item.transactionMode === "SALE"
                    ? item.salePrice
                    : item.dailyPrice,
                )}
              </strong>{" "}
              {item.transactionMode === "SALE"
                ? t("salePrice")
                : "/ " + t("days")}
              <small>
                {item.reason === "interest"
                  ? t("interest") +
                    " " +
                    categoryText(locale, "category:" + item.category)
                  : t(enabled ? "discoveryHint" : "context")}
              </small>
              <small>
                {item.deposit != null &&
                Number.isFinite(Number(item.deposit)) &&
                Number(item.deposit) >= 0
                  ? t("deposit") +
                    ": " +
                    new Intl.NumberFormat(locale).format(item.deposit) +
                    " ₫"
                  : t("depositCheck")}
              </small>
            </div>
          </Link>
          <RecommendationControls
            asset={item.id}
            owner={item.ownerId}
            category={item.category}
            locale={locale}
            onChanged={results.refresh}
          />
        </article>
      ))}
    </div>
  );
  return (
    <section className="rc-recommendations" lang={locale}>
      <div className="rc-reco-head">
        <div>
          <h2>{t(label)}</h2>
          <p>
            {enabled && label === "forYou"
              ? t("interest") +
                " " +
                categoryText(
                  locale,
                  "category:" +
                    list.find((i) => i.reason === "interest").category,
                )
              : t(enabled ? "discoveryHint" : "context")}
          </p>
        </div>
        <Link href={"/account/personalization?lang=" + locale}>
          {t("settings")}
        </Link>
      </div>
      {cards(list.slice(0, 4))}
      {results.recent.length > 0 && (
        <>
          <h2>{t("recent")}</h2>
          <p>{t("recentHint")}</p>
          {cards(results.recent.slice(0, 4))}
        </>
      )}
    </section>
  );
}
