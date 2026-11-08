'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {canReloadRuntime} from '@/lib/mobile/runtime-update';

// Web, installed PWA and native WebView share this one update coordinator.
export function RuntimeSync(){
  const path=usePathname();
  useEffect(()=>{
    let disposed=false,checking=false,reloading=false,lastCheck=0,lastInteraction=0;
    let controller;
    const applied=document.documentElement.dataset.relooBuild;
    const remember=()=>{lastInteraction=Date.now();};
    const busy=()=>!!document.activeElement?.matches('input,textarea,select,[contenteditable=true]')||
      [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable=true]')].some(n=>n.getClientRects().length&&(n.value?.trim()||n.isContentEditable&&n.textContent?.trim()));
    const modal=()=>[...document.querySelectorAll('dialog[open],[role=dialog][aria-modal=true]')].some(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');
    async function check(){
      if(disposed||checking||reloading||document.visibilityState!=='visible'||navigator.onLine===false||Date.now()-lastCheck<15000)return;
      if(!['/','/explore','/news'].includes(path)||modal()||busy()||Date.now()-lastInteraction<2000)return;
      checking=true;lastCheck=Date.now();controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),8000);
      try{
        const response=await fetch('/api/mobile/runtime',{cache:'no-store',signal:controller.signal});
        if(!response.ok)return;
        const data=await response.json();let attempt=null;
        try{attempt=JSON.parse(sessionStorage.getItem('reloo-runtime-attempt')||'null');}catch{}
        if(!disposed&&Date.now()-lastInteraction>=2000&&canReloadRuntime({applied,latest:data.build,path,modal:modal(),editing:busy(),visible:document.visibilityState==='visible',lastAttempt:attempt})){
          // If storage is blocked, defer instead of risking a refresh loop.
          try{sessionStorage.setItem('reloo-runtime-attempt',JSON.stringify({build:data.build,at:Date.now()}));}catch{return;}
          reloading=true;location.reload();
        }
      }catch{/* Offline/timeout: keep the current usable screen. */}finally{clearTimeout(timeout);checking=false;}
    }
    const events=['pageshow','focus','online','visibilitychange','reloo-native-active'];
    events.forEach(e=>window.addEventListener(e,check));
    document.addEventListener('visibilitychange',check);
    document.addEventListener('reloo-native-active',check);
    document.addEventListener('pointerdown',remember,{passive:true});
    document.addEventListener('keydown',remember);
    window.addEventListener('scroll',remember,{passive:true});
    const initial=setTimeout(check,2500),timer=setInterval(check,30000);
    return()=>{disposed=true;controller?.abort();clearTimeout(initial);clearInterval(timer);events.forEach(e=>window.removeEventListener(e,check));document.removeEventListener('visibilitychange',check);document.removeEventListener('reloo-native-active',check);document.removeEventListener('pointerdown',remember);document.removeEventListener('keydown',remember);window.removeEventListener('scroll',remember);};
  },[path]);
  return null;
}
