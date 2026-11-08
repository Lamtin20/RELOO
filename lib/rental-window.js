export const RENTAL_WINDOW_DAYS=365;
const vn=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function vietnamDateTime(at){const p=Object.fromEntries(vn.formatToParts(new Date(at)).map(v=>[v.type,v.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};}
export function addCalendarDays(date,days){return new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function rentalBookingWindow(now=Date.now()){const first=vietnamDateTime(now).date;return {first,last:addCalendarDays(first,RENTAL_WINDOW_DAYS-1)};}
export function withinRentalWindow(start,end,now=Date.now()){if(!Number.isFinite(start)||!Number.isFinite(end)||start<now||end<=start)return false;const w=rentalBookingWindow(now);return vietnamDateTime(start).date>=w.first&&vietnamDateTime(end).date<=w.last;}
export const RENTAL_TIME_STEP=30;
export const RENTAL_TIME_SLOTS=Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`);
export function suggestedRentalTimes(now=Date.now(),days=1){
 const step=RENTAL_TIME_STEP*60000,start=Math.ceil((now+2*3600000)/step)*step;
 const a=vietnamDateTime(start),b=vietnamDateTime(start+Math.max(1,Number(days)||1)*86400000-1800000);
 return {startDate:a.date,endDate:b.date,startTime:a.time,endTime:b.time};
}
export function defaultRentalReturn(startDate,startTime,days=1){
 const start=Date.parse(`${startDate}T${startTime}:00+07:00`);
 if(!Number.isFinite(start)||!Number.isSafeInteger(days)||days<1)throw Error('INVALID_RENTAL_START');
 const end=vietnamDateTime(start+days*86400000-1800000);
 return {endDate:end.date,endTime:end.time};
}
export function availableRentalTimes(date,{now=Date.now(),after=null}={}){
 const window=rentalBookingWindow(now);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date<window.first||date>window.last)return [];
 return RENTAL_TIME_SLOTS.filter(time=>{const at=Date.parse(`${date}T${time}:00+07:00`);return at>now&&(after==null||at>after);});
}
