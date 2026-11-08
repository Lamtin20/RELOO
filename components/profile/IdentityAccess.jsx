'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {IdCard,X} from 'lucide-react';
import {useAuth} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {identityReady,identityProtectedPath} from '@/lib/identity-access';
import {identityAccessCopy} from '@/lib/i18n/identity-access';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import './identity-access.css';
const event='reloo-identity-required',key=id=>'reloo-identity-prompt:'+id;
export function requestIdentityVerification(){window.dispatchEvent(new Event(event));}
function useCopy(){const {locale}=useLocale();return identityAccessCopy[locale]||identityAccessCopy['vi-VN'];}
export function IdentityAccessBoundary({children}){
 const {user,hydrated}=useAuth(),path=usePathname(),t=useCopy(),blocked=hydrated&&user&&!identityReady(user)&&identityProtectedPath(path);
 useEffect(()=>{if(!blocked)return;const timer=setTimeout(requestIdentityVerification,0);return()=>clearTimeout(timer);},[blocked,path]);
 return blocked?<MarketplaceShell><section className="identity-action-gate container"><IdCard size={42}/><h1>{t.required}</h1><p>{t.body}</p><p>{t.optional}</p><div><Link className="btn btn-primary" href="/verify-identity">{t.verify}</Link><Link className="btn btn-secondary" href="/">{t.back}</Link></div></section></MarketplaceShell>:children;
}
export function IdentityVerificationPrompt(){
 const {user,hydrated,refreshSession}=useAuth(),path=usePathname(),router=useRouter(),t=useCopy(),[open,setOpen]=useState(false),[forcedActor,setForcedActor]=useState(null),dialog=useRef(null),actor=useRef(null),seen=useRef(null);
 const eligible=hydrated&&!!user&&(forcedActor===user.id||!identityReady(user))&&!/^\/(auth|verify-identity|dashboard\/kyc|crm|admin)(\/|$)/.test(path);
 useEffect(()=>{const previous=actor.current;actor.current=user?.id||null;if(previous!==actor.current)seen.current=null;if(previous&&previous!==actor.current)try{sessionStorage.removeItem(key(previous));}catch{}},[user?.id]);
 useEffect(()=>{
  if(!eligible)return;let disposed=false;
  function show(){if(disposed||!['/','/account'].includes(path)||document.visibilityState!=='visible'||[...document.querySelectorAll('dialog[open],[role=dialog][aria-modal=true],.consent-banner')].some(n=>n.tagName==='DIALOG'?n.open:n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'))return;if(seen.current===user.id)return;try{if(sessionStorage.getItem(key(user.id)))return;}catch{}seen.current=user.id;setOpen(true);}
  const initial=setTimeout(show,1800),timer=setInterval(show,15000);
  window.addEventListener('focus',show);
  return()=>{disposed=true;clearTimeout(initial);clearInterval(timer);window.removeEventListener('focus',show);};
 },[eligible,user?.id,path]);
 useEffect(()=>{if(!hydrated||!user)return;const required=()=>{setForcedActor(user.id);setOpen(true);void refreshSession().catch(()=>{});};window.addEventListener(event,required);return()=>window.removeEventListener(event,required);},[hydrated,user,refreshSession]);
 function dismiss(){setForcedActor(null);seen.current=user?.id||null;try{user?.id&&sessionStorage.setItem(key(user.id),'seen');}catch{}setOpen(false);}
 useEffect(()=>{if(!open||!eligible)return;const node=dialog.current,before=document.activeElement,overflow=document.body.style.overflow;node.showModal();document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow;if(before?.isConnected)before.focus({preventScroll:true});};},[open,eligible]);
 return <dialog ref={dialog} className="identity-verify-prompt" aria-labelledby="identity-access-title" onCancel={e=>{e.preventDefault();dismiss();}} onClick={e=>{if(e.target===e.currentTarget)dismiss();}}>{open&&eligible&&<><button type="button" className="identity-verify-close" aria-label={t.later} onClick={dismiss}><X size={22}/></button><span className="identity-verify-icon"><IdCard size={32}/></span><h2 id="identity-access-title">{t.title}</h2><p>{t.body}</p><p className="identity-verify-optional">{t.optional}</p><div className="identity-verify-actions"><Link className="btn btn-primary" href="/verify-identity" onClick={dismiss}>{t.verify}</Link><button type="button" className="btn btn-secondary" onClick={()=>{dismiss();if(identityProtectedPath(path))router.push('/explore');}}>{t.later}</button></div></>}</dialog>;
}
