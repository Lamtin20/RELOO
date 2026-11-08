"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createWarmBudget} from '@/lib/mobile/navigation-warm';
import {NavigationFeedback} from './NavigationFeedback';
import {usePathname,useSearchParams} from 'next/navigation';
import {miniAppContext,miniAppHref,safeMiniAppReturn} from '@/lib/product/mini-app-navigation';
const budget=createWarmBudget();
export function IntentLink({href:originalHref,children,warmOnView=false,onFocus,onPointerEnter,onPointerDown,...rest}){
 const path=usePathname(),params=useSearchParams(),id=miniAppContext(path,params.toString());
 const href=miniAppHref(originalHref,id,safeMiniAppReturn(params.get('returnTo'),id)||safeMiniAppReturn(path+'?'+params,id));
 const ref=useRef(null),[warmHref,setWarmHref]=useState(null);
 function warm(intent){const c=navigator.connection||{};if(budget.claim(href,{intent,saveData:c.saveData,effectiveType:c.effectiveType}))setWarmHref(href);}
 useEffect(()=>{if(!warmOnView||!window.IntersectionObserver)return;let timer;const observer=new IntersectionObserver(entries=>{clearTimeout(timer);if(entries.some(e=>e.isIntersecting))timer=setTimeout(()=>{const c=navigator.connection||{};if(budget.claim(href,{saveData:c.saveData,effectiveType:c.effectiveType}))setWarmHref(href);},350);},{threshold:.5});if(ref.current)observer.observe(ref.current);return()=>{clearTimeout(timer);observer.disconnect();};},[href,warmOnView]);
 return <Link {...rest} ref={ref} href={href} prefetch={warmHref===href} onFocus={e=>{onFocus?.(e);if(!e.defaultPrevented)warm(true);}} onPointerEnter={e=>{onPointerEnter?.(e);if(!e.defaultPrevented)warm(true);}} onPointerDown={e=>{onPointerDown?.(e);if(!e.defaultPrevented)warm(true);}}>{children}<NavigationFeedback/></Link>;
}
