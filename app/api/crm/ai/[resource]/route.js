import {advisorModel} from '@/lib/ai/local-model';
import {createHash} from 'node:crypto';
import {requireCrmAccess} from '@/lib/operations/crm-auth';
import {crmAllowed} from '@/lib/operations/access';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
import {DEFAULT_BRAIN,CONTROL_COVERAGE,validateBrain,knowledgeForStorage,validateKnowledge,validatePublication,brainVersionForEditor} from '@/lib/chat-control/policy';
import {runtimeBrain,recordAiEvent} from '@/lib/chat-control/runtime';
import {generateAdvice} from '@/lib/chat-control/advisor-engine';
import {advisorContext,redactAdvisorText} from '@/lib/support/advisor';
import {decryptPrivate} from '@/lib/operations/crypto';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const response=data=>Response.json({ok:true,...data},{headers:{'Cache-Control':'private,no-store'}});
function need(account,p){if(!crmAllowed(account.staff,p))throw new HttpError(403,'PERMISSION_REQUIRED','PERMISSION_REQUIRED');}
function success(r){if(r.error)throw new HttpError(503,'CONTROL_STORAGE_UNAVAILABLE','CONTROL_STORAGE_UNAVAILABLE');return r.data;}
async function access(request){const a=await requireCrmAccess(request);if(!crmAllowed(a.staff,'bots.read')&&!crmAllowed(a.staff,'support.read'))throw new HttpError(403,'CHAT_ACCESS_DENIED','CHAT_ACCESS_DENIED');return a;}
function cursor(value){if(!value)return null;try{if(value.length>300)throw Error();const c=JSON.parse(Buffer.from(value,'base64url').toString());if(!uuid(c.id)||new Date(c.at).toISOString()!==c.at)throw Error();return c}catch{throw new HttpError(400,'CURSOR_INVALID','CURSOR_INVALID')}}
function pageQuery(q,c){return c?q.or('created_at.lt.'+c.at+',and(created_at.eq.'+c.at+',id.lt.'+c.id+')'):q;}
const nextCursor=(rows,n)=>rows.length>n?Buffer.from(JSON.stringify({at:rows[n-1].created_at,id:rows[n-1].id})).toString('base64url'):null;
export async function GET(request,{params}){try{
 rateLimit(request,'chat-control-read',180);const a=await access(request),{db}=a,{resource}=await params,url=new URL(request.url),id=url.searchParams.get('id');
 if(resource==='session')return response({user:{id:a.profile.id,name:a.profile.name},permissions:a.staff.permissions,expiresAt:a.crmReceipt.expiresAt*1000,environment:process.env.RELOO_ENVIRONMENT||'production'});
 if(resource==='overview'){need(a,'bots.read');return response({summary:success(await db.rpc('reloo_ai_summary')),coverage:CONTROL_COVERAGE,model:advisorModel().model||'UNAVAILABLE'});}
 if(resource==='versions'){need(a,'bots.read');const brain=await runtimeBrain(db),versions=success(await db.from('ai_bot_versions').select('id,version,status,created_by,created_at,published_by,published_at').order('version',{ascending:false}).limit(50));if(id&&!uuid(id))throw new HttpError(400,'INVALID_ID');const selected=id?success(await db.from('ai_bot_versions').select('*').eq('id',id).single()):null;return response({active:brain.id,legacy:brain.legacy,versions,selected:brainVersionForEditor(selected),defaults:DEFAULT_BRAIN});}
 if(resource==='inbox'){
  need(a,'support.read');const state=url.searchParams.get('status'),priority=url.searchParams.get('priority'),assigned=url.searchParams.get('assigned');
  if(state&&!['OPEN','WAITING','HUMAN','CLOSED'].includes(state)||priority&&!['NORMAL','HIGH','URGENT'].includes(priority)||assigned&&!['me','unassigned'].includes(assigned))throw new HttpError(400,'FILTER_INVALID');
  let q=db.from('support_conversations').select('id,title,status,profile_id,context,assigned_to,priority,created_at,expires_at').or('expires_at.is.null,expires_at.gt.'+new Date().toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(31);
  if(state)q=q.eq('status',state);if(priority)q=q.eq('priority',priority);if(assigned==='me')q=q.eq('assigned_to',a.profile.id);if(assigned==='unassigned')q=q.is('assigned_to',null);
  const rows=success(await pageQuery(q,cursor(url.searchParams.get('cursor'))));return response({rows:rows.slice(0,30),nextCursor:nextCursor(rows,30)});
 }
 if(resource==='thread'){
  need(a,'support.read');if(!uuid(id))throw new HttpError(400,'INVALID_ID');const c=success(await db.from('support_conversations').select('id,title,status,profile_id,context,assigned_to,priority,created_at,expires_at').eq('id',id).maybeSingle());if(!c||c.expires_at&&Date.parse(c.expires_at)<=Date.now())throw new HttpError(404,'CONVERSATION_UNAVAILABLE');
  const before=url.searchParams.get('beforeMessage');if(before&&!/^[1-9][0-9]{0,15}$/.test(before))throw new HttpError(400,'CURSOR_INVALID');let messageQuery=db.from('support_messages').select('id,role,body,model,created_at,sequence').eq('conversation_id',id).order('sequence',{ascending:false}).limit(51);if(before)messageQuery=messageQuery.lt('sequence',before);const messages=success(await messageQuery);
  const events=success(await db.from('ai_events').select('id,source,kind,bot_version,data,created_at').eq('conversation_id',id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(100));return response({conversation:c,messages:messages.slice(0,50).reverse(),messageCursor:messages.length>50?String(messages[49].sequence):null,events:events.reverse()});
 }
 if(resource==='events'){need(a,'bots.read');const source=url.searchParams.get('source');if(source&&!['support','analysis','news','services','preview','system'].includes(source))throw new HttpError(400,'SOURCE_INVALID');let q=db.from('ai_events').select('id,source,kind,bot_version,data,created_at,conversation_id').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(101);if(source)q=q.eq('source',source);const rows=success(await pageQuery(q,cursor(url.searchParams.get('cursor'))));return response({rows:rows.slice(0,100),nextCursor:nextCursor(rows,100)});}
 if(resource==='audit'){need(a,'bots.read');return response({rows:success(await db.from('ai_control_audit').select('*').order('created_at',{ascending:false}).limit(100))});}
 if(resource==='catalog'){need(a,'bots.read');const {marketplaceAsset}=await import('@/lib/catalog/public-listing');const {rentalPeriodRate}=await import('@/lib/rental-selection');const rows=success(await db.from('assets').select('*').in('status',['available','rented']).eq('is_locked',false).order('created_at',{ascending:false}).limit(30));return response({products:rows.map(r=>marketplaceAsset(r,null)).filter(Boolean).map(p=>({id:p.id,title:p.title,status:p.status,mode:p.transactionMode||'RENT',rate:rentalPeriodRate(p),salePrice:p.salePrice||null,area:p.location}))});}
 if(resource==='leads'){need(a,'support.contacts');const rows=success(await db.from('crm_records').select('id,status,created_at,data').eq('module','support').contains('data',{channel:'ADVISOR'}).neq('status','CANCELLED').order('created_at',{ascending:false}).limit(100));return response({rows:rows.filter(r=>Date.parse(r.data.expiresAt)>Date.now()).map(r=>({id:r.id,status:r.status,created_at:r.created_at,conversationId:r.data.conversationId,consentedAt:r.data.consentedAt,expiresAt:r.data.expiresAt}))});}
 if(resource==='staff'){need(a,'support.assign');const staff=success(await db.from('crm_staff').select('profile_id,role,permissions,enabled,profiles(name)').eq('enabled',true).limit(100));return response({staff:staff.filter(s=>crmAllowed(s,'support.write')&&crmAllowed(s,'crm.read')).map(s=>({id:s.profile_id,name:s.profiles?.name||s.profile_id}))});}
 if(resource==='contacts'){
  need(a,'support.contacts');const leadId=url.searchParams.get('leadId');if(!uuid(id)&&!uuid(leadId))throw new HttpError(400,'INVALID_ID');let q=db.from('crm_records').select('id,data').eq('module','support').contains('data',{channel:'ADVISOR'}).neq('status','CANCELLED');q=leadId?q.eq('id',leadId):q.contains('data',{conversationId:id});const leads=success(await q.limit(5));const lead=leads.find(l=>Date.parse(l.data.expiresAt)>Date.now());let contact=null;if(lead?.data.contactEncrypted){try{contact=JSON.parse(decryptPrivate(lead.data.contactEncrypted))}catch{throw new HttpError(503,'CONTACT_UNAVAILABLE')}}if(lead)success(await db.from('ai_control_audit').insert({actor_id:a.profile.id,action:'CONSENTED_CONTACT_READ',resource_id:lead.id}));return response({contact,noticeVersion:lead?.data.consentVersion||null,consentedAt:lead?.data.consentedAt||null});
 }
 throw new HttpError(404,'NOT_FOUND');
}catch(e){return errorResponse(e)}}
export async function POST(request,{params}){try{
 assertOrigin(request);rateLimit(request,'chat-control-write',60);const a=await access(request),{db}=a,{resource}=await params,input=await readJson(request,100000);
 if(resource==='preview'){
  need(a,'bots.write');if(typeof input.message!=='string'||input.message.length<1||input.message.length>500)throw new HttpError(400,'MESSAGE_INVALID');let config,knowledge;
  try{config=validateBrain(input.config);knowledge=knowledgeForStorage(input.knowledge);validateKnowledge(knowledge,{publish:true})}catch(e){throw new HttpError(400,e.message,e.message)}
  const rendered=await generateAdvice(db,{message:redactAdvisorText(input.message),history:[],context:advisorContext(input.path||'/'),locale:input.locale==='en-US'?'en-US':'vi-VN',brain:{id:null,config,knowledge}});
  await recordAiEvent(db,{source:'preview',kind:'preview',actor:a.profile.id,data:{intent:rendered.intent,model:rendered.model,decision:rendered.trace.decision,durationMs:rendered.trace.durationMs}});
  return response({preview:true,...rendered});
 }
 let action,data;
 if(resource==='draft'){need(a,'bots.write');try{data={config:validateBrain(input.config),knowledge:knowledgeForStorage(input.knowledge)}}catch(e){throw new HttpError(400,e.message,e.message)}action='save';}
 else if(resource==='publish'){
  need(a,'bots.publish');if(!uuid(input.id)||input.expected!=null&&!uuid(input.expected)||input.reviewed!==true||typeof input.reason!=='string'||input.reason.trim().length<5||input.reason.length>200)throw new HttpError(400,'REVIEW_REQUIRED','REVIEW_REQUIRED');
  const row=success(await db.from('ai_bot_versions').select('config,knowledge').eq('id',input.id).single());try{validatePublication(row.config,row.knowledge)}catch(e){throw new HttpError(409,e.message,e.message)}action='publish';data={id:input.id,expected:input.expected,reviewed:true,reason:redactAdvisorText(input.reason.trim())};
 }else if(resource==='queue'){
  if(!uuid(input.id)||!['assign','priority','close'].includes(input.action))throw new HttpError(400,'QUEUE_INVALID');action=input.action;need(a,action==='assign'?'support.assign':'support.write');data={id:input.id};
  if(action==='assign'){if(input.assignedTo!=null&&(typeof input.assignedTo!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(input.assignedTo)))throw new HttpError(400,'ASSIGNEE_INVALID');data.assignedTo=input.assignedTo||null;}
  if(action==='priority'){if(!['NORMAL','HIGH','URGENT'].includes(input.priority))throw new HttpError(400,'PRIORITY_INVALID');data.priority=input.priority;}
 }else throw new HttpError(404,'NOT_FOUND');
 if(!uuid(input.requestId))throw new HttpError(400,'REQUEST_ID_REQUIRED','REQUEST_ID_REQUIRED');const hash=createHash('sha256').update(JSON.stringify({action,data})).digest('hex');
 const r=await db.rpc('reloo_ai_control',{p_actor:a.profile.id,p_request:input.requestId,p_hash:hash,p_action:action,p_data:data});if(r.error){const code=['VERSION_CONFLICT','REQUEST_CONFLICT','CONTROL_DENIED','ASSIGNMENT_DENIED','CONVERSATION_UNAVAILABLE','ASSIGNEE_INVALID'].find(c=>r.error.message.includes(c))||'CONTROL_CHANGED';throw new HttpError(code.includes('DENIED')?403:409,code,code)}return response(r.data);
}catch(e){return errorResponse(e)}}
