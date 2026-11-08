import {withinRentalWindow} from './rental-window.js';
export function vietnamToday(now=Date.now()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
export function calendarMonth(today,offset){const [y,m]=today.split('-').map(Number),first=new Date(Date.UTC(y,m-1+offset,1)),year=first.getUTCFullYear(),month=first.getUTCMonth(),pad=n=>String(n).padStart(2,'0');return {labelDate:first,leading:(first.getUTCDay()+6)%7,dates:Array.from({length:new Date(Date.UTC(year,month+1,0)).getUTCDate()},(_,i)=>`${year}-${pad(month+1)}-${pad(i+1)}`)};}
export function selectRentalDay(value,date){return !value.startDate||value.endDate||date<value.startDate?{...value,startDate:date,endDate:''}:{...value,endDate:date};}
export function validRentalDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
export function validRentalTime(t){return /^([01]\d|2[0-3]):(?:00|30)$/.test(t||'');}
export function calendarRange(value,now=Date.now()){
 const date=validRentalDate;
 if(!date(value.startDate)||!date(value.endDate)||![value.startTime,value.endTime].every(validRentalTime))return {error:'missing'};
 const start=Date.parse(value.startDate+'T'+value.startTime+':00+07:00'),end=Date.parse(value.endDate+'T'+value.endTime+':00+07:00');
 if(!withinRentalWindow(start,end,now))return {error:'invalid'};
 return {start,end,days:Math.ceil((end-start)/86400000)};
}
