'use client';
import {useState} from 'react';
import Link from 'next/link';
import {MapPin,ChevronDown} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {LiveMap} from './LiveMap';
import {useSearchParams} from 'next/navigation';
export function ExploreResultsMap({listings=[],rentalSelection=null,sale=false}){
 const {locale}=useLocale(),en=locale==='en-US',[open,setOpen]=useState(false);
 const filters=useSearchParams();
 const fullMap=new URLSearchParams(filters);fullMap.set('ids',JSON.stringify(listings.slice(0,200).map(item=>String(item.id))));
 const items=listings.filter(item=>item.location),current=items[0];
 const params=sale?'?intent=SALE':rentalSelection?'?'+new URLSearchParams({start:rentalSelection.startDate,end:rentalSelection.endDate,pickupTime:rentalSelection.startTime,returnTime:rentalSelection.endTime}):'';
 return <section className="explore-results-map"><button type="button" className="explore-results-map__toggle" aria-expanded={open} onClick={()=>setOpen(!open)}><MapPin size={18}/>{en?'View locations on map':'Xem khu vực trên bản đồ'}<ChevronDown size={17}/></button>{open&&<div className="explore-results-map__body"><LiveMap query={filters.toString()} listingIds={listings.map(item=>String(item.id))}/>{current&&<div className="explore-results-map__selected"><div><strong>{current.title}</strong><span>{current.location}</span></div><Link href={'/product/'+encodeURIComponent(current.id)+params}>{en?'View item':'Xem sản phẩm'}</Link></div>}<Link href={'/ban-do?'+fullMap}>{en?'Open full map':'Mở bản đồ đầy đủ'}</Link></div>}</section>;
}
