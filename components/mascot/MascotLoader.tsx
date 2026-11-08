'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import Image from 'next/image';
import {Check,Package,RotateCw} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {loadingCopy} from '@/lib/i18n/loading';
import {RELOOP_MASTER} from '@/lib/mascot/artwork';
import './mascot-loader.css';
export type MascotLoaderProps={state?:'loading'|'success'|'error';progress?:number;message?:string;size?:number;className?:string;compact?:boolean;locale?:string;onRetry?:()=>void};
export function MascotLoader({state='loading',progress,message,size=132,className='',compact=false,locale:requestedLocale,onRetry}:MascotLoaderProps){
 const {locale}=useLocale(),t=loadingCopy[requestedLocale||locale]||loadingCopy['vi-VN'];
 const [slow,setSlow]=useState(false),measured=typeof progress==='number'&&Number.isFinite(progress),value=measured?Math.max(0,Math.min(100,progress!)):undefined;
 useEffect(()=>{if(state!=='loading')return;const timer=setTimeout(()=>setSlow(true),15000);return()=>clearTimeout(timer);},[state]);
 const dimension=compact?30:Math.max(64,Math.min(196,size));
 return <span className={`mascot-loader ${compact?'is-compact':''} ${className}`} data-state={state} style={{'--mascot-size':`${dimension}px`} as CSSProperties}>
  <span className="mascot-loader__stage" aria-hidden="true"><span className="mascot-loader__halo"/><span className="mascot-loader__floor"/>
   <span className="mascot-loader__trail"><svg viewBox="0 0 220 100" fill="none"><path d="M110 52C84 3 20 5 20 52s63 47 90 0 90-47 90 0-63 47-90 0Z"/></svg></span>
   <span className="mascot-loader__character"><Image src={RELOOP_MASTER} width={320} height={320} alt="" unoptimized draggable={false} loading="eager"/></span>
   <span className="mascot-loader__parcel"><Package size={17} strokeWidth={1.7}/></span><span className="mascot-loader__spark is-one"/><span className="mascot-loader__spark is-two"/>
   {state!=='loading'&&<span className="mascot-loader__result">{state==='success'?<Check size={19}/>:<RotateCw size={18}/>}</span>}
  </span>
  <span className="mascot-loader__copy"><span role="status" aria-live="polite" aria-atomic="true">{message||t[state]}</span>{!compact&&state==='loading'&&<small>{slow?t.slow:t.hint}</small>}</span>
  {state==='loading'&&measured&&<span className="mascot-loader__progress" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{width:`${value}%`}}/></span>}
  {onRetry&&(state==='error'||(state==='loading'&&slow))&&<button type="button" className="mascot-loader__retry" onClick={()=>{setSlow(false);onRetry();}}>{t.retry}</button>}
 </span>;
}
