import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {downloadImage} from '../images/import-source.js';
import {readJson} from '../server/http.js';
import {BRAND_HOSTS,officialProductUrl,productIdentity,exactProductModel} from './policy.js';

export function productSearchConfiguration(env=process.env,now=Date.now()){
 const googleReady=env.GOOGLE_CUSTOM_SEARCH_EXISTING_CUSTOMER==='1'&&!!env.GOOGLE_CUSTOM_SEARCH_API_KEY&&!!env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID&&now<Date.parse('2027-01-01T00:00:00Z');
 return {primary:env.PRIMARY_SEARCH_PROVIDER||'agent-reach',googleReady,fallbackEnabled:env.FALLBACK_SEARCH_ENABLED!=='false',fallbackReady:!!env.RELOO_PRODUCT_RESEARCH_URL&&!!env.RELOO_PRODUCT_RESEARCH_TOKEN};
}
function belongsToBrand(url,brand){const host=new URL(url).hostname;return BRAND_HOSTS[brand]?.some(h=>host===h||host.endsWith('.'+h));}
export function eligibleSearchRows(rows,identity){
 return (Array.isArray(rows)?rows:[]).flatMap(row=>{
  const url=officialProductUrl(row?.link);if(!url||!belongsToBrand(url,identity.brand))return [];
  return [{url,title:String(row.title||identity.brand).slice(0,180)}];
 }).filter((row,index,all)=>all.findIndex(other=>other.url===row.url)===index).slice(0,3);
}
export async function googleProductSearch(input,{env=process.env,signal,fetchImpl=fetch,readPage=downloadImage,now=Date.now()}={}){
 const identity=productIdentity(input),configuration=productSearchConfiguration(env,now);
 if(!identity.model)throw Error('IDENTITY_INVALID');
 if(!configuration.googleReady)throw Error(now>=Date.parse('2027-01-01T00:00:00Z')?'GOOGLE_LEGACY_EXPIRED':'GOOGLE_NOT_CONFIGURED');
 const url=new URL('https://customsearch.googleapis.com/customsearch/v1');
 url.searchParams.set('key',env.GOOGLE_CUSTOM_SEARCH_API_KEY);url.searchParams.set('cx',env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID);
 url.searchParams.set('q',identity.brand+' '+identity.model+' official product specifications');url.searchParams.set('num','5');url.searchParams.set('safe','active');
 let response;try{response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(12000)])});}catch{throw Error('GOOGLE_UNAVAILABLE');}
 if(!response.ok)throw Error('GOOGLE_UNAVAILABLE');
 const raw=await readJson(response,160000),rows=eligibleSearchRows(raw.items,identity);
 const reads=await Promise.allSettled(rows.map(async row=>{
  if(signal?.aborted)throw Error('ABORTED');
  // Existing downloader pins public DNS, bounds bytes/time and checks every redirect.
  const bytes=await readPage(row.url,0,[new URL(row.url).hostname],{userAgent:'RELOO-ProductResearch/1.0 (+https://reloo.vn)'});
  if(signal?.aborted)throw Error('ABORTED');
  const document=load(bytes.toString('utf8'));document('script,style,nav,footer,header,form,noscript').remove();
  const title=(document('title').text()||row.title).trim().slice(0,180);
  const text=(document('main').text()||document('body').text()).replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim().slice(0,18000);
  if(!exactProductModel(identity.model,title+' '+text))return null;
  return {url:row.url,title,text,retrievedAt:new Date(now).toISOString()};
 }));
 return {provider:'google',sources:reads.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[])};
}

const CACHE=Symbol.for('reloo.product-research-cache.v2');
const state=()=>globalThis[CACHE]||(globalThis[CACHE]={cache:new Map()});
export async function searchProductSources(input,{env=process.env,signal,google=googleProductSearch,fetchImpl=fetch,now=Date.now()}={}){
 const identity=productIdentity(input),config=productSearchConfiguration(env,now);
 if(!identity.model)throw Error('IDENTITY_INVALID');
 if(!['google','agent-reach'].includes(config.primary))throw Error('SEARCH_PROVIDER_INVALID');
 const scope=createHash('sha256').update([config.primary,env.GOOGLE_CUSTOM_SEARCH_API_KEY,env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,env.GOOGLE_CUSTOM_SEARCH_EXISTING_CUSTOMER,env.RELOO_PRODUCT_RESEARCH_URL,env.RELOO_PRODUCT_RESEARCH_TOKEN,config.fallbackEnabled,config.googleReady].join('\0')).digest('hex');
 const key=scope+'\0'+JSON.stringify(identity),store=state(),cached=store.cache.get(key);
 if(cached&&cached.until>now)return {...cached.result,cacheHit:true};
 // Do not share another request's abort signal; duplicate calls are bounded by the API slot.
 let result,reason=null;
 if(config.primary==='google')try{result=await google(identity,{env,signal,fetchImpl,now});if(result.sources?.length){cache(result);return {...result,cacheHit:false};}reason='NO_OFFICIAL_MATCH';}
 catch(error){if(signal?.aborted)throw error;reason=['GOOGLE_NOT_CONFIGURED','GOOGLE_LEGACY_EXPIRED'].includes(error.message)?error.message:'GOOGLE_UNAVAILABLE';}
 if((config.primary==='agent-reach'||config.fallbackEnabled)&&config.fallbackReady){
  try{
   const response=await fetchImpl(env.RELOO_PRODUCT_RESEARCH_URL+'/lookup',{method:'POST',headers:{'Content-Type':'application/json','X-Research-Token':env.RELOO_PRODUCT_RESEARCH_TOKEN},body:JSON.stringify(identity),redirect:'error',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(40000)])});
   if(!response.ok)throw Error('RESEARCH_UNAVAILABLE');
   const raw=await readJson(response,100000);
   const sources=(Array.isArray(raw.sources)?raw.sources:[]).slice(0,3).flatMap(source=>{
    const url=officialProductUrl(source?.url);
    if(!url||!belongsToBrand(url,identity.brand)||typeof source.text!=='string')return [];
    const text=source.text.slice(0,18000),title=String(source.title||identity.brand).slice(0,180);
    if(!exactProductModel(identity.model,title+' '+text))return [];
    return [{url,title,text,...(typeof source.retrievedAt==='string'?{retrievedAt:source.retrievedAt.slice(0,40)}:{})}];
   });
   result={provider:'agent-reach',...(reason?{fallbackReason:reason}:{}),sources};
   if(result.sources.length)cache(result);return {...result,cacheHit:false};
  }catch(error){if(signal?.aborted)throw error;reason='RESEARCH_UNAVAILABLE';}
 }
 return {provider:result?.provider||'none',sources:[],unavailableReason:reason||'RESEARCH_NOT_CONFIGURED',cacheHit:false};
 function cache(value){if(store.cache.size>=128)store.cache.delete(store.cache.keys().next().value);store.cache.set(key,{until:now+21600000,result:value});}
}
