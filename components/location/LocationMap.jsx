'use client';
import {useSyncExternalStore} from 'react';
import {MapPin,ExternalLink} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {mapLocation,mapAppUrl} from '@/lib/location-tools';
import {approximatePoint,coordinate} from '@/lib/maps/spatial';
import {LiveMap} from './LiveMap';
import './location-map.css';
const subscribe=()=>()=>{};
const mapPlatform=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1?'apple':'google';
export function LocationMap({coords,address='',approximate=false,openOnTap=false}){
 const {locale}=useLocale(),en=locale==='en-US',target=mapLocation({coords,address}),platform=useSyncExternalStore(subscribe,mapPlatform,()=>'google');
 if(!target)return null;
 let point=null;try{point=approximate?approximatePoint(coords):coordinate(coords)}catch{}
 const external=mapAppUrl({coords:point,address},platform),label=(en?'Open in ':'Mở bằng ')+(platform==='apple'?'Apple Maps':'Google Maps');
 return <section className={'location-map'+(openOnTap?' location-map--preview':'')} aria-label={en?'Location map':'Bản đồ vị trí'}><div className="location-map__heading"><span><MapPin size={17}/>{approximate?(en?'Selected area':'Khu vực đã chọn'):(en?'Location':'Vị trí')}</span><a href={external} target="_blank" rel="noopener noreferrer">{label}<ExternalLink size={14}/></a></div>{point?<LiveMap compact pointOnly center={point}/>:<p>{address}</p>}{approximate&&<p>{en?'Approximate area only. Confirm the handover address with the owner.':'Chỉ hiển thị khu vực gần đúng. Xác nhận địa chỉ giao nhận với chủ đồ.'}</p>}</section>;
}
