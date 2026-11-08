"use client";
import Link from 'next/link';
import {Search,MapPin} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {nearbyTeaserCopy} from '@/lib/i18n/footer';
export function NearbyNeedTeaser(){const {locale}=useLocale(),t=nearbyTeaserCopy[locale]||nearbyTeaserCopy['vi-VN'];return <section className="need-teaser"><div className="need-teaser__icon"><Search size={26}/></div><div><h2>{t.title}</h2></div><Link href="/needs" className="btn btn-primary">{t.action}</Link><small><MapPin size={14}/>{t.radius}</small></section>;}
