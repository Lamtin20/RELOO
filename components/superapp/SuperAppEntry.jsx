'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {BedDouble,BriefcaseBusiness,Package,ShoppingBag,ArrowRight,Search,MessageCircle,Bell,Camera,Armchair} from 'lucide-react';
import {IntentLink as Link} from '@/components/mobile/IntentLink';
import {LocationChip} from '@/components/location/LocationChip';
import {useLocale} from '@/components/settings/LocaleProvider';
import {MINI_APPS,moduleSearchHref} from '@/lib/product/modules';
import {superappCopy} from '@/lib/i18n/superapp';
import {homeDesignCopy} from '@/lib/i18n/home-design';
import Image from 'next/image';
import './superapp.css';

export const miniAppIcons={stays:BedDouble,jobs:BriefcaseBusiness,rentals:Package,used:ShoppingBag};
const artIcons={stays:BedDouble,jobs:BriefcaseBusiness,rentals:Camera,used:Armchair};
export function ServiceIllustration({id}){const Icon=artIcons[id]||Package;return <div className={'sa-illustration sa-illustration--'+id} aria-hidden="true"><Icon className="sa-art-object" strokeWidth={1.5}/></div>}
export function MiniAppCards({query='',purpose='search',featured=false}){
 const {locale}=useLocale(),t=superappCopy[locale]||superappCopy['vi-VN'];
 return <nav className={'sa-apps sa-apps--'+purpose+(featured?' sa-apps--featured':'')} aria-label={t.apps}>{MINI_APPS.map(m=>{
  const Icon=miniAppIcons[m.id],href=purpose==='post'?m.postingHref:purpose==='transactions'?m.transactionsHref:moduleSearchHref(m.id,query),description=t.serviceDetails[purpose]?.[m.id]||m.hint[locale]||m.hint['vi-VN'];
  return <Link href={href} key={m.id} className={'sa-app sa-app--'+m.id+(featured?' sa-app--featured':'')}>{featured?<span className="sa-service-symbol" aria-hidden="true"><Icon size={25} strokeWidth={1.5}/></span>:<ServiceIllustration id={m.id}/>}<div className="sa-app-body"><div className="sa-app-name"><span className="sa-app-icon"><Icon size={20}/></span><strong>{m.label[locale]||m.label['vi-VN']}</strong></div><span className="sa-app-description">{description}</span><div className="sa-app-foot"><span className="sa-app-action">{(featured?t.entryActions?.[m.id]:null)||t.actions[purpose]?.[m.id]||t.open}<ArrowRight size={16}/></span>{m.status!=='AVAILABLE'&&<small>{m.status==='PREVIEW'?t.preview:t.soon}</small>}</div></div></Link>;
 })}</nav>;
}
export function SuperAppEntry(){
 const {locale}=useLocale(),t=superappCopy[locale]||superappCopy['vi-VN'],router=useRouter();
 const design=homeDesignCopy[locale]||homeDesignCopy['vi-VN'];
 const [query,setQuery]=useState(''),[domain,setDomain]=useState('');
 const quick=[{label:t.quickCamera,href:moduleSearchHref('rentals',locale==='en-US'?'camera':'máy ảnh')},{label:t.quickLuggage,href:moduleSearchHref('rentals',locale==='en-US'?'luggage':'vali')},{label:t.quickStay,href:'/dat-phong'}];
 function search(e){e.preventDefault();router.push(domain?moduleSearchHref(domain,query):'/tim-kiem'+(query.trim()?'?q='+encodeURIComponent(query.trim()):''))}
 return <section className="sa-home" aria-label={t.apps}>
  <div className="sa-top"><div className="sa-location"><LocationChip compact/></div><div className="sa-top-actions"><Link href="/dashboard/messages" aria-label={t.inbox}><MessageCircle size={21}/></Link><Link href="/notifications" aria-label={t.notifications}><Bell size={21}/></Link></div></div>
  <div className="sa-intro-grid"><div className="sa-intro-content">
  <header className="sa-hero"><p className="sa-eyebrow">{design.eyebrow}</p><h1>{design.title}{' '}<br/><span>{design.titleAccent}</span></h1><p className="sa-intro-text">{design.intro}</p></header>
  <form role="search" aria-label={t.searchLabel} className="sa-search" onSubmit={search}><label><span className="sr-only">{t.searchLabel}</span><Search size={21}/><input value={query} maxLength={160} onChange={e=>setQuery(e.target.value)} placeholder={t.placeholder}/></label><div className="sa-search-actions"><select value={domain} onChange={e=>setDomain(e.target.value)} aria-label={t.apps}><option value="">{t.all}</option>{MINI_APPS.map(m=><option key={m.id} value={m.id}>{m.label[locale]}</option>)}</select><button type="submit">{t.search}<ArrowRight size={18}/></button></div></form>
  <div className="sa-quick"><span>{t.quick}</span>{quick.map(item=><Link href={item.href} key={item.href}>{item.label}<ArrowRight size={13}/></Link>)}</div>
  </div><Link className="sa-weekend" aria-label={design.storyAction} href="/explore?transaction=RENT&group=camping"><figure><Image src="/images/reloo-camping.webp" alt={design.storyAlt} width={1600} height={1067} sizes="(max-width: 760px) 100vw, 440px" preload/><figcaption><span>{design.storyLabel}</span><strong>{design.storyTitle}</strong><span className="sa-weekend-action">{design.storyAction}<ArrowRight size={18}/></span></figcaption></figure></Link></div>
  <div className="sa-services-heading"><h2>{design.services}</h2><span aria-hidden="true">01 — 04</span></div>
  <MiniAppCards query={query} featured/>
 </section>;
}
