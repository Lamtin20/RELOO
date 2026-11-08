'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {useCookieConsent} from '@/lib/cookie-consent';
import {useAuth} from '@/lib/store';
import {analyticsContext} from '@/lib/analytics/browser-context';
import {internalPosition,PRODUCT_EVENTS,MEASUREMENT} from '@/lib/analytics/dictionary';
const Context=createContext({record:()=>{}});export const useProductAnalytics=()=>useContext(Context);
export function ProductAnalyticsProvider({children}){
 const consent=useCookieConsent(),{user,hydrated}=useAuth(),path=usePathname(),[enabled,setEnabled]=useState(false),scope=user?.id||'anonymous';
 const config=useRef(MEASUREMENT),dedup=useRef(new Map());
 useEffect(()=>{const c=new AbortController();fetch('/api/journey',{signal:c.signal}).then(r=>r.json()).then(d=>{config.current=d.measurement||MEASUREMENT;setEnabled(d.enabled===true);}).catch(()=>{});return()=>c.abort();},[]);
 const record=useCallback((event,data={})=>{
  if(!enabled||!hydrated||!consent?.analytics||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||!PRODUCT_EVENTS.includes(event))return;
  const assetId=data.assetId||data.asset;if(!assetId)return;
  try{const ctx=analyticsContext(scope),placement=data.placement||internalPosition(location.pathname),key=scope+event+assetId+placement;
   if(['ITEM_IMPRESSION','PRODUCT_VIEW','TERMS_VIEW'].includes(event)&&Date.now()-(dedup.current.get(key)||0)<1800000)return;
   dedup.current.set(key,Date.now());
   fetch('/api/journey',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({schemaVersion:2,consent:true,eventId:crypto.randomUUID(),visitorId:ctx.visitorId,sessionId:ctx.sessionId,event,assetId,observedAt:new Date().toISOString(),placement,device:innerWidth<768?'mobile':innerWidth<1100?'tablet':'desktop',durationMs:data.durationMs||0,referrer:ctx.touch.host?'https://'+ctx.touch.host:'',utm:ctx.touch})}).catch(()=>{});
  }catch{}
 },[enabled,hydrated,consent?.analytics,scope]);
 useEffect(()=>{
  if(!enabled||!consent?.analytics||!hydrated)return;
  const nodes=new WeakSet(),timers=new Map(),ratios=new WeakMap();
  const visible=el=>document.visibilityState==='visible'&&document.hasFocus()&&document.documentElement.dataset.relooAppActive!=='false'&&(!document.querySelector('dialog[open]')||document.querySelector('dialog[open]').contains(el));
  const observed=new Set();
  function arm(el){if(timers.has(el)||!el.isConnected||!visible(el)||ratios.get(el)<config.current.impressionRatio)return;timers.set(el,setTimeout(()=>{if(el.isConnected&&visible(el)&&ratios.get(el)>=config.current.impressionRatio)record(el.dataset.analyticsInteraction||'ITEM_IMPRESSION',{assetId:el.dataset.analyticsAsset||el.closest('[data-analytics-detail]')?.dataset.analyticsDetail,placement:el.dataset.analyticsPlacement||internalPosition(path)});timers.delete(el);},config.current.impressionMs));}
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){ratios.set(entry.target,entry.intersectionRatio);if(timers.has(entry.target)){clearTimeout(timers.get(entry.target));timers.delete(entry.target);}if(entry.intersectionRatio>=config.current.impressionRatio)arm(entry.target);}},{threshold:[0,config.current.impressionRatio,1]});
  function scan(){document.querySelectorAll('[data-analytics-asset],[data-analytics-interaction]').forEach(el=>{if(!nodes.has(el)){nodes.add(el);observed.add(el);observer.observe(el);}});for(const el of observed){if(!el.isConnected){observed.delete(el);observer.unobserve(el);}else arm(el);}}
  function click(event){const el=event.target instanceof Element?event.target.closest('[data-analytics-action],a[href]'):null;if(!el)return;const container=el.closest('[data-analytics-asset],[data-analytics-detail]');const asset=container?.dataset.analyticsAsset||container?.dataset.analyticsDetail;if(el.dataset.analyticsAction){record(el.dataset.analyticsAction,{assetId:asset});return;}if(el.getAttribute('aria-disabled')==='true'||event.target.closest('button,input,select,textarea'))return;const href=el.getAttribute('href');if(href?.startsWith('/product/')){const id=href.split('/')[2]?.split('?')[0];record('PRODUCT_CLICK',{assetId:id,placement:container?.dataset.analyticsPlacement||internalPosition(path)});try{sessionStorage.setItem('reloo_product_discovery',JSON.stringify({id,placement:container?.dataset.analyticsPlacement||internalPosition(path),at:Date.now()}));}catch{}}}
  const mutation=new MutationObserver(scan);scan();mutation.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',click,true);
  function pause(){for(const [el,timer] of timers)if(!visible(el)){clearTimeout(timer);timers.delete(el);}for(const el of observed)arm(el);}
  document.addEventListener('visibilitychange',pause);window.addEventListener('blur',pause);window.addEventListener('focus',pause);document.addEventListener('reloo-native-active',pause);
  return()=>{observer.disconnect();mutation.disconnect();document.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',pause);window.removeEventListener('blur',pause);window.removeEventListener('focus',pause);document.removeEventListener('reloo-native-active',pause);for(const timer of timers.values())clearTimeout(timer);};
 },[enabled,consent?.analytics,hydrated,path,record]);
 return <Context.Provider value={{record}}>{children}</Context.Provider>;
}
export function ProductDetailMeasurement({asset}){
 const {record}=useProductAnalytics();
 useEffect(()=>{let placement='product';try{const d=JSON.parse(sessionStorage.getItem('reloo_product_discovery')||'null');if(d?.id===asset&&Date.now()-d.at<1800000)placement=d.placement;}catch{}
  let active=0,last=performance.now();const timer=setInterval(()=>{const now=performance.now();if(document.visibilityState==='visible'&&document.hasFocus()&&document.documentElement.dataset.relooAppActive!=='false'){record('PRODUCT_VIEW',{assetId:asset,placement});active+=Math.min(2000,now-last);if(active>=15000){record('ENGAGED_TIME',{assetId:asset,placement,durationMs:Math.floor(active)});active=0;}}last=now;},1000);return()=>clearInterval(timer);
 },[asset,record]);return null;
}
