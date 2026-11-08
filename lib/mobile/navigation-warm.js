export const QUICK_PUBLIC_ROUTES=new Set(['/','/explore','/account','/auth','/auth/register','/lend']);
export function safeWarmHref(href){
 if(typeof href!=='string'||href.length>450||!href.startsWith('/')||href.startsWith('//')||/[\\\u0000-\u001f]/.test(href))return false;
 try{const u=new URL(href,'https://reloo.invalid');if(u.origin!=='https://reloo.invalid'||u.hash)return false;if(!u.search&&QUICK_PUBLIC_ROUTES.has(u.pathname))return true;
 const product=/^\/product\/[a-zA-Z0-9_-]{1,150}$/.test(u.pathname),explore=u.pathname==='/explore';if(!product&&!explore)return false;
 for(const [k,v] of u.searchParams){if(product){if(k==='intent'&&v==='SALE')continue;if(['start','end'].includes(k)&&/^\d{4}-\d{2}-\d{2}$/.test(v))continue;if(['pickupTime','returnTime'].includes(k)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v))continue;return false;}if(!['group','category'].includes(k)||!/^[-a-z0-9]{1,60}$/.test(v))return false;}return true;
 }catch{return false;}
}
export function createWarmBudget({limit=4,windowMs=30000,ttl=60000,maxEntries=32}={}){const seen=new Map();let background=[];return {claim(href,{intent=false,now=Date.now(),saveData=false,effectiveType=''}={}){if(!safeWarmHref(href)||saveData||['slow-2g','2g'].includes(effectiveType))return false;for(const [key,time] of seen)if(now-time>=ttl||now<time)seen.delete(key);background=background.filter(time=>now>=time&&now-time<windowMs);if(seen.has(href)||!intent&&background.length>=limit)return false;if(!intent)background.push(now);seen.set(href,now);while(seen.size>maxEntries)seen.delete(seen.keys().next().value);return true;},size:()=>seen.size};}
