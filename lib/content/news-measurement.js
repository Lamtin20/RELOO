export const EVENT_TYPES=['VIEW','ENGAGED_30S','SCROLL_50','SCROLL_90','CTA_CLICK','OUTBOUND_CLICK','RELATED_CLICK','SHARE_CLICK'];
export const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function publicAnalyticsPath(path){if(typeof path!=='string')return null;if(path==='/')return '/';for(const name of ['product','user','shorts'])if(path.startsWith('/'+name+'/'))return '/'+name+'/:id';if(/^\/news\/[a-z0-9-]+$/.test(path))return '/news/:article';if(/^\/news\/chu-de\/[a-z0-9-]+$/.test(path))return '/news/chu-de/:topic';return ['/noi-khu','/news','/explore','/needs','/pricing','/safety','/help','/lend','/shorts','/cashback'].includes(path)?path:null;}
export function dailyNewsSeries(metrics,days){const start=Date.parse(metrics?.periodStart);if(!Number.isFinite(start))return metrics?.daily||[];return Array.from({length:days},(_,i)=>{const day=new Date(start+7*3600000+i*86400000).toISOString().slice(0,10);return metrics.daily.find(d=>d.day===day)||{day,views:0,browsers:0,engaged_views:0};});}
export function analyticsConsent(cookie,now=Date.now()){
 try{const raw=cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith('reloo-cookie-consent='))?.slice(21),c=JSON.parse(decodeURIComponent(raw||''));return [1,2].includes(c.version)&&c.analytics===true&&Number.isFinite(c.savedAt)&&c.savedAt<=now&&now-c.savedAt<180*86400000;}catch{return false;}
}
export function trafficSource(referrer,utmSource){
 const value=String(utmSource||'').toLowerCase();if(['google','bing','coccoc'].includes(value))return 'search';if(['facebook','instagram','tiktok','youtube','zalo','linkedin'].includes(value))return 'social';if(['email','newsletter'].includes(value))return 'email';
 try{const host=new URL(referrer).hostname.toLowerCase();if(host==='reloo.vn'||host.endsWith('.reloo.vn'))return 'internal';if(/(^|\.)(google\.[a-z.]+|bing\.com|coccoc\.com)$/.test(host))return 'search';if(/(^|\.)(facebook\.com|instagram\.com|tiktok\.com|youtube\.com|zalo\.me|linkedin\.com)$/.test(host))return 'social';return 'referral';}catch{return 'direct';}
}
export function eventPayload(input){
 if(!input||!['id','viewId','articleId','visitorId','sessionId'].every(k=>ID.test(input[k]||''))||!EVENT_TYPES.includes(input.event))throw Error('INVALID_NEWS_EVENT');
 return {event:input.event,id:input.id,viewId:input.viewId,articleId:input.articleId,visitorId:input.visitorId,sessionId:input.sessionId,
 source:['search','social','email','referral','internal','direct'].includes(input.source)?input.source:'direct',
 device:['mobile','tablet','desktop'].includes(input.device)?input.device:'desktop',language:['vi','en','other'].includes(input.language)?input.language:'other',
 slot:['body','sidebar','footer','related','toc','header','other'].includes(input.slot)?input.slot:'other',target:['product','explore','needs','listing','chat','news','external','other'].includes(input.target)?input.target:'other',campaign:ID.test(input.campaign||'')?input.campaign:null};
}
