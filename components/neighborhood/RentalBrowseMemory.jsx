'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {useAuth} from '@/lib/store';
import {isNative} from '@/lib/mobile/client';
import {App} from '@capacitor/app';
const KEY='reloo-rental-browse-v1';
export function RentalBrowseMemory(){
 const {user,hydrated}=useAuth(),path=usePathname(),started=useRef(false);
 useEffect(()=>{
  if(!isNative()||!hydrated)return;
  let cancelled=false;
  try{
   if(!user){localStorage.removeItem(KEY);started.current=true;return;}
   const old=JSON.parse(localStorage.getItem(KEY)||'null');
   if(old&&old.actor!==user.id)localStorage.removeItem(KEY);
   if(old&&(!Number.isFinite(old.savedAt)||Date.now()-old.savedAt<0||Date.now()-old.savedAt>=86400000))localStorage.removeItem(KEY);
   if(!started.current){started.current=true;if(path==='/'&&user.profileComplete!==false&&old?.actor===user.id&&Date.now()-old.savedAt>=0&&Date.now()-old.savedAt<86400000&&typeof old.path==='string'&&old.path.startsWith('/noi-khu?')){const target=new URL(old.path,location.origin);if(target.origin===location.origin&&target.pathname==='/noi-khu'){App.getLaunchUrl().then(launch=>{if(!cancelled&&!launch?.url&&!sessionStorage.getItem('reloo-native-auth')&&location.pathname==='/'&&!location.search)location.replace(target.pathname+target.search);}).catch(()=>{});return()=>{cancelled=true;};}}}
  }catch{/* Local preferences are optional. */}
  function save(){if(location.pathname!=='/noi-khu')return;try{const source=new URLSearchParams(location.search),safe=new URLSearchParams();for(const [k,v] of source)if(['lang','area','subzone','building','scope','q','category','price','deposit','start','end'].includes(k)&&v.length<=200)safe.set(k,v);localStorage.setItem(KEY,JSON.stringify({actor:user.id,savedAt:Date.now(),path:'/noi-khu?'+safe}));}catch{}}
  save();document.addEventListener('reloo-browse-filter-changed',save);document.addEventListener('visibilitychange',save);return()=>{cancelled=true;document.removeEventListener('reloo-browse-filter-changed',save);document.removeEventListener('visibilitychange',save);};
 },[path,user,hydrated]);return null;
}
