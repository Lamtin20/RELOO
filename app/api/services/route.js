import {createHash} from 'node:crypto';
import {requireAccount} from '@/lib/security/authorization';
import {securityDb} from '@/lib/security/service';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
import {SERVICE_TYPES,SERVICE_CITIES,serviceInput,publicServiceOffer,clarifyNeed} from '@/lib/services/domain';
import {requireServiceSandbox,serviceSandbox,serviceUuid} from '@/lib/services/server';
import {redactAdvisorText} from '@/lib/support/advisor';
import {runtimeBrain,recordAiEvent} from '@/lib/chat-control/runtime';
const reply=data=>Response.json(data,{headers:{'Cache-Control':'private,no-store'}});
export async function GET(request){try{
 rateLimit(request,'service-read',60);if(!serviceSandbox())return reply({ok:true,available:false,offers:[],requests:[],mine:[]});
 const db=securityDb();let actor=null;try{actor=(await requireAccount(request,{active:false})).profile.id}catch(e){if(e.status!==401)throw e}
 if(actor&&!/^[a-zA-Z0-9_-]{1,150}$/.test(actor))throw new HttpError(403,'ACCOUNT_UNAVAILABLE','ACCOUNT_UNAVAILABLE');
 const offers=await db.from('service_offers').select('*').eq('status','APPROVED').order('created_at',{ascending:false}).limit(100);if(offers.error)throw Error('SERVICE_UNAVAILABLE');
 let mine=[],requests=[];
 if(actor){
  const owned=await db.from('service_offers').select('*').eq('owner_id',actor).order('created_at',{ascending:false}).limit(50);
  const incoming=await db.from('service_requests').select('*,service_events(id,actor_id,kind,body,created_at)').or('requester_id.eq.'+actor+',provider_id.eq.'+actor).order('created_at',{ascending:false}).limit(50);
  if(owned.error||incoming.error)throw Error('SERVICE_UNAVAILABLE');mine=owned.data;requests=incoming.data.map(r=>({...r,status:['SENT','ACCEPTED','QUOTED'].includes(r.status)&&(Date.parse(r.expires_at)<=Date.now()||Date.parse(r.need.start)<=Date.now())?'EXPIRED':r.status,service_events:r.service_events.sort((a,b)=>a.id-b.id)}));
 }
 return reply({ok:true,available:true,demo:true,actor,offers:offers.data.map(publicServiceOffer).filter(Boolean),mine,requests});
}catch(e){return errorResponse(e)}}
export async function POST(request){try{
 assertOrigin(request);rateLimit(request,'service-write',25);requireServiceSandbox();const input=await readJson(request,8000);
 if(input.action==='clarify'){if(typeof input.text!=='string'||input.text.length>500)throw new HttpError(400,'INVALID_INPUT','INVALID_INPUT');const db=securityDb(),brain=await runtimeBrain(db);const enabled=brain.config.enabled&&brain.config.modules.includes('jobs'),prepared=clarifyNeed(input.text,input.locale);await recordAiEvent(db,{source:'services',kind:'need_clarified',version:brain.id,data:{category:prepared.category,city:prepared.city,unsupported:prepared.unsupported,decision:enabled?'RULE_CLARIFICATION':'BOT_PAUSED',answer:enabled?prepared.question:undefined,model:'RELOO_RULES'}});if(!enabled)throw new HttpError(503,'ADVISOR_PAUSED','ADVISOR_PAUSED');return reply({ok:true,...prepared});}
 const {db,profile}=await requireAccount(request,{active:false});
 if(!serviceUuid(input.requestId)||!['offer','edit','submit','pause','block','unblock','send','accept','decline','quote','confirm','begin','complete','cancel','dispute','note'].includes(input.action))throw new HttpError(400,'INVALID_INPUT','INVALID_INPUT');
 let data={};
 if(['offer','edit'].includes(input.action)){
  const {title,category,city,rate}=input;
  if(typeof title!=='string'||title.trim().length<3||title.length>100||!SERVICE_TYPES.includes(category)||!SERVICE_CITIES.includes(city)||!Number.isSafeInteger(Number(rate))||Number(rate)<1000||Number(rate)>10000000)throw new HttpError(400,'INVALID_OFFER','INVALID_OFFER');
  data={title:redactAdvisorText(title.trim()),category,city,rate:Number(rate)};
  if(input.action==='edit'){if(!serviceUuid(input.id))throw new HttpError(400,'INVALID_ID','INVALID_ID');data.id=input.id;}
 }else if(input.action==='send'){
  if(!serviceUuid(input.offerId)||input.accepted!==true||!Number.isSafeInteger(input.expectedRate))throw new HttpError(400,'REVIEW_REQUIRED','REVIEW_REQUIRED');
  let need;try{need=serviceInput(input.need)}catch(e){throw new HttpError(400,e.message,e.message)}
  data={offerId:input.offerId,expectedRate:input.expectedRate,accepted:true,need};
 }else{
  if(!serviceUuid(input.id))throw new HttpError(400,'INVALID_ID','INVALID_ID');data={id:input.id};
  if(input.action==='confirm'){if(input.accepted!==true)throw new HttpError(400,'REVIEW_REQUIRED','REVIEW_REQUIRED');data.accepted=true;}
  if(input.action==='note'){if(typeof input.body!=='string'||!input.body.trim()||input.body.length>240)throw new HttpError(400,'INVALID_NOTE','INVALID_NOTE');data.body=redactAdvisorText(input.body.trim());}
  if(input.action==='block'){const start=Date.parse(input.start),end=Date.parse(input.end);if(!Number.isFinite(start)||!Number.isFinite(end)||start<=Date.now()||end<=start||end-start>7*86400000)throw new HttpError(400,'INVALID_SCHEDULE','INVALID_SCHEDULE');data.start=new Date(start).toISOString();data.end=new Date(end).toISOString();}
  if(input.action==='unblock'){if(!Number.isFinite(Date.parse(input.start)))throw new HttpError(400,'INVALID_SCHEDULE','INVALID_SCHEDULE');data.start=input.start;}
 }
 const hash=createHash('sha256').update(JSON.stringify({action:input.action,data})).digest('hex');
 const result=await db.rpc('reloo_service_action',{p_actor:profile.id,p_request:input.requestId,p_hash:hash,p_action:input.action,p_data:data});
 if(result.error){const reason=result.error.message||'',code=['SCHEDULE_CONFLICT','PRICE_CHANGED','REQUEST_CONFLICT','INVALID_STATE','REQUEST_DENIED','OFFER_DENIED','OFFER_UNAVAILABLE'].find(c=>reason.includes(c))||'SERVICE_CHANGED_RETRY';throw new HttpError(code.includes('DENIED')?403:409,code,code);}
 return reply(result.data);
}catch(e){return errorResponse(e)}}
