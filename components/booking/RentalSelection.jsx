"use client";
import {RentalCalendar} from './RentalCalendar';
import {CalendarDays,MapPin,Truck,CheckCircle2} from 'lucide-react';
import {Money} from '@/components/ui';
import {useLocale} from '@/components/settings/LocaleProvider';
import {rentalSelectionCopy} from '@/lib/i18n/rental-selection';
import {handoverOptions} from '@/lib/rental-selection';
import {readRentalDetails} from '@/lib/listing-rental-details';
import {locationLabel} from '@/lib/location-label';
import {rentalReturnCopy} from '@/lib/rental-return-policy';
import './rental-selection.css';
export function RentalSelection({listing,value,onChange,disabled=false,openSignal=0,detail=false,children}){
 const {locale}=useLocale(),t=rentalSelectionCopy[locale]||rentalSelectionCopy['vi-VN'],options=handoverOptions(listing),d=readRentalDetails(listing);
 const update=(key,v)=>onChange({...value,[key]:v});
 return <fieldset className={'rental-selection'+(detail?' rental-selection--detail':'')} disabled={disabled}>
  <legend><CalendarDays size={19}/>{detail?t.rentalTime:t.title}</legend>
  <RentalCalendar minimumDays={d?.billingUnit==='MONTH'?30:1} suggestedDays={d?.billingUnit==='MONTH'?30:1} listing={listing} value={value} onChange={onChange} disabled={disabled} openSignal={openSignal}/>
  <h3 id={detail?"product-handover":undefined}>{t.handover}</h3>
  <div className="rental-handover-options">{[['meet',MapPin],['deliver',Truck]].filter(([key])=>options[key]).map(([key,Icon])=><label key={key} className={value.delivery===key?'is-selected':''}>
   <input type="radio" name="rental-handover" value={key} checked={value.delivery===key} onChange={()=>update('delivery',key)}/><Icon size={22}/>
   <span><span className="rs-option-heading"><strong>{t[key]}</strong><small>{key==='meet'?t.free:d?.deliveryFee!=null?<Money amount={d.deliveryFee}/>:t.deliveryQuote}</small></span>
   {detail&&key==='meet'&&listing.location&&<b className="rs-pickup-location">{locationLabel(listing.location)}</b>}
   {(key==='meet'?d?.pickupNote:d?.deliveryNote)&&<small>{key==='meet'?d.pickupNote:d.deliveryNote}</small>}</span>
   {value.delivery===key&&<CheckCircle2 size={18}/>}
  </label>)}</div>
  <details><summary>{locale==='en-US'?'Return time and late fees':'Giờ trả và phí trả trễ'}</summary><p>{rentalReturnCopy[locale]||rentalReturnCopy['vi-VN']}</p></details>
  {children}
  {!options.meet&&!options.deliver&&<p role="alert">{t.HANDOVER_UNAVAILABLE}</p>}
 </fieldset>;
}
