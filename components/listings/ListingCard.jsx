"use client";

import {IntentLink as Link} from '@/components/mobile/IntentLink';
import {rentalPeriodRate} from '@/lib/rental-selection';
import {rentalSelectionCopy} from '@/lib/i18n/rental-selection';
import {useLocale} from '@/components/settings/LocaleProvider';
import {discoveryCopy} from '@/lib/i18n/discovery';
import { useState } from "react";
import { MapPin, Star, Sparkles } from "lucide-react";
import { Heart as HeartShape, HeartPlus as HeartPlusShape } from 'lucide';
import { MorphIcon } from '@/components/ui/MorphIcon';

import { useReloo } from "@/lib/store";
import { useSavedListings } from "@/lib/hooks/useSavedListings";
import { ListingImage } from "./ListingImage";
import { Money } from "@/components/ui";

import { rentalDays } from "@/lib/rental-estimate";
import {careText} from '@/lib/rental-care/content';
import {
  formatCondition,
  formatTimeAgo,
  distanceKm,
  formatDistance,
} from "@/lib/utils";

export function ListingCard({ listing, viewerAddress, estimatedDays = 0, priceMode=null, rentalSelection=null }) {
  const {locale}=useLocale(),t=discoveryCopy[locale]||discoveryCopy["vi-VN"];
  const days = rentalDays(estimatedDays),rate=rentalPeriodRate(listing),rt=rentalSelectionCopy[locale]||rentalSelectionCopy['vi-VN'];
  const sale = listing.transactionMode==='SALE'||priceMode==='SALE'&&Number(listing.salePrice)>0;
  const { state } = useReloo();
  const owner = state.users.find((u) => u.id === listing.ownerId);
  const { savedIds, toggleSaved } = useSavedListings();
  const liked = savedIds.includes(listing.id);
  const [now] = useState(() => Date.now());

  const km = viewerAddress ? distanceKm(viewerAddress, listing.location) : null;
  const age = now - new Date(listing.createdAt).getTime();
  const isNew = age >= 0 && age < 7 * 86400000;
  const isBoosted = listing.isBoosted;

  return (
    <article data-analytics-asset={listing.id} className="lc lc--polished">
      <div className="lc__media">
        <ListingImage
          images={listing.images}
          alt={listing.title}
          className="lc__image"
          loading="lazy"
        />

        <div className="lc__ribbons">
          {isBoosted && (
            <span className="lc__ribbon lc__ribbon--boost">
              <Sparkles size={11} /> {careText(locale,'sponsored')}
            </span>
          )}
          {isNew && !isBoosted && (
            <span className="lc__ribbon lc__ribbon--new">{t.new}</span>
          )}
        </div>

        {km != null && (
          <span className="lc__distance" title={t.approximate}>
            <MapPin size={11} /> {km===0?t.sameArea:`~ ${formatDistance(km)}`}
          </span>
        )}
      </div>

      <div className="lc__body">
        <div className="market-card-labels"><span className={`market-label ${listing.transactionMode==='SALE'?'market-label--sale':'market-label--rent'}`}>{listing.transactionMode==='SALE'?t.saleLabel:listing.transactionMode==='BOTH'?t.bothLabel:t.rentLabel}</span>{listing.localBrandName&&<span className="market-label market-label--brand">{listing.localBrandName}</span>}</div>
        <div className="lc__price-row">
          <Money amount={sale?listing.salePrice:rate.price} className="lc__price" />
          <span className="lc__price-unit">{sale?t.salePrice:'/ '+rt[rate.unit]}</span>
        </div>

        <h3 className="lc__title">{listing.title}</h3>
        {listing.transactionMode==='BOTH'&&<p className="lc__secondary-price">{sale?t.rent:t.sale} <Money amount={sale?rate.price:listing.salePrice}/>{sale?' / '+rt[rate.unit]:''}</p>}
        {days > 0 && !sale && (
          <p className="lc__estimate">
            <Money amount={Math.ceil(days/rate.days)*rate.price} />{" "}
            <span>/ {t.estimatedDays(days)}</span>
          </p>
        )}

        <div className="lc__location">
          <MapPin size={12} />
          <span>{listing.location||t.locationUnknown}</span>
        </div>

        <div className="lc__meta">
          {Number(listing.reviewCount)>0&&Number(listing.rating)>0?<span className="lc__rating">
            <Star size={12} />
            {(listing.rating ?? 0).toFixed(1)}
            <span className="lc__rating-count">
              ({listing.reviewCount ?? 0})
            </span>
          </span>:<span className="lc__unrated">{t.noReviews}</span>}
          <span className="lc__dot">·</span>
          <span className="lc__condition">
            {formatCondition(listing.condition)}
          </span>
        </div>

        <div className="lc__footer">
          {owner && (
            <div className="lc__owner">
              <img
                src={owner.avatar}
                alt={owner.name}
                className="lc__owner-avatar"
              />
              <div className="lc__owner-info">
                <span className="lc__owner-name">{owner.name}</span>
                <span className="lc__owner-ts">{t.contact}</span>
              </div>
            </div>
          )}
          <span className="lc__time">{formatTimeAgo(listing.createdAt)}</span>
        </div>
      </div>
      <Link warmOnView className="lc__open" href={`/product/${listing.id}${sale?'?intent=SALE':rentalSelection?'?'+new URLSearchParams({start:rentalSelection.startDate,end:rentalSelection.endDate,pickupTime:rentalSelection.startTime,returnTime:rentalSelection.endTime}):''}`} aria-label={listing.title}><span className="sr-only">{listing.title}</span></Link>
        <button
          type="button"
            data-analytics-action={liked?undefined:'SAVE_CLICK'} className={`lc__like ${liked ? "lc__like--on" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            toggleSaved(listing.id);
          }}
          aria-label={liked ? t.unsave : t.save}
          aria-pressed={liked}
          title={liked ? t.unsave : t.save}
        >
          <MorphIcon icon={liked ? HeartShape : HeartPlusShape} size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>


    </article>
  );
}
