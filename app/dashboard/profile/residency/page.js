import {RentalContinuation} from '@/components/neighborhood/RentalContinuation';
import {neighborhoodLocale} from '@/lib/neighborhood/locale-server';
import {Neighborhood} from '@/components/neighborhood/Neighborhood';
import {ResidenceSettings} from '@/components/neighborhood/ResidenceSettings';
export default async function Page({searchParams}){const p=await searchParams,locale=await neighborhoodLocale(p.lang);return <><RentalContinuation locale={locale}/><ResidenceSettings locale={locale}/><Neighborhood initialTab="residency" initialLocale={locale} workspace/></>;}
