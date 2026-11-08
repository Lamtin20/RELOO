'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {Neighborhood} from './Neighborhood';
const copy={'vi-VN':{owner:'Thiết lập lịch thuê và giao nhận',needs:'Nhu cầu và đề xuất theo khu vực'},'en-US':{owner:'Rental schedule and handover settings',needs:'Area requests and offers'}};
export function RentalOperationsSettings({kind='owner'}){
 const {locale}=useLocale(),[open,setOpen]=useState(false),root=useRef(null);
 useEffect(()=>{const p=new URLSearchParams(location.search);if(p.has('need')||p.get('setup')==='1'||p.get('create')==='1'){const timer=setTimeout(()=>{setOpen(true);root.current?.scrollIntoView({block:'start'});},0);return()=>clearTimeout(timer);}},[]);
 return <details ref={root} className="rental-shared-settings" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{(copy[locale]||copy['vi-VN'])[kind]}</summary>{open&&<Neighborhood initialTab={kind} workspace embedded/>}</details>;
}
