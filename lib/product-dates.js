// Same inclusive day convention as the existing rental-request flow; not a quote.
export function rentalDateEstimate(start,end,today,dailyPrice){
 const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 if(!valid(start)||!valid(end)||start<today||end<start)return null;
 const days=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
 const price=Number(dailyPrice);
 return {days,rent:Number.isFinite(price)&&price>=0?days*price:null};
}
