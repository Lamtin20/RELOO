'use client';
import {createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useAuth} from '@/lib/store';
import {deviceLocale,validLocale,LOCALE_COOKIE} from '@/lib/i18n/locale';
const Context=createContext({locale:'vi-VN',save:async()=>{throw Error('LOCALE_PROVIDER_MISSING')}});
const subscribe=fn=>{window.addEventListener('languagechange',fn);return()=>window.removeEventListener('languagechange',fn)};
function cacheKey(actor){return 'reloo-ui-language:'+actor;}
function remember(actor,locale){try{localStorage.setItem(cacheKey(actor),locale);}catch{}document.cookie=LOCALE_COOKIE+'='+locale+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}
export function LocaleProvider({initialLocale='vi-VN',children}){
 const {user,hydrated}=useAuth(),actor=user?.id||null,owner=useRef(actor),sequence=useRef(0),saving=useRef(false);
 useEffect(()=>{owner.current=actor;},[actor]);
 const device=useSyncExternalStore(subscribe,()=>deviceLocale(navigator.languages||[navigator.language]),()=>initialLocale);
 const [record,setRecord]=useState({actor:null,locale:initialLocale});
 const locale=record.actor===actor?record.locale:device;
 useEffect(()=>{document.documentElement.lang=locale==='en-US'?'en':'vi';},[locale]);
 useEffect(()=>{
  if(!hydrated)return;
  let live=true;const controllers=new Set();
  async function load(){
   if(!live||saving.current)return;
   const generation=++sequence.current;
   if(!actor){let preferred;try{preferred=localStorage.getItem('reloo-ui-language:guest');}catch{}const next=validLocale(preferred)?preferred:device;setRecord({actor:null,locale:next});return;}
   const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),10000);
   try{
    const r=await fetch('/api/profile/language',{cache:'no-store',signal:controller.signal});const data=await r.json();if(!r.ok||!data.ok)throw Error('LOCALE_UNAVAILABLE');
    if(!live||owner.current!==actor||generation!==sequence.current)return;
    let next=data.locale;
    if(!validLocale(next)){const initialize=await fetch('/api/profile/language',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale:device,initial:true}),signal:controller.signal});const result=await initialize.json();if(!initialize.ok||!result.ok)throw Error('LOCALE_UNAVAILABLE');next=result.locale;}
    if(live&&owner.current===actor&&generation===sequence.current&&validLocale(next)){remember(actor,next);setRecord({actor,locale:next});}
   }catch{if(live&&owner.current===actor&&generation===sequence.current){let cached;try{cached=localStorage.getItem(cacheKey(actor));}catch{}setRecord({actor,locale:validLocale(cached)?cached:device});}}finally{clearTimeout(timeout);controllers.delete(controller);}
  }
  const timer=setTimeout(load,0);
  const focus=()=>{if(document.visibilityState==='visible')load();};window.addEventListener('focus',focus);
  return()=>{live=false;controllers.forEach(c=>c.abort());clearTimeout(timer);window.removeEventListener('focus',focus);};
 },[actor,device,hydrated]);
 async function save(next){
  if(!validLocale(next))throw Error('LOCALE_INVALID');if(!actor){remember('guest',next);setRecord({actor:null,locale:next});return;}const current=actor;++sequence.current;saving.current=true;
  try{const r=await fetch('/api/profile/language',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale:next}),signal:AbortSignal.timeout(10000)});const data=await r.json();if(!r.ok||!data.ok||owner.current!==current||!validLocale(data.locale))throw Error('LOCALE_SAVE_FAILED');remember(current,data.locale);setRecord({actor:current,locale:data.locale});window.dispatchEvent(new Event('reloo-language-changed'));}finally{saving.current=false;}
 }
 return <Context.Provider value={{locale,save}}>{children}</Context.Provider>;
}
export const useLocale=()=>useContext(Context);
