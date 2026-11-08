import {createHash} from 'node:crypto';import {rentalSelectionQuote} from '../rental-selection.js';
export function serverRentalQuote(row,selection,now=Date.now()){
 if(!row||!['available','rented'].includes(row.status)||row.is_locked||row.listing_data?.saleStatus==='SOLD'||row.listing_data?.neighborhoodOnly||row.listing_data?.transactionMode==='SALE'||['OPEN','ACTIVE','DISPUTED','PENDING'].includes(String(row.dispute_status||'').toUpperCase()))throw Error('LISTING_UNAVAILABLE');
 const quote=rentalSelectionQuote({id:row.id,ownerId:row.owner_id,dailyPrice:Number(row.daily_price),category:row.category,rentalDetails:row.listing_data?.rentalDetails},selection,now);return {quote,digest:createHash('sha256').update(JSON.stringify(quote)).digest('hex')};
}
