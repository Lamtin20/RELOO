'use client';
import Link from 'next/link';
import {UserRound,ClipboardList,IdCard,Settings,Gift,HelpCircle,Package,Heart,Plus,ShieldCheck} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {accountLayoutCopy} from '@/lib/i18n/account-layout';
const items=[['#account-overview','profile',UserRound],['/lend','post',Plus],['/explore?saved=1','saved',Heart],['/dashboard/orders','orders',ClipboardList],['/dashboard/assets','assets',Package],['#account-identity','identity',IdCard],['#ah-benefits','offers',Gift],['#ah-settings','settings',Settings],['/cms/data-collection','policy',ShieldCheck],['#ah-support','support',HelpCircle]];
export function AccountSectionNav(){const {locale}=useLocale(),t=accountLayoutCopy[locale]||accountLayoutCopy['vi-VN'];return <nav className="ah-section-nav" aria-label={t.title}><h2>{t.hello}</h2><div className="ah-section-links">{items.map(([href,key,Icon])=><Link href={href} prefetch={false} key={key} aria-current={key==='profile'?'page':undefined} onClick={e=>{if(!href.startsWith('#'))return;const node=document.getElementById(href.slice(1));if(!node)return;e.preventDefault();node.scrollIntoView({block:'start',behavior:'auto'});node.tabIndex=-1;node.focus({preventScroll:true});}}><Icon size={20}/><span>{t[key]}</span></Link>)}</div></nav>;}
