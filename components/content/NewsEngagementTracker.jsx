"use client";
import {useEffect} from 'react';
import {useCookieConsent} from '@/lib/cookie-consent';
import {trafficSource} from '@/lib/content/news-measurement';
export function NewsEngagementTracker({articleId}){
 const consent=useCookieConsent();
 useEffect(()=>{
  if(!consent?.analytics||location.hostname==='crm.reloo.vn'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1')return;
  let cancelled=false,activeMs=0,last=performance.now(),lastSessionSaved=Date.now(),clicks=0;const sent=new Set(),viewId=crypto.randomUUID();
  let visitorId,sessionId;
  try{visitorId=localStorage.getItem('reloo_news_visitor')||crypto.randomUUID();localStorage.setItem('reloo_news_visitor',visitorId);const previous=JSON.parse(sessionStorage.getItem('reloo_news_session')||'null');sessionId=previous&&Date.now()-previous.last<1800000?previous.id:crypto.randomUUID();sessionStorage.setItem('reloo_news_session',JSON.stringify({id:sessionId,last:Date.now()}));}catch{return;}
  const url=new URL(location.href),source=trafficSource(document.referrer,url.searchParams.get('utm_source')),campaign=url.searchParams.get('reloo_campaign'),width=innerWidth,device=width<768?'mobile':width<1100?'tablet':'desktop',language=navigator.language?.startsWith('vi')?'vi':navigator.language?.startsWith('en')?'en':'other';
  const base={articleId,visitorId,sessionId,viewId,source,campaign,device,language};
  async function send(event,extra={}){try{await fetch('/api/news-events',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,id:crypto.randomUUID(),event,...extra})});}catch{}}
  const viewReady=send('VIEW');
  function emit(event,extra={}){if(cancelled)return;if(['ENGAGED_30S','SCROLL_50','SCROLL_90'].includes(event)){if(sent.has(event))return;sent.add(event);}viewReady.then(()=>{if(!cancelled)send(event,extra);});}
  function tick(){const now=performance.now();if(document.visibilityState==='visible'&&document.hasFocus())activeMs+=Math.min(now-last,2000);last=now;if(activeMs>=30000)emit('ENGAGED_30S');if(document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastSessionSaved>=15000){lastSessionSaved=Date.now();try{sessionStorage.setItem('reloo_news_session',JSON.stringify({id:sessionId,last:lastSessionSaved}));}catch{}}}
  function scroll(){const body=document.querySelector('.news-reader__content');if(!body)return;const box=body.getBoundingClientRect(),progress=Math.max(0,Math.min(1,(innerHeight-box.top)/Math.max(box.height,1)));if(progress>=.5)emit('SCROLL_50');if(progress>=.9)emit('SCROLL_90');}
  function click(e){const link=e.target instanceof Element?e.target.closest('.news-reader a[href]'):null;if(!link||clicks>=20)return;let targetUrl;try{targetUrl=new URL(link.href,location.href);}catch{return;}if(!['http:','https:'].includes(targetUrl.protocol))return;const external=targetUrl.origin!==location.origin,path=targetUrl.pathname;
   const slot=link.closest('.news-reader__related')?'related':link.closest('.news-reader__cta')?'footer':link.closest('.news-reader__toc')?(link.hash?'toc':'sidebar'):link.closest('.news-reader__content')?'body':'header';
   if(slot==='toc')return;
   const target=external?'external':path.startsWith('/product/')?'product':path.startsWith('/explore')?'explore':path.startsWith('/needs')?'needs':/^\/(lend|dashboard\/assets)/.test(path)?'listing':path.startsWith('/dashboard/messages')?'chat':path.startsWith('/news')?'news':'other';
   const event=external?'OUTBOUND_CLICK':slot==='related'?'RELATED_CLICK':['product','explore','needs','listing','chat'].includes(target)?'CTA_CLICK':null;
   if(event){clicks++;emit(event,{slot,target});}
  }
  const timer=setInterval(tick,1000);document.addEventListener('click',click);window.addEventListener('scroll',scroll,{passive:true});scroll();
  return()=>{cancelled=true;clearInterval(timer);document.removeEventListener('click',click);window.removeEventListener('scroll',scroll);};
 },[articleId,consent?.analytics]);
 return null;
}
