export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function validPoint(point){return typeof point?.lat==='number'&&typeof point?.lng==='number'&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&point.lat>=8&&point.lat<=24&&point.lng>=102&&point.lng<=110;}
export const normalize=v=>String(v||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
export function compatibleAsset(request,asset){const mode=asset.listing_data?.transactionMode||'RENTAL';return asset.category===request.category&&asset.status==='available'&&!asset.is_locked&&(request.mode==='BUY'?['SALE','BOTH'].includes(mode):mode!=='SALE');}
export function itemMatches(request,asset){
 if(!compatibleAsset(request,asset))return false;
 const stop=new Set(['can','thue','mua','tim','mot','chiec','cai','cho','toi','muon']);
 const words=[...new Set(normalize(request.title).split(' ').filter(w=>w.length>1&&!stop.has(w)))];
 const hay=' '+normalize(asset.title)+' ';
 return words.length>0&&words.filter(w=>hay.includes(' '+w+' ')).length/words.length>=0.6;
}
export function chooseRecipients(request,members){
 const eligible=members.filter(m=>m.profile_id!==request.profile_id&&Number.isFinite(m.distance_km)&&m.distance_km<=10&&m.province_code===request.province_code).sort((a,b)=>a.distance_km-b.distance_km||a.profile_id.localeCompare(b.profile_id));
 const owners=eligible.filter(m=>(m.assets||[]).some(a=>itemMatches(request,a)));
 return {kind:owners.length?'OWNERS':'COMMUNITY',members:(owners.length?owners:eligible).slice(0,owners.length?25:50)};
}
