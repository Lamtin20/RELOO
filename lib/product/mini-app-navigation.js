const ids=['stays','jobs','rentals','used'];
export function sharedMiniAppPath(path){return /^\/(?:product|rent|purchase|checkout|user)\/[^/]+$/.test(path)||/^\/(?:account|auth|help|lend|dashboard|verify-identity)(?:\/|$)/.test(path)||/^\/cms\//.test(path)}
export function miniAppContext(path,query=''){
 const p=new URLSearchParams(query);
 if(path==='/dat-phong'||path.startsWith('/dat-phong/'))return 'stays';
 if(path==='/viec-lam'||path.startsWith('/viec-lam/'))return 'jobs';
 if(path==='/explore')return p.get('transaction')==='SALE'?'used':p.get('transaction')==='RENT'?'rentals':null;
 if(sharedMiniAppPath(path)&&ids.includes(p.get('app')))return p.get('app');
 return null;
}
export function miniAppHref(href,id,returnTo){
 if(typeof href!=='string'||!href.startsWith('/')||href.startsWith('//')||!ids.includes(id))return href;
 const u=new URL(href,'https://reloo.invalid');
 if(u.pathname==='/explore'&&['rentals','used'].includes(id)&&!u.searchParams.has('transaction')){u.searchParams.set('transaction',id==='used'?'SALE':'RENT');return u.pathname+u.search+u.hash;}
 if(!sharedMiniAppPath(u.pathname))return href;
 u.searchParams.set('app',id);
 const back=safeMiniAppReturn(returnTo,id);if(back)u.searchParams.set('returnTo',back);
 if(u.pathname.startsWith('/auth')){const next=u.searchParams.get('next')||'/account';if(!next.startsWith('/auth')&&sharedMiniAppPath(new URL(next,'https://reloo.invalid').pathname))u.searchParams.set('next',miniAppHref(next,id,back));}
 return u.pathname+u.search+u.hash;
}
export function safeMiniAppReturn(value,id){
 if(typeof value!=='string'||value.length>2400||!value.startsWith('/')||value.startsWith('//'))return null;
 const u=new URL(value,'https://reloo.invalid');if(miniAppContext(u.pathname,u.search)!==id||!['/explore','/dat-phong','/viec-lam','/viec-lam/dich-vu'].includes(u.pathname))return null;
 u.searchParams.delete('returnTo');u.searchParams.delete('app');return u.pathname+u.search;
}
export function miniAppTabs(id,en=false){
 const text=(vi,english)=>en?english:vi;
 const tabs={
 stays:[['/dat-phong',text('Tìm phòng','Find a stay'),'home'],['/dat-phong?tab=orders',text('Đơn của tôi','My bookings'),'orders'],['/dat-phong/chu-nha',text('Chủ nhà','Host'),'manage']],
 rentals:[['/explore?transaction=RENT',text('Tìm đồ thuê','Find rentals'),'home'],['/lend?intent=RENT',text('Cho thuê','List an item'),'post'],['/dashboard/orders',text('Đơn thuê','Rental orders'),'orders']],
 used:[['/explore?transaction=SALE',text('Tìm món đồ','Browse items'),'home'],['/lend?intent=SALE',text('Đăng bán','Sell an item'),'post'],['/dashboard/purchases',text('Đơn mua','Purchases'),'orders']],
 jobs:[['/viec-lam?role=worker',text('Tìm việc','Find work'),'home'],['/viec-lam?role=employer',text('Tìm người','Hire people'),'manage']]
 };
 return tabs[id]||[];
}
