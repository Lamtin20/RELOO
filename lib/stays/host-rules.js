// RELOO rules. Not a claim about Dayladau internals. No network or AI invocation.
export function listingLink(value){
 let u;try{u=new URL(value)}catch{throw Error('INVALID_LINK')}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('INVALID_LINK');
 const host=u.hostname.toLowerCase(),provider=['airbnb.com','www.airbnb.com','airbnb.com.vn','www.airbnb.com.vn'].includes(host)?'Airbnb':host==='booking.com'||host==='www.booking.com'?'Booking.com':host==='go2joy.vn'||host==='www.go2joy.vn'?'Go2Joy':null;
 if(!provider||u.pathname==='/'||u.pathname.length>500)throw Error('SOURCE_NOT_ALLOWED');
 // Queries can carry tokens/PII. Never retain them in the draft.
 return {provider,url:u.origin+u.pathname,status:'MANUAL_REVIEW',aiConnected:false,fields:{title:'',description:'',amenities:[]}};
}
function icalDate(key,value){
 const dateOnly=key==='DTSTART;VALUE=DATE'||key==='DTEND;VALUE=DATE';
 let iso;
 if(dateOnly){if(!/^\d{8}$/.test(value))throw Error('ICAL_DATE');iso=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T00:00:00+07:00'}
 else{
  const utc=/^(DTSTART|DTEND)$/.test(key)&&/^\d{8}T\d{6}Z$/.test(value);
  const vn=/^(DTSTART|DTEND);TZID=Asia\/Ho_Chi_Minh$/.test(key)&&/^\d{8}T\d{6}$/.test(value);
  if(!utc&&!vn)throw Error('ICAL_TIMEZONE');
  iso=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(9,11)+':'+value.slice(11,13)+':'+value.slice(13,15)+(utc?'Z':'+07:00');
 }
 const ms=Date.parse(iso);if(!Number.isFinite(ms))throw Error('ICAL_DATE');
 const local=iso.slice(0,19),round=new Date(ms+(iso.endsWith('+07:00')?7*3600000:0)).toISOString().slice(0,19);
 if(round!==local)throw Error('ICAL_DATE');return new Date(ms).toISOString();
}
export function parseStayIcal(text){
 if(typeof text!=='string'||text.length>50000)throw Error('ICAL_TOO_LARGE');
 const lines=text.replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(lines[0]!=='BEGIN:VCALENDAR'||lines.at(-1)!=='END:VCALENDAR')throw Error('ICAL_INVALID');
 const events=[],uids=new Set();let event=null;
 for(const line of lines){
  if(line==='BEGIN:VEVENT'){if(event)throw Error('ICAL_INVALID');event={};continue}
  if(line==='END:VEVENT'){
   if(!event?.uid||uids.has(event.uid))throw Error('ICAL_UID');uids.add(event.uid);
   if(event.cancelled)events.push({uid:event.uid,cancelled:true});
   else{if(!event.startsAt||!event.endsAt||event.endsAt<=event.startsAt)throw Error('ICAL_DATE');events.push(event)}
   if(events.length>100)throw Error('ICAL_TOO_MANY_EVENTS');event=null;continue;
  }
  if(!event)continue;
  const colon=line.indexOf(':');if(colon<1)throw Error('ICAL_INVALID');const key=line.slice(0,colon),value=line.slice(colon+1);
  if(/^(RRULE|RDATE|EXDATE|RECURRENCE-ID|DURATION)(;|$)/.test(key))throw Error('ICAL_UNSUPPORTED_RECURRENCE');
  if(key==='UID'){if(event.uid||!value||value.length>200||/[\x00-\x1f]/.test(value))throw Error('ICAL_UID');event.uid=value}
  if(key==='STATUS')event.cancelled=value==='CANCELLED';
  if(/^DTSTART(;|$)/.test(key)){if(event.startsAt)throw Error('ICAL_DATE');event.startsAt=icalDate(key,value)}
  if(/^DTEND(;|$)/.test(key)){if(event.endsAt)throw Error('ICAL_DATE');event.endsAt=icalDate(key,value)}
  // Ignore SUMMARY, DESCRIPTION, LOCATION and attendee PII. Availability only.
 }
 if(event)throw Error('ICAL_INVALID');return events;
}
export function hostAutomationPreview(order,cleaningMinutes=60){
 const valid=['CONFIRMED','CHECKED_IN','COMPLETED'].includes(order.status);
 return {
  cleaning:valid?{status:'PLANNED',startsAt:order.ends_at,endsAt:new Date(Date.parse(order.ends_at)+cleaningMinutes*60000).toISOString(),delivery:'NOT_CONNECTED'}:null,
  checkin:{eligible:valid&&order.payment_status==='PAID'&&order.status!=='COMPLETED',delivery:'NOT_CONNECTED',code:null},
  review:{eligible:order.status==='COMPLETED',delivery:'NOT_CONNECTED'}
 };
}
export const sampleStayIcal='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:reloo-synthetic-ota-01\r\nDTSTART;VALUE=DATE:20271105\r\nDTEND;VALUE=DATE:20271107\r\nEND:VEVENT\r\nEND:VCALENDAR';

// RELOO access policy proposal, informed by the observed Host guide UI.
// It is intentionally separate from notification delivery and smart-lock providers.
export function checkinGuideAccess({method,hasGuide,hasCodes,releaseHours=2,order,now=Date.now()}){
 if(!['FULL_SELF','PARTIAL_SELF','HOST','RECEPTION_24H','RECEPTION_HOURS'].includes(method)||![0,1,2,3,6,12,24,48].includes(releaseHours))throw Error('INVALID_ARRIVAL_POLICY');
 if(!hasGuide)return {allowed:false,reason:'GUIDE_REQUIRED'};
 if(method==='FULL_SELF'&&!hasCodes)return {allowed:false,reason:'CODE_REQUIRED'};
 if(!order||!['CONFIRMED','CHECKED_IN'].includes(order.status)||order.payment_status!=='PAID')return {allowed:false,reason:'BOOKING_NOT_ELIGIBLE'};
 const starts=Date.parse(order.starts_at),ends=Date.parse(order.ends_at);
 if(!Number.isFinite(starts)||!Number.isFinite(ends)||ends<=starts||!Number.isFinite(now))throw Error('INVALID_ARRIVAL_POLICY');
 const opensAt=releaseHours===0?null:starts-releaseHours*3600000;
 if(now>=ends)return {allowed:false,reason:'STAY_ENDED'};
 if(opensAt!==null&&now<opensAt)return {allowed:false,reason:'TOO_EARLY',opensAt:new Date(opensAt).toISOString()};
 return {allowed:true,reason:'ELIGIBLE',delivery:'NOT_CONNECTED'};
}
