"use client";
import {analyticsContext} from '@/lib/analytics/browser-context';
import {useAuth} from '@/lib/store';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {useCookieConsent} from '@/lib/cookie-consent';
import {publicAnalyticsPath,trafficSource} from '@/lib/content/news-measurement';
import {googlePageView,disableGoogleAnalytics} from '@/lib/analytics/google-browser';
export function JourneyMeasurement({googleMeasurementId=null}){
 const consent=useCookieConsent(),path=usePathname(),{user,hydrated}=useAuth();
 useEffect(()=>{
  const safePath=publicAnalyticsPath(path);
  if(!hydrated||!consent?.analytics||!safePath||['crm.reloo.vn','chat.reloo.vn'].includes(location.hostname)||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'){disableGoogleAnalytics();return;}
  let visitorId,sessionId;try{analyticsContext(user?.id||'anonymous');visitorId=localStorage.getItem('reloo_analytics_visitor')||crypto.randomUUID();const last=JSON.parse(sessionStorage.getItem('reloo_analytics_session_v2')||'null');sessionId=last&&Date.now()-last.last<1800000?last.id:crypto.randomUUID();localStorage.setItem('reloo_analytics_visitor',visitorId);sessionStorage.setItem('reloo_analytics_session_v2',JSON.stringify({id:sessionId,last:Date.now()}));}catch{return;}
  const source=trafficSource(document.referrer,new URL(location.href).searchParams.get('utm_source')),device=innerWidth<768?'mobile':innerWidth<1100?'tablet':'desktop';let clicks=0;
  function send(event,target='other'){fetch('/api/journey',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,eventId:crypto.randomUUID(),visitorId,sessionId,path:safePath,event,source,device,target})}).catch(()=>{});}
  send('PAGE_VIEW');googlePageView(googleMeasurementId,safePath,source);
  function click(e){const el=e.target instanceof Element?e.target.closest('a[href],button'):null;if(!el||clicks>=30)return;let target='control';if(el.matches('a[href]')){let url;try{url=new URL(el.href,location.href);}catch{return;}if(!['https:','http:'].includes(url.protocol))return;const p=url.pathname;target=url.origin!==location.origin?'external':p.startsWith('/product/')?'product':p.startsWith('/news')?'news':p.startsWith('/explore')?'explore':p==='/needs'?'needs':p==='/lend'?'listing':p.startsWith('/rent/')||p.startsWith('/purchase/')?'inquiry':p.startsWith('/auth')?'auth':'other';}clicks++;send('NAV_CLICK',target);}
  document.addEventListener('click',click);return()=>document.removeEventListener('click',click);
 },[path,consent?.analytics,user?.id,hydrated,googleMeasurementId]);
 return null;
}
