// Shared navigation is not a grant of domain permissions or commercial readiness.
export const MINI_APPS=Object.freeze([
 {id:'stays',href:'/dat-phong',postingHref:'/dat-phong/quan-ly',transactionsHref:'/dat-phong?tab=orders',status:'PREVIEW',label:{'vi-VN':'Đặt phòng & Chỗ ở','en-US':'Stays & housing'},hint:{'vi-VN':'Tìm một chốn nghỉ vừa ý','en-US':'Find a place to unwind'}},
 {id:'jobs',href:'/viec-lam',postingHref:'/viec-lam?role=employer',transactionsHref:'/viec-lam?tab=applications',status:'COMING_SOON',label:{'vi-VN':'Việc làm linh hoạt','en-US':'Flexible jobs'},hint:{'vi-VN':'Tìm việc hoặc tìm người làm','en-US':'Find work or hire people'}},
 {id:'rentals',href:'/explore?transaction=RENT',postingHref:'/lend?intent=RENT',transactionsHref:'/dashboard/orders',status:'AVAILABLE',label:{'vi-VN':'Thuê đồ dùng','en-US':'Rent useful things'},hint:{'vi-VN':'Dùng khi cần, trả khi xong','en-US':'Use what you need, then return it'}},
 {id:'used',href:'/explore?transaction=SALE',postingHref:'/lend?intent=SALE',transactionsHref:'/dashboard/purchases',status:'AVAILABLE',label:{'vi-VN':'Đồ cũ','en-US':'Pre-owned goods'},hint:{'vi-VN':'Thêm vòng đời cho món đồ','en-US':'Give things another chapter'}}
]);
export const MODULE_IDS=MINI_APPS.map(m=>m.id);
export function miniApp(id){return MINI_APPS.find(m=>m.id===id)||null}
export function moduleSearchHref(id,query=''){
 const m=miniApp(id);if(!m)throw Error('UNKNOWN_MODULE');const u=new URL(m.href,'https://reloo.invalid');
 const q=String(query).trim().slice(0,160);if(q)u.searchParams.set('q',q);
 return u.pathname+u.search;
}
export function publicModuleReadiness(){return MINI_APPS.map(({id,href,status})=>({id,href,status,liveTransactions:!['stays','jobs'].includes(id),note:'MODULE_STATUS_IS_NOT_PAYMENT_OR_LEGAL_APPROVAL'}))}
export function safeModuleIntent(value){return MODULE_IDS.includes(value)?value:null}
export function postingMode(draftMode,intent){return ['RENT','SALE','BOTH'].includes(draftMode)?draftMode:intent==='SALE'?'SALE':'RENT'}
