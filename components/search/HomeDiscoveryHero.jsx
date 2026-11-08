'use client';
import {useMemo,useState} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {ArrowRight,Package,CalendarDays,ShoppingBag,LayoutGrid,ChevronDown} from 'lucide-react';
import {useReloo} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {LocationChip} from '@/components/location/LocationChip';
import {RentalCalendar} from '@/components/booking/RentalCalendar';
import {listingMatchesProvince,listingMatchesWards} from '@/lib/listing-location';
import {homeDiscoveryHref,EMPTY_HOME_DATES} from '@/lib/search/home-discovery';
import {homeDiscoveryCopy} from '@/lib/i18n/home-discovery';
import {CATEGORY_GROUP_ORDER} from '@/lib/category-artwork';
import {getSpecGroupId} from '@/lib/category-specs';
import styles from './HomeDiscoveryHero.module.css';
export function HomeDiscoveryHero({embedded=false}){
 const Heading=embedded?'h2':'h1';
 const router=useRouter(),{state,actions,hydrated}=useReloo(),{locale}=useLocale(),t=homeDiscoveryCopy[locale]||homeDiscoveryCopy['vi-VN'];
 const [intent,setIntent]=useState('RENT'),[category,setCategory]=useState(''),[dates,setDates]=useState(EMPTY_HOME_DATES),[error,setError]=useState(''),[calendarSignal,setCalendarSignal]=useState(0);
 const priceListings=useMemo(()=>state.listings.filter(x=>(!category||getSpecGroupId(x.category)===category)&&(!state.guestLocation?.province?.name||(listingMatchesProvince(x,state.guestLocation.province.name)&&listingMatchesWards(x,state.guestLocation.wards)))),[state.listings,state.guestLocation,category]);
 function search(e){e.preventDefault();if(e.currentTarget.querySelector('dialog[open]'))return;setError('');try{const location=state.guestLocation;if(location?.ward&&!location.wards?.length)actions.setGuestLocation({...location,wards:[location.ward]});router.push(homeDiscoveryHref({intent,dates,location,category}));}catch{setError(intent==='LONG_RENT'?t.longInvalid:t.invalidDates);setCalendarSignal(n=>n+1);}}
 return <section className={styles.hero+' home-discovery-hero'} aria-label={t.intent}>
  <div className={styles.scene}><Image src="/images/refresh-20261018/campaign-rent-wide.webp" alt="" fill sizes="(max-width: 767px) 100vw, 94vw" preload/><div className={styles.shade}/><div className={styles.copy}><Heading>{t.title}<br/><em>{t.highlight}</em></Heading><p>{t.subtitle}</p></div></div>
  <div className={styles.panel}><div className={styles.modes} role="group" aria-label={t.intent}>{[['RENT',Package],['LONG_RENT',CalendarDays],['SALE',ShoppingBag]].map(([id,Icon])=><button type="button" key={id} aria-pressed={intent===id} onClick={()=>{setIntent(id);setError('')}}><Icon size={19}/>{t[id]}</button>)}</div>
   <form onSubmit={search} role="search" aria-label={t.intent} className={styles.form} data-intent={intent}><fieldset disabled={!hydrated} className={styles.fields}>
    <div className={styles.location}><span>{t.location}</span><div className={styles.locationControl}><LocationChip compact/><ChevronDown size={18} aria-hidden="true"/></div></div>
    {intent!=='SALE'&&<div className={styles.dates}><span>{t.dates}{intent==='LONG_RENT'?' · '+t.longHint:''}</span><RentalCalendar compact key={intent} value={dates} priceListings={priceListings} suggestedDays={intent==='LONG_RENT'?30:1} minimumDays={intent==='LONG_RENT'?30:1} onChange={v=>{setDates(v);setError('')}} openSignal={calendarSignal} showPrices={false}/></div>}
    <label className={styles.category}><span>{t.category}</span><div className={styles.categoryControl}><LayoutGrid size={21} aria-hidden="true"/><select value={category} onChange={e=>{setCategory(e.target.value);setError('')}} aria-label={t.category}><option value="">{t.allCategories}</option>{CATEGORY_GROUP_ORDER.map(id=><option key={id} value={id}>{t.categoryGroups[id]}</option>)}</select><ChevronDown size={18} aria-hidden="true"/></div></label>
    <button type="submit" className={styles.submit}>{intent==='SALE'?t.buy:t.search}<ArrowRight size={18}/></button>
   </fieldset>{error&&<p role="alert" className={styles.error}>{error}</p>}</form>
  </div>
 </section>;
}
