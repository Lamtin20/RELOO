import {assertOrigin,readJson,rateLimit,HttpError,errorResponse} from '../server/http.js';
import {demoStays,DEMO_ACTOR} from './catalog.js';
import {parseStayIcal,listingLink} from './host-rules.js';

export function stayTestRequest(request){
 const u=new URL(request.url);
 return process.env.NODE_ENV==='development'&&process.env.RELOO_STAYS_TEST_MODE==='1'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);
}
async function localDb(){
 const {PGlite}=await import('@electric-sql/pglite');
 // A single connection per isolated local preview; actual inventory arbitration lives in SQL.
 if(!process.env.RELOO_STAYS_TEST_DB)throw Error('TEST_DATABASE_MISSING');
 globalThis.__relooStayDb??=new PGlite(process.env.RELOO_STAYS_TEST_DB);
 return globalThis.__relooStayDb;
}
export async function staysGet(request){
 rateLimit(request,'stays-catalog',100);
 let stays=demoStays;
 if(stayTestRequest(request)){
  try{
   const db=await localDb();
   stays=(await db.query("select p.id,rt.id as \"roomTypeId\",p.name,p.city,p.address as area,rt.name as room,rt.capacity,rt.nightly_price as \"nightlyPrice\",rt.amenities from stay_room_types rt join stay_properties p on p.id=rt.property_id where p.status='APPROVED' and p.demo and rt.enabled")).rows.map((s,i)=>({...s,tone:['garden','city','coast'][i%3]}));
  }catch{return Response.json({ok:false,code:'SERVICE_UNAVAILABLE'},{status:503});}
 }
 return Response.json({ok:true,demo:true,enabled:false,testMode:stayTestRequest(request),stays},{headers:{'Cache-Control':'no-store'}});
}
export async function staysPost(request){
 try{
  assertOrigin(request);rateLimit(request,'stays-action',60);
  const body=await readJson(request,64000);
  // Commercial mutations deliberately fail closed. No simulator on public/native production runtime.
  if(!stayTestRequest(request))throw new HttpError(503,'Đặt phòng thật chưa khả dụng.','BOOKING_UNAVAILABLE');
  const allowed=['quote','hold','pay-test','mine','order','cancel-preview','cancel','manage','transition','workspace','create-property','submit','suspend','create-room','price','block','unblock','add-unit','calendar','cleaning-buffer','external-reservation','ical-preview','ical-apply','listing-link'];
  if(!body||!allowed.includes(body.op)||!body.input||typeof body.input!=='object'||Array.isArray(body.input))throw new HttpError(400,'Yêu cầu không hợp lệ.','INVALID_INPUT');
  const input={...body.input};
  if(body.op==='listing-link')return Response.json({ok:true,demo:true,data:listingLink(input.url)},{headers:{'Cache-Control':'no-store'}});
  if(['ical-preview','ical-apply'].includes(body.op))input.events=parseStayIcal(input.ical);
  delete input.ical;
  if(body.op==='hold')input.key=request.headers.get('idempotency-key');
  const {stayCommand}=await import('./test-database.mjs');
  const db=await localDb();
  const hostOps=['calendar','cleaning-buffer','external-reservation','ical-preview','ical-apply'];
  if(hostOps.includes(body.op)){
   // Scope-check before returning an import preview; client event arrays are never trusted.
   if(body.op==='ical-preview'){await db.query('select reloo_stay_host($1,$2,$3)',[DEMO_ACTOR,'calendar',JSON.stringify(input)]);return Response.json({ok:true,demo:true,data:{events:input.events}},{headers:{'Cache-Control':'no-store'}});}
   const data=(await db.query('select reloo_stay_host($1,$2,$3) as data',[DEMO_ACTOR,body.op,JSON.stringify(input)])).rows[0].data;
   return Response.json({ok:true,demo:true,data},{headers:{'Cache-Control':'no-store'}});
  }
  const management=['workspace','create-property','submit','suspend','create-room','price','block','unblock','add-unit'];
  const data=management.includes(body.op)?(await db.query('select reloo_stay_manage($1,false,$2,$3) as data',[DEMO_ACTOR,body.op,JSON.stringify(input)])).rows[0].data:await stayCommand(db,DEMO_ACTOR,body.op,input);
  return Response.json({ok:true,demo:true,data},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  if(e instanceof HttpError)return errorResponse(e);
  const code=(e.code?.startsWith('22')?'INVALID_INPUT':null)||['ICAL_TOO_LARGE','ICAL_DATE','ICAL_TIMEZONE','ICAL_UID','ICAL_INVALID','ICAL_TOO_MANY_EVENTS','ICAL_UNSUPPORTED_RECURRENCE','INVALID_LINK','SOURCE_NOT_ALLOWED','ACTIVE_INVENTORY','INVALID_SOURCE','INVALID_REFERENCE','INVALID_TIME','SOLD_OUT','QUOTE_EXPIRED','PRICE_CHANGED','POLICY_CHANGED','IDEMPOTENCY_CONFLICT','NOT_FOUND','FORBIDDEN','PAYMENT_INVALID','EVENT_CONFLICT','ALREADY_PAID','CANCEL_UNAVAILABLE','POLICY_UNAVAILABLE','INVALID_OPERATION','INVALID_KEY','INVALID_DATES_OR_GUESTS','INVALID_DATES','INVALID_INPUT','INVALID_STATE','SLOT_CONFLICT','UNAVAILABLE'].find(c=>e.message?.includes(c));
  return Response.json({ok:false,code:code||'SERVICE_UNAVAILABLE'},{status:code==='FORBIDDEN'?403:code==='NOT_FOUND'?404:code?.startsWith('INVALID')?400:code?409:503,headers:{'Cache-Control':'no-store'}});
 }
}
