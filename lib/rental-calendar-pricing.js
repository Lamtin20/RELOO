import {rentalPeriodRate} from './rental-selection.js';

// Search calendar prices describe the current public inventory, not a held slot.
export function calendarPricing({listing=null,listings=[],days=null}={}){
  const rates=(listing?[listing]:listings.filter(x=>x.status==='available'&&x.transactionMode!=='SALE'&&!x.isLocked))
    .map(rentalPeriodRate).filter(r=>Number.isSafeInteger(r.price)&&r.price>0&&r.days>0);
  if(!rates.length)return null;
  const daily=Math.min(...rates.map(r=>r.price/r.days));
  return {from:!listing,daily,
    equivalent:rates.some(r=>r.unit!=='DAY'&&r.price/r.days===daily),
    rent:Number.isFinite(days)&&days>0?Math.min(...rates.map(r=>Math.ceil(days/r.days)*r.price)):null};
}
