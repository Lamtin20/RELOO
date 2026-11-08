const prefix='reloo-purchase-resume:',ttl=20*60*1000;
export function readPurchaseResume(storage,token,listingId,now=Date.now()){
 if(!/^[0-9a-f-]{36}$/i.test(token||''))return null;
 try{
  const d=JSON.parse(storage.getItem(prefix+token)||'null');
  if(d?.version!==1||d.listingId!==listingId||!Number.isFinite(d.savedAt)||d.savedAt>now||now-d.savedAt>=ttl||!['MEET','DELIVER'].includes(d.mode)||typeof d.address!=='string'||d.address.length>1000){storage.removeItem(prefix+token);return null}
  return {mode:d.mode,address:d.address};
 }catch{return null}
}
export function savePurchaseResume(storage,token,listingId,draft,now=Date.now()){
 if(!/^[0-9a-f-]{36}$/i.test(token||'')||typeof listingId!=='string'||listingId.length>160||!['MEET','DELIVER'].includes(draft.mode)||typeof draft.address!=='string'||draft.address.length>1000)throw Error('PURCHASE_RESUME_INVALID');
 // Bound retained entries and remove expired data on every explicit handoff.
 const keys=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(prefix))keys.push(key)}
 for(const key of keys){try{const d=JSON.parse(storage.getItem(key));if(!Number.isFinite(d?.savedAt)||now-d.savedAt>=ttl||d.savedAt>now)storage.removeItem(key)}catch{storage.removeItem(key)}}
 const current=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(prefix))current.push(key)}for(const key of current.slice(0,Math.max(0,current.length-9)))storage.removeItem(key);
 storage.setItem(prefix+token,JSON.stringify({version:1,listingId,mode:draft.mode,address:draft.address,savedAt:now}));
 return token;
}
export function clearPurchaseResume(storage,token){if(/^[0-9a-f-]{36}$/i.test(token||''))storage.removeItem(prefix+token)}
