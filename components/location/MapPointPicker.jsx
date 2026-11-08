'use client';
import {useState} from 'react';
import {LiveMap} from './LiveMap';
import {useLocale} from '@/components/settings/LocaleProvider';
import {approximatePoint} from '@/lib/maps/spatial';
export function MapPointPicker({value,onChange}){
 const [open,setOpen]=useState(false),{locale}=useLocale(),en=locale==='en-US';let point=null;try{point=approximatePoint(value)}catch{}
 return <div><button type="button" className="btn btn-secondary" aria-expanded={open} onClick={()=>setOpen(!open)}>{en?'Choose point on map':'Chọn điểm trên bản đồ'}</button>{point&&<p className="input-hint">{en?'Public approximate area':'Khu vực công khai gần đúng'}: {point.lat.toFixed(3)}, {point.lng.toFixed(3)} · ~1,6 km</p>}{open&&<LiveMap pointOnly compact center={value} onPick={onChange}/>}</div>;
}
