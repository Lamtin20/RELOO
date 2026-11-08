'use client';
import {useState} from 'react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {coordinate} from '@/lib/maps/spatial';
import {validateGpsFix} from '@/lib/maps/precise-location';
import {currentLocation} from '@/lib/mobile/location';
import {LiveMap} from './LiveMap';
async function requestGpsFix(){const c=await currentLocation();return validateGpsFix({lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,capturedAt:Date.now()})}
export function HandoverPointPreview({location}){
 const {locale}=useLocale(),en=locale==='en-US',[open,setOpen]=useState(false),[route,setRoute]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 let to=null;try{to=coordinate(location?.coords)}catch{}
 async function navigate(){setBusy(true);setError('');try{const from=await requestGpsFix();const r=await fetch('/api/maps/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from,to,mode:'driving',approximateDestination:false})}),d=await r.json();if(!r.ok)throw Error();setRoute({...d,from,to});setOpen(true)}catch{setError(en?'Allow a GPS fix below 20 m and check routing availability.':'Cần cho phép GPS dưới 20 m và dịch vụ chỉ đường sẵn sàng.')}finally{setBusy(false)}}
 if(!to)return null;
 return <section aria-label={en?'Shared handover point':'Điểm giao nhận đã chia sẻ'}><strong>{en?'Selected handover pin':'Ghim giao nhận do khách chọn'}</strong><p>{to.lat.toFixed(6)}, {to.lng.toFixed(6)}</p>{typeof location.entranceNote==='string'&&<p>{location.entranceNote.slice(0,300)}</p>}<button type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{en?'View private map':'Xem bản đồ riêng tư'}</button><button type="button" disabled={busy} onClick={()=>navigate()}>{en?'Allow GPS & preview route':'Cho phép GPS & xem tuyến đến'}</button>{open&&<LiveMap pointOnly precisePick compact center={to} routePreview={route}/>} {route&&<p>{Math.round(route.distanceMeters)} m · {Math.ceil(route.durationSeconds/60)} min · {en?'No live traffic':'Không có giao thông trực tiếp'}</p>}{error&&<p role="alert">{error}</p>}</section>;
}
