import {chooseRecipients} from './policy.js';
import {integrationConfig} from '../operations/integrations.js';
import {sendGmail} from '../email/gmail.js';
export async function matchNearbyRequest(db,id){
 const r=await db.from('nearby_requests').select('*').eq('id',id).single();if(r.error)throw Error('NEARBY_REQUEST_UNAVAILABLE');
 if(r.data.status!=='OPEN'||Date.parse(r.data.expires_at)<=Date.now()||r.data.match_status==='MATCHED')return {status:'SKIPPED'};
 const members=[];let complete=false;
 for(let offset=0;offset<10000;offset+=500){const page=await db.rpc('reloo_nearby_candidates',{p_request:id}).range(offset,offset+499);if(page.error)throw Error('NEARBY_MATCH_UNAVAILABLE');members.push(...page.data);if(page.data.length<500){complete=true;break;}}
 if(!complete)throw Error('NEARBY_MATCH_REQUIRES_REVIEW');
 const selected=chooseRecipients(r.data,members),saved=await db.rpc('reloo_queue_nearby_deliveries',{p_request:id,p_kind:selected.kind,p_members:selected.members.map(m=>({profile_id:m.profile_id}))});
 if(saved.error)throw Error('NEARBY_QUEUE_FAILED');return {status:'MATCHED',kind:selected.kind,count:saved.data};
}
export async function deliverNearbyBatch(db,{sender=sendGmail,configLoader=integrationConfig}={}){
 const config=await configLoader(db,'GMAIL');
 if(!config.sender||!['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN'].every(k=>config[k]))return {status:'WAITING_FOR_GMAIL'};
 const pending=await db.from('nearby_request_deliveries').select('request_id,profile_id,distance_km,kind').eq('status','QUEUED').order('created_at').limit(5);
 if(pending.error)throw Error('NEARBY_DELIVERIES_UNAVAILABLE');
 for(const d of pending.data){
  const [request,member,profile]=await Promise.all([db.from('nearby_requests').select('*').eq('id',d.request_id).single(),db.from('nearby_member_locations').select('email_enabled,province_code,latitude,longitude,updated_at').eq('profile_id',d.profile_id).maybeSingle(),db.from('profiles').select('email,name,activation_status,deleted_at').eq('id',d.profile_id).single()]);
  if(request.error||member.error||profile.error)throw Error('NEARBY_SEND_CHECK_FAILED');
  const r=request.data,m=member.data,p=profile.data;
  const candidates=await db.rpc('reloo_nearby_candidates',{p_request:d.request_id}).eq('profile_id',d.profile_id);if(candidates.error)throw Error('NEARBY_SEND_CHECK_FAILED');
  if(r.status!=='OPEN'||Date.parse(r.expires_at)<=Date.now()||!m?.email_enabled||m.province_code!==r.province_code||p.deleted_at||p.activation_status!=='ACTIVE'||!p.email||!candidates.data.length){await db.from('nearby_request_deliveries').update({status:'SKIPPED',result_code:'NO_LONGER_ELIGIBLE',updated_at:new Date().toISOString()}).eq('request_id',d.request_id).eq('profile_id',d.profile_id).eq('status','QUEUED');continue;}
  const claim=await db.rpc('reloo_claim_nearby_email',{p_request:d.request_id,p_recipient:d.profile_id});if(claim.error)throw Error('NEARBY_CLAIM_FAILED');if(!claim.data)continue;
  try{
   const result=await sender(config,p.email,{kind:'nearby',name:p.name,title:r.mode==='BUY'?'Có người gần bạn đang tìm mua món đồ':'Có người gần bạn đang tìm thuê món đồ',body:r.description,link:'/needs/'+r.id,nearby:{...r,distance_km:candidates.data[0].distance_km,kind:d.kind}});
   const saved=await db.from('nearby_request_deliveries').update({status:'SENT',provider_id:result.providerId,updated_at:new Date().toISOString()}).eq('request_id',d.request_id).eq('profile_id',d.profile_id);if(saved.error)throw Error('NEARBY_RECEIPT_UNCERTAIN');
  }catch(e){
   // Never automatically retry: a transport timeout may follow successful delivery.
   await db.from('nearby_request_deliveries').update({status:'FAILED',result_code:e.message==='NEARBY_RECEIPT_UNCERTAIN'?'RECEIPT_UNCERTAIN':'DELIVERY_REVIEW_REQUIRED',updated_at:new Date().toISOString()}).eq('request_id',d.request_id).eq('profile_id',d.profile_id);
  }
 }
 return {status:'PROCESSED',count:pending.data.length};
}
