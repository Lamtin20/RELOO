export const METRIC_VERSION=2;
export const MEASUREMENT={version:2,impressionRatio:.5,impressionMs:1000,rawRetentionDays:90,minimumCohort:5,maximumLateHours:24,sessionMinutes:30,attribution:'session-first-external',conversionWindowDays:7};
export const PRODUCT_EVENTS=['ITEM_IMPRESSION','PRODUCT_CLICK','PRODUCT_VIEW','PHOTO_VIEW','TERMS_VIEW','DATES_SELECTED','SAVE_CLICK','SHARE_CLICK','SHARE_CONFIRMED','CHAT_OPEN','CALL_CLICK','INQUIRY_START','ENGAGED_TIME'];
export const INTERNAL_POSITIONS=['home','search','category','neighborhood','recommendation','knowledge','seller','campaign','product','unknown'];
export const EXTERNAL_SOURCES=['organic_search','paid_search','social_organic','social_paid','referral','email','push','campaign','ai_referral','direct_unknown'];
export const METRICS={
 impressions:{vi:'Hiển thị trong RELOO',en:'RELOO impressions',definition:'At least 50% visible for 1 second in an active tab; version 2. One per product/session/placement in a 30-minute de-duplication window.'},
 clicks:{vi:'Nhấn sản phẩm',en:'Product clicks',definition:'Intentional navigation/open product action, not completed rentals.'},
 views:{vi:'Xem chi tiết',en:'Detail views',definition:'Successfully loaded product detail, visible in active tab; separate from generic page views.'},
 viewers:{vi:'Trình duyệt quan sát được',en:'Observed browsers',definition:'Consented pseudonymous browser identifiers, not absolute unique people across devices.'},
 ctr:{vi:'CTR nội bộ',en:'Internal CTR',definition:'Product-clicks / internal impressions in the same product and report scope; not Google CTR.'},
 engaged:{vi:'Thời gian tương tác đo được',en:'Measured active time',definition:'Visible/focused product screen time, capped per event. Does not prove reading.'},
 requested:{vi:'Yêu cầu thuê từ backend',en:'Backend rental requests',definition:'Distinct persisted orders, not client conversion events.'},
 completed:{vi:'Đơn hoàn tất từ backend',en:'Backend completed rentals',definition:'Authoritative completed states; current-state report, not an attributed client funnel.'},
 gross:{vi:'Tiền thuê gộp đã xác nhận',en:'Confirmed gross rental',definition:'Confirmed paid rental principal only; excludes deposits, shipping and platform fees. Direct acknowledgements are labeled separately from bank-confirmed payments.'}
};
const AI_HOSTS=new Set(['chatgpt.com','chat.openai.com','perplexity.ai','www.perplexity.ai','claude.ai','gemini.google.com','copilot.microsoft.com']);
const SEARCH=/(^|\.)(google\.[a-z.]+|bing\.com|coccoc\.com|duckduckgo\.com)$/;
const SOCIAL=/(^|\.)(facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|youtube\.com|zalo\.me)$/;
export function safeCampaign(value){const v=String(value||'').trim().toLowerCase();return /^[a-z0-9_-]{1,60}$/.test(v)&&!/@|\d{6,}/.test(v)&&v.replace(/\D/g,'').length<7?v:null;}
export function externalTouch(referrer='',utm={}){
 let host='';try{const u=new URL(referrer);if(['https:','http:'].includes(u.protocol))host=u.hostname.toLowerCase();}catch{}
 const internal=host==='reloo.vn'||host.endsWith('.reloo.vn');
 const source=safeCampaign(utm.source),medium=safeCampaign(utm.medium),campaign=safeCampaign(utm.campaign),content=safeCampaign(utm.content);
 let channel='direct_unknown';
 if(source&&medium){if(['cpc','ppc','paidsearch'].includes(medium))channel='paid_search';else if(['paid_social','social_paid'].includes(medium))channel='social_paid';else if(medium==='email')channel='email';else if(medium==='push')channel='push';else if(['qr','campaign'].includes(medium))channel='campaign';else if(['social','social_organic'].includes(medium))channel='social_organic';}
 if(channel==='direct_unknown'&&!internal){if(AI_HOSTS.has(host))channel='ai_referral';else if(SEARCH.test(host))channel='organic_search';else if(SOCIAL.test(host))channel='social_organic';else if(host)channel='referral';}
 return {channel,host:internal?'':host,source,medium,campaign,content,internal};
}
export function internalPosition(path){if(path==='/')return 'home';if(path==='/noi-khu')return 'neighborhood';if(path.startsWith('/news'))return 'knowledge';if(path.startsWith('/user/'))return 'seller';if(path==='/explore')return 'search';if(path.startsWith('/product/'))return 'product';return 'unknown';}
export function validateProductEvent(d,now=Date.now()){
 if(!d||d.schemaVersion!==METRIC_VERSION||!PRODUCT_EVENTS.includes(d.event)||!/^[a-f0-9-]{36}$/i.test(d.eventId||'')||!/^[a-f0-9-]{36}$/i.test(d.visitorId||'')||!/^[a-f0-9-]{36}$/i.test(d.sessionId||'')||typeof d.assetId!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(d.assetId)||!INTERNAL_POSITIONS.includes(d.placement))throw Error('INVALID_PRODUCT_EVENT');
 const at=Date.parse(d.observedAt);if(!Number.isFinite(at)||at>now+60000||now-at>MEASUREMENT.maximumLateHours*3600000)throw Error('EVENT_TIME_INVALID');
 const duration=d.event==='ENGAGED_TIME'?Number(d.durationMs):0;if(!Number.isInteger(duration)||duration<0||duration>30000)throw Error('EVENT_DURATION_INVALID');
 const touch=externalTouch(d.referrer||'',{source:d.utm?.source,medium:d.utm?.medium,campaign:d.utm?.campaign,content:d.utm?.content});
 return {event:d.event,eventId:d.eventId,assetId:d.assetId,visitorId:d.visitorId,sessionId:d.sessionId,observedAt:new Date(at).toISOString(),durationMs:duration,placement:d.placement,device:['mobile','tablet','desktop'].includes(d.device)?d.device:'unknown',touch};
}
export function comparison(current,previous){return previous>0?{percent:Math.round((current-previous)/previous*100)}:{percent:null,newData:current>0,delta:current-previous};}
export function productAdvice(row,{minimum=30}={}){if(row.impressions<minimum)return ['INSUFFICIENT_SAMPLE'];const advice=[];if(row.clicks/row.impressions<.02)advice.push('CHECK_COVER_TITLE_PRICE');if(row.views>=minimum&&row.requested===0)advice.push('CHECK_TERMS_DEPOSIT_AVAILABILITY');if(row.requested>=10&&row.accepted/row.requested<.3)advice.push('CHECK_RESPONSE_AND_CALENDAR');return advice.length?advice:['MONITOR_MORE'];}
