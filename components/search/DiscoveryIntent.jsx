'use client';
import {ShoppingBag,CalendarDays,ArrowRightLeft,X} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {homeDiscoveryCopy} from '@/lib/i18n/home-discovery';
import {discoveryCopy} from '@/lib/i18n/discovery';
import {rentalDays} from '@/lib/rental-estimate';
import './discovery-intent.css';
export function DiscoveryIntent({params,onChange,count,loading,hasLocation,categoryLabel,groupLabel}){
 const {locale}=useLocale(),t=discoveryCopy[locale]||discoveryCopy['vi-VN'],h=homeDiscoveryCopy[locale]||homeDiscoveryCopy['vi-VN'],mode=params.get('rentalPlan')==='LONG'&&params.get('transaction')==='RENT'?'LONG_RENT':params.get('transaction')||'',days=rentalDays(params.get('days'));
 const choices=[...new Set([1,3,7,14,30,...(days?[days]:[])])].filter(n=>mode!=='LONG_RENT'||n>=30).sort((a,b)=>a-b);
 const chips=[['q',t.query,params.get('q')],['category',t.category,categoryLabel],['group',t.category,params.get('group')?(groupLabel||params.get('group')):null],['min',t.min,params.get('min')],['max',t.max,params.get('max')],['saved',t.saved,params.get('saved')==='1'?t.saved:null]].filter(([, ,v])=>v);
 return <section className="discovery-intent container" aria-label={t.intent}>
  <div className="di-heading"><div><span>{t.eyebrow}</span><h1>{mode==='SALE'?(locale==='en-US'?'Find your next favourite':'Món đồ bạn đang tìm'):mode==='RENT'||mode==='LONG_RENT'?(locale==='en-US'?'What do you need to rent?':'Bạn cần thuê gì?'):t.title}</h1></div><div className="di-modes" role="group" aria-label={t.intent}>{[['',t.all,ArrowRightLeft],['RENT',h.RENT,CalendarDays],['LONG_RENT',h.LONG_RENT,CalendarDays],['SALE',h.SALE,ShoppingBag]].filter(([id])=>mode==='SALE'?id==='SALE':['RENT','LONG_RENT'].includes(mode)?['RENT','LONG_RENT'].includes(id):true).map(([id,label,Icon])=><button type="button" key={id} aria-pressed={mode===id} onClick={()=>onChange({transaction:id==='LONG_RENT'?'RENT':id,rentalPlan:id==='LONG_RENT'?'LONG':'',...(id==='LONG_RENT'&&(!days||days<30)?{days:'30',start:'',end:'',pickupTime:'',returnTime:''}:{})})}><Icon size={17}/>{label}</button>)}</div></div>
  <div className="di-context">{mode!=='SALE'&&<label><CalendarDays size={17}/><span>{t.duration}</span><select aria-label={t.duration} value={days||''} onChange={e=>onChange({days:e.target.value,start:"",end:"",pickupTime:"",returnTime:""})}><option value="">{t.unspecified}</option>{choices.map(n=><option value={n} key={n}>{t.days(n)}</option>)}</select></label>}<span className="di-unit">{mode==='SALE'?t.salePrice:['RENT','LONG_RENT'].includes(mode)?t.daily:t.mixedPrice}</span></div>
  <div className="di-results"><strong role="status">{loading?t.loading:t.results(count)}</strong>{chips.length>0&&<button type="button" onClick={()=>onChange({q:'',category:'',group:'',min:'',max:'',saved:'',rentalPlan:'',days:'',sort:'',start:'',end:'',pickupTime:'',returnTime:''})}>{t.clear}</button>}</div>
  {chips.length>0&&<div className="di-chips">{chips.map(([key,label,value])=><button type="button" key={key} aria-label={`${t.remove}: ${label} ${value}`} onClick={()=>onChange({[key]:''})}><span>{key==='saved'?label:`${label}: ${value}`}</span><X size={13}/></button>)}</div>}
 </section>;
}
