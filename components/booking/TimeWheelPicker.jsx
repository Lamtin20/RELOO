"use client";
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {rentalCalendarCopy} from '@/lib/i18n/rental-calendar';
import {availableRentalTimes,RENTAL_TIME_SLOTS,defaultRentalReturn} from '@/lib/rental-window';
import './time-wheel.css';
function TimeColumn({label,value,slots,onChange}){
 const list=useRef(null),settle=useRef(null),current=useRef({slots,onChange});
 useEffect(()=>{current.current={slots,onChange};});
 useEffect(()=>()=>clearTimeout(settle.current),[]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{const node=list.current;if(node)node.scrollTop=Math.max(0,current.current.slots.indexOf(value))*48;});return()=>cancelAnimationFrame(frame);},[value,slots.length]);
 function scroll(){clearTimeout(settle.current);settle.current=setTimeout(()=>{const {slots,onChange}=current.current,index=Math.max(0,Math.min(slots.length-1,Math.round(list.current.scrollTop/48)));if(slots[index])onChange(slots[index]);},140);}
 return <div className="tw-column"><span>{label}</span><div ref={list} className="tw-slots" role="listbox" aria-label={label} onScroll={scroll} onKeyDown={e=>{const index=slots.indexOf(value),next={ArrowDown:Math.min(slots.length-1,index+1),ArrowUp:Math.max(0,index-1),Home:0,End:slots.length-1}[e.key];if(next===undefined||!slots.length)return;e.preventDefault();onChange(slots[next]);list.current?.querySelectorAll('button')[next]?.focus({preventScroll:true});}}>{slots.map(time=><button type="button" role="option" aria-selected={time===value} tabIndex={time===value?0:-1} key={time} onClick={()=>onChange(time)}>{time}</button>)}</div></div>;
}
export function TimeWheelPicker({value,title,onApply,onClose}){
 const {locale}=useLocale(),t=rentalCalendarCopy[locale]||rentalCalendarCopy['vi-VN'],dialog=useRef(null),[now]=useState(()=>Date.now());
 const starts=availableRentalTimes(value.startDate,{now}),[start,setStart]=useState(()=>starts.includes(value.startTime)?value.startTime:starts[0]||'');
 const after=value.startDate&&start?Date.parse(`${value.startDate}T${start}:00+07:00`):null;
 const [returnDate,setReturnDate]=useState(value.endDate);
 const ends=returnDate?availableRentalTimes(returnDate,{now,after}):RENTAL_TIME_SLOTS;
 const [end,setEnd]=useState(value.endTime),selectedEnd=ends.includes(end)?end:ends[0]||'';
 useEffect(()=>{const node=dialog.current,previous=document.activeElement;node.showModal();node.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});return()=>{node.close();previous?.isConnected&&previous.focus({preventScroll:true});};},[]);
 return <dialog ref={dialog} className="rental-time-wheel" aria-label={title} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><header><h2>{t.time}</h2><button type="button" aria-label={t.closeTime} onClick={onClose}><X size={22}/></button></header><p className="tw-step-note">{t.timeStep}</p><div className="tw-columns tw-columns--slots"><TimeColumn label={t.pickup} value={start} slots={starts} onChange={time=>{setStart(time);const days=Math.max(1,Math.ceil((Date.parse(value.endDate)-Date.parse(value.startDate))/86400000));const suggestion=defaultRentalReturn(value.startDate,time,days);setEnd(suggestion.endTime);setReturnDate(suggestion.endDate);}}/><TimeColumn label={t.return} value={selectedEnd} slots={ends} onChange={setEnd}/></div>{(!starts.length||!ends.length)&&<p className="tw-step-note" role="status">{t.noTimes}</p>}<footer><strong>{start||'--:--'} &rarr; {selectedEnd||'--:--'}</strong><button type="button" disabled={!start||!selectedEnd} onClick={()=>onApply({startTime:start,endTime:selectedEnd,endDate:returnDate})}>{t.applyTime}</button></footer></dialog>;
}
