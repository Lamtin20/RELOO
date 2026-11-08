import {readRentalDetails} from './listing-rental-details.js';
import {withinRentalWindow} from './rental-window.js';
import {RENTAL_RETURN_POLICY} from './rental-return-policy.js';
export const BILLING_DAYS={DAY:1,WEEK:7,MONTH:30};
export function rentalPeriodRate(listing){const d=readRentalDetails(listing),unit=d?.billingUnit||'DAY';return {unit,days:BILLING_DAYS[unit],price:unit==='DAY'?Number(listing?.dailyPrice||0):Number(d?.periodPrice||0)};}
export function handoverOptions(listing){const d=readRentalDetails(listing);return {meet:d?.pickupAvailable!==false,deliver:d?.deliveryAvailable===true};}
export function rentalSelectionQuote(listing,selection,now=Date.now()){
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const {startDate,endDate,startTime,endTime,delivery}=selection||{};
 if(!validDate(startDate)||!validDate(endDate)||![startTime,endTime].every(v=>typeof v==='string'&&/^([01]\d|2[0-3]):(?:00|30)$/.test(v||'')))throw Error('DATES_REQUIRED');
 const start=startDate+'T'+startTime+':00+07:00',end=endDate+'T'+endTime+':00+07:00',minutes=(Date.parse(end)-Date.parse(start))/60000;
 if(!withinRentalWindow(Date.parse(start),Date.parse(end),now))throw Error('DATES_INVALID');
 const options=handoverOptions(listing);if(!['meet','deliver'].includes(delivery)||!options[delivery])throw Error('HANDOVER_UNAVAILABLE');
 const d=readRentalDetails(listing),unit=d?.billingUnit||'DAY',unitDays=BILLING_DAYS[unit],unitPrice=unit==='DAY'?Number(listing.dailyPrice):Number(d?.periodPrice);
 if(!unitDays||!Number.isSafeInteger(unitPrice)||unitPrice<=0)throw Error('PRICE_UNAVAILABLE');
 const days=Math.ceil(minutes/1440);if(unit==='MONTH'&&days<30)throw Error('MONTH_MINIMUM_30_DAYS');const units=Math.ceil(minutes/(1440*unitDays)),discountPercent=unit==='MONTH'&&units>=2?Number(d.longTermDiscountPercent||0):0,rent=Math.round(units*unitPrice*(1-discountPercent/100)),deposit=d?.depositAmount??null,deliveryFee=delivery==='meet'?0:d?.deliveryFee??null;
 return {version:2,returnPolicy:{...RENTAL_RETURN_POLICY},listingId:listing.id,ownerId:listing.ownerId,start,end,selection:{startDate,endDate,startTime,endTime,delivery},unit,unitDays,unitPrice,units,discountPercent,days,rent,deposit,deliveryFee,knownTotal:rent+(deposit??0)+(deliveryFee??0),totalKnown:deposit!==null&&deliveryFee!==null,requiresOwner:true,terms:d};
}
