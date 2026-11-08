import {neighborhoodLocale} from '@/lib/neighborhood/locale-server';
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { Neighborhood } from "@/components/neighborhood/Neighborhood";
import { text } from "@/lib/neighborhood/content";
import {redirect} from 'next/navigation';
import {neighborhoodDestination} from '@/lib/neighborhood/experience';
export async function generateMetadata({ searchParams }) {
  const p = await searchParams,
    lang = await neighborhoodLocale(p.lang);
  return {
    title: text(lang, "brand"),
    description: text(lang, "tagline"),
    robots: { index: false, follow: true },
  };
}
export default async function Page({ searchParams }) {
  const p = await searchParams,
    initialFilter = {};
  const destination=p.order?'orders':p.need?'needs':p.tab;
  if(destination&&destination!=='browse'&&['orders','owner','residency','notifications','needs'].includes(destination))redirect(neighborhoodDestination(destination,Object.fromEntries(Object.entries(p).filter(([,v])=>typeof v==='string'))));
  for (const key of [
    "area",
    "subzone",
    "building",
    "scope",
    "q",
    "category",
    "price",
    "deposit",
    "start",
    "end",
  ])
    if (typeof p[key] === "string" && p[key].length < 200)
      initialFilter[key] = p[key];
  const tabs = [
    "browse",
    "residency",
    "needs",
    "orders",
    "owner",
    "notifications",
  ];
  return (
    <MarketplaceShell>
      <Neighborhood
        initialLocale={await neighborhoodLocale(p.lang)}
        initialTab={
          p.order ? "orders" : tabs.includes(p.tab) ? p.tab : "browse"
        }
        initialFilter={initialFilter}
      />
    </MarketplaceShell>
  );
}
