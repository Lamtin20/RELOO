'use client';
import Link from 'next/link';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {PartnerFeed} from '@/components/listings/PartnerFeed';
import {useLocale} from '@/components/settings/LocaleProvider';
import {homeDiscoveryCopy} from '@/lib/i18n/home-discovery';
import {homeDiscoveryHref} from '@/lib/search/home-discovery';
import {useReloo} from '@/lib/store';
export function PartnerDiscovery({channel}){const {locale}=useLocale(),t=homeDiscoveryCopy[locale]||homeDiscoveryCopy['vi-VN'],{state}=useReloo();return <MarketplaceShell><section className="discovery-intent container"><div className="di-heading"><div><span>{t.modules}</span><h1>{t[channel]}</h1></div></div><nav className="market-channels" aria-label={t.partners}>{['ALL','RENT','SALE','AFFILIATE','BRAND'].map(id=><Link className="market-channel-link" key={id} href={homeDiscoveryHref({intent:id,location:state.guestLocation})} aria-current={channel===id?'page':undefined}>{id==='ALL'?t.allProducts:t[id]}</Link>)}</nav></section><div className="container"><PartnerFeed key={channel} channel={channel} address={state.guestLocation?.province?.name||state.user?.address||''}/></div></MarketplaceShell>;}
