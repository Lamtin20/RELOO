import {EVENTS} from './neighborhood/content.js';
export function notificationKind(row){
 const data=row.notification_data;
 if(row.notification_type!=='system'||data?.module!=='neighborhood'||!EVENTS[data.event])return row.notification_type;
 if(data.event.startsWith('RESIDENCY_'))return 'account';
 if(['ITEM_MATCH','NEED_MATCH','OFFER_NEW'].includes(data.event))return 'listing';
 return EVENTS[data.event].category==='marketing'?'promo':'order';
}
