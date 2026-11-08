"use client";
import {useMiniAppRouter} from '@/components/superapp/useMiniAppRouter';
import {mobileExperienceCopy} from '@/lib/i18n/mobile-experience';
import {useMemo,useState,useRef} from 'react';
import {MiniAppLink as Link} from '@/components/superapp/MiniAppLink';
import {useParams,useSearchParams} from 'next/navigation';
import {Heart,Share2,ArrowLeft,CalendarDays,ChevronRight,MapPin,MessageCircle,ShieldCheck,Star} from 'lucide-react';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {AccountStatusBanner} from '@/components/security/AccountStatusBanner';
import {EmptyState,Money} from '@/components/ui';
import {RelooLoading} from '@/components/ui/RelooLoading';
import {ProductGallery} from '@/components/listings/ProductGallery';
import {OwnerActiveListingsPanel} from '@/components/owner/OwnerActiveListingsPanel';
import {ListingAvailabilityBanner} from '@/components/listings/ListingAvailabilityBanner';
import {CategorySpecDisplay} from '@/components/listings/CategorySpecFields';
import {RentalHistory} from '@/components/listings/RentalHistory';
import {ProductDetailMeasurement} from '@/components/analytics/ProductAnalytics';
import {InterestSignal} from '@/components/rental-care/InterestSignal';
import {useAuth,useListings,useReloo} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {productDetailText} from '@/lib/i18n/product-detail';
import {LocationMap} from '@/components/location/LocationMap';
import {buildListingAvailability,getWaitlistForListing} from '@/lib/rental-availability';
import {CATEGORIES,LISTING_CONDITIONS,LISTING_STATUS} from '@/lib/constants';
import {useSavedListings} from '@/lib/hooks/useSavedListings';
import {rentalSelectionQuote,handoverOptions} from '@/lib/rental-selection';
import {RentalSelection} from '@/components/booking/RentalSelection';
import {rentalSelectionCopy} from '@/lib/i18n/rental-selection';
import {RentalDetailSections} from '@/components/listings/RentalDetailSections';
import {readRentalDetails} from '@/lib/listing-rental-details';
import {rentalDetailsCopy} from '@/lib/i18n/rental-details';
import './product-detail.css';

export default function ProductPage({initialListing=null}){
 const params=useParams(),search=useSearchParams(),router=useMiniAppRouter(),{user}=useAuth(),{state,actions}=useReloo();
 const {getListingById,getOwner,dbLoading,dbError,retryListings,allListings}=useListings();
 const {locale}=useLocale(),t=productDetailText[locale]||productDetailText['vi-VN'],mt=mobileExperienceCopy[locale]||mobileExperienceCopy['vi-VN'];
 const listing=getListingById(params.id)||initialListing,owner=listing?getOwner(listing.ownerId):null;
 const [contactError,setContactError]=useState(''),[contactPending,setContactPending]=useState(false);
 const {savedIds,toggleSaved}=useSavedListings();
 const [pickupTime,setPickupTime]=useState(search.get('pickupTime')||''),[returnTime,setReturnTime]=useState(search.get('returnTime')||''),[now]=useState(()=>Date.now());
 const [start,setStart]=useState(search.get('start')||''),[end,setEnd]=useState(search.get('end')||''),[delivery,setDelivery]=useState(search.get('delivery')==='deliver'?'deliver':'meet'),[shareNotice,setShareNotice]=useState('');
 const datesRef=useRef(null),[calendarSignal,setCalendarSignal]=useState(0);
 const methods=listing?handoverOptions(listing):{meet:true},selectedDelivery=methods[delivery]?delivery:methods.meet?'meet':'deliver';
 let estimate=null;try{estimate=listing?rentalSelectionQuote(listing,{startDate:start,endDate:end,startTime:pickupTime,endTime:returnTime,delivery:selectedDelivery},now):null;}catch{}
 const st=rentalSelectionCopy[locale]||rentalSelectionCopy['vi-VN'];
 async function share(){try{const url=window.location.origin+'/product/'+encodeURIComponent(params.id);if(navigator.share)await navigator.share({title:listing.title,url});else{await navigator.clipboard.writeText(url);setShareNotice(t.linkCopied);}}catch(e){if(e.name!=='AbortError')setShareNotice(t.shareError);}}
 const availability=useMemo(()=>listing?buildListingAvailability(listing,state.orders):null,[listing,state.orders]);
 const waitlistCount=listing?getWaitlistForListing(state.rentWaitlists,listing.id).length:0;
 if(!listing)return <MarketplaceShell><div className="container pd-empty">{dbLoading?<RelooLoading/>:dbError?<EmptyState title={mt.dataError} action={<button className="btn btn-primary" onClick={retryListings}>{mt.retry}</button>}/>:<EmptyState icon="PackageX" title={t.notFound} description={t.notFoundNote} action={<Link className="btn btn-primary" href="/explore">{t.back}</Link>}/>}</div></MarketplaceShell>;
 const category=CATEGORIES.find(item=>item.id===listing.category),condition=LISTING_CONDITIONS[listing.condition?.toUpperCase()];
 const isRented=listing.status===LISTING_STATUS.RENTED.code||availability?.rented,isOwner=user?.id===listing.ownerId;
 const saleOnly=listing.transactionMode==='SALE',canBuy=['SALE','BOTH'].includes(listing.transactionMode),primaryBuy=saleOnly||(canBuy&&search.get('intent')==='SALE');
 const rentalDetails=readRentalDetails(listing),rt=rentalDetailsCopy[locale]||rentalDetailsCopy['vi-VN'];
 const primaryLabel=primaryBuy?t.buy:isRented?t.waitlist:st.choose;
 function rent(){if(primaryBuy){const q=new URLSearchParams(search.toString());q.delete('intent');router.push('/product/'+listing.id+(q.size?'?'+q:''));return;}if(!estimate){setCalendarSignal(n=>n+1);return;}const query=new URLSearchParams({start,end,pickupTime,returnTime,delivery:selectedDelivery,review:'1',...(isRented?{mode:'waitlist'}:{})});const path='/rent/'+listing.id+'?'+query;router.push(path);}
 function buy(){router.push('/purchase/'+listing.id);}
 async function chat(){
  if(!user){router.push('/auth?next='+encodeURIComponent('/product/'+listing.id));return;}
  if(isOwner||contactPending)return;
  setContactPending(true);setContactError('');
  try{const thread=await actions.ensureInquiryThread(listing.id);router.push('/dashboard/messages?thread='+encodeURIComponent(thread.id));}
  catch(error){setContactError(error.message);}finally{setContactPending(false);}
 }
 const billing=rentalDetails?.billingUnit||'DAY',baseRate=billing==='DAY'?listing.dailyPrice:rentalDetails?.periodPrice;
 const rate=<><Money amount={primaryBuy?listing.salePrice:baseRate}/><small>{primaryBuy?t.sale:'/ '+st[billing]}</small></>;
 return <MarketplaceShell hideBack>
  <InterestSignal asset={listing.id}/><ProductDetailMeasurement asset={listing.id}/>
  <div className="pd-page container" data-analytics-detail={listing.id}>
   <nav className="pd-breadcrumb" aria-label={t.browse}><Link href="/">RELOO</Link><ChevronRight size={13}/><Link href="/explore">{t.explore}</Link>{category&&<><ChevronRight size={13}/><Link href={'/explore?category='+category.slug}>{category.name}</Link></>}</nav>
   <div className="pd-toolbar"><Link href="/explore" aria-label={t.back}><ArrowLeft size={21}/></Link><span>{t.details}</span><button aria-label={savedIds.includes(listing.id)?t.unsave:t.save} aria-pressed={savedIds.includes(listing.id)} onClick={()=>toggleSaved(listing.id)}><Heart size={21} fill={savedIds.includes(listing.id)?'currentColor':'none'}/></button><button aria-label={t.share} onClick={share}><Share2 size={21}/></button></div>
   {shareNotice&&<p role="status">{shareNotice}</p>}
   <ProductGallery key={listing.id} images={listing.images} title={listing.title} text={t}/>
   <AccountStatusBanner/>
   <div className="pd-columns">
     <section id="product-overview" className="pd-overview">
      {category&&<Link className="pd-category" href={'/explore?category='+category.slug}>{category.name}</Link>}
      <h1>{listing.title}</h1>
      <div className="pd-meta">{Number(listing.reviewCount)>0&&Number(listing.rating)>0?<span><Star size={16}/>{Number(listing.rating).toFixed(1)} · {listing.reviewCount} {t.reviewCount}</span>:<span>{t.noReviews}</span>}{listing.location&&<span><MapPin size={16}/>{listing.location}</span>}</div>
      {condition&&<span className="pd-condition">{t.condition}: {condition.label}</span>}
     </section>
    <aside className="pd-booking" aria-label={t.chooseDates}>
     <div className="pd-booking__card">
      <div className="pd-rate">{rate}</div>
      {listing.transactionMode==='BOTH'&&!primaryBuy&&<p>{t.alsoSale} · <Money amount={listing.salePrice}/></p>}
      {isRented&&<ListingAvailabilityBanner listing={listing} availability={availability} waitlistCount={waitlistCount}/>}
      {!primaryBuy&&<div ref={datesRef}><RentalSelection detail openSignal={calendarSignal} listing={listing} value={{startDate:start,endDate:end,startTime:pickupTime,endTime:returnTime,delivery:selectedDelivery}} onChange={v=>{setStart(v.startDate);setEnd(v.endDate);setPickupTime(v.startTime);setReturnTime(v.endTime);setDelivery(v.delivery);}}><LocationMap address={listing.location} approximate openOnTap/></RentalSelection>{estimate&&<div className="pd-estimate"><span>{st.rent} / {estimate.units} {st[estimate.unit]}</span><strong><Money amount={estimate.rent}/></strong></div>}</div>}
      {!primaryBuy&&<div className="pd-cost-note"><strong>{t.deposit}</strong>{rentalDetails?.depositAmount!=null?<p><Money amount={rentalDetails.depositAmount}/></p>:Number(listing.deposit)>0&&<p><Money amount={listing.deposit}/></p>}<a href="#product-rental-terms" className="pd-map">{rt.review}</a></div>}
      {!isOwner&&<><button className="pd-primary" data-analytics-action="INQUIRY_START" onClick={primaryBuy?buy:rent}>{primaryLabel}<ChevronRight size={18}/></button>{listing.transactionMode==='BOTH'&&<button className="pd-secondary" onClick={primaryBuy?rent:buy}>{primaryBuy?t.rent:t.buy}</button>}<button className="pd-secondary" disabled={contactPending} onClick={chat} data-analytics-action="CHAT_OPEN"><MessageCircle size={18}/>{t.chat}</button></>}
      {contactError&&<p role="alert" className="feature-error">{contactError}</p>}
      <p className="pd-booking__foot">{primaryBuy?t.policyNote:t.availabilityNote}</p>
     </div>
     <details className="pd-policy-details"><summary>{t.policy}</summary><p>{t.policyNote}</p></details>
    </aside>
    <div className="pd-content">
     <nav className="pd-sections" aria-label={t.details}>{[['description',t.description],['handover',t.location],...(!saleOnly?[['rental-terms',rt.terms]]:[]),['owner',t.owner],['reviews',t.reviews]].map(([id,label])=><a key={id} href={'#product-'+id}>{label}</a>)}</nav>
     <section id="product-description" className="pd-section"><h2>{t.description}</h2><p className="pd-description">{listing.description||t.noDescription}</p></section>
     <section className="pd-section pd-specs"><CategorySpecDisplay listing={listing} inline detailCard/></section>
     {primaryBuy&&<section id="product-handover" className="pd-section"><h2><MapPin size={21}/>{t.handover}</h2><p>{listing.location||t.noLocation}</p><LocationMap address={listing.location} approximate openOnTap/></section>}
     {!saleOnly&&<RentalDetailSections listing={listing} owner={isOwner}/>}
     <section id="product-owner" className="pd-section"><h2>{t.owner}</h2>{owner?<Link className="pd-owner" href={'/user/'+owner.id}>{owner.avatar&&<img src={owner.avatar} alt=""/>}<span><strong>{owner.name}</strong><small>{t.ownerLink}</small></span><ChevronRight size={19}/></Link>:<p className="pd-muted">{t.ownerUnavailable}</p>}</section>
     <RentalHistory listingId={listing.id}/>
     <section id="product-reviews" className="pd-section"><h2>{t.reviews}</h2><div className="pd-review-empty"><Star size={24}/><strong>{Number(listing.reviewCount)>0?`${listing.rating} · ${listing.reviewCount} ${t.reviewCount}`:t.noReviews}</strong></div></section>
    </div>

   </div>
   {owner&&<div className="pd-related"><OwnerActiveListingsPanel owner={owner} currentListingId={listing.id} listings={allListings} orders={state.orders}/></div>}
  </div>
  {!isOwner&&<div className="pd-mobile-action"><div><span className="pd-mobile-action__price">{rate}</span><small>{primaryBuy?t.sale:estimate?<>{st.rent}: <Money amount={estimate.rent}/></>:t.noTotal}</small></div><button className="pd-primary" onClick={primaryBuy?buy:rent} data-analytics-action="INQUIRY_START">{primaryLabel}</button></div>}
 </MarketplaceShell>;
}
