import {randomUUID,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {requireAccount} from '@/lib/security/authorization';
import {securityDb} from '@/lib/security/service';
import {privateHash,encryptPrivate} from '@/lib/operations/crypto';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
import {advisorContext,contactInput,redactAdvisorText} from '@/lib/support/advisor';
import {conversationNeed,normalizeNeed} from '@/lib/support/journey';
import {runtimeBrain} from '@/lib/chat-control/runtime';
import {generateAdvice} from '@/lib/chat-control/advisor-engine';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
async function identity(request){
 let account;try{account=await requireAccount(request,{active:false})}catch(e){if(e.status!==401)throw e}
 if(account)return {db:account.db,actor:account.profile.id,guest:null};
 const jar=await cookies();let token=jar.get('reloo-advisor')?.value;
 if(!/^[a-zA-Z0-9_-]{43}$/.test(token||'')){token=randomBytes(32).toString('base64url');jar.set('reloo-advisor',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:86400})}
 return {db:securityDb(),actor:null,guest:privateHash('support-guest',token)};
}
function ownerQuery(query,who){return who.actor?query.eq('profile_id',who.actor):query.is('profile_id',null).eq('guest_hash',who.guest)}
async function conversation(who,id,create=false,context={}){
 const {db}=who;
 if(id&&!uuid(id))throw new HttpError(400,'INVALID_CONVERSATION');
 if(id){const r=await ownerQuery(db.from('support_conversations').select('*').eq('id',id),who).maybeSingle();if(r.error)throw Error('Support storage unavailable');if(!r.data||r.data.expires_at&&Date.parse(r.data.expires_at)<=Date.now())throw new HttpError(404,'CONVERSATION_UNAVAILABLE');return r.data}
 if(!create)return null;
 const row={id:randomUUID(),profile_id:who.actor,guest_hash:who.guest,title:'RELOO · Tư vấn',context,expires_at:new Date(Date.now()+(who.actor?30:7)*86400000).toISOString()};
 const r=await db.from('support_conversations').insert(row);if(r.error)throw Error('Support storage unavailable');return {...row,status:'OPEN'};
}
export async function GET(request){try{
 rateLimit(request,'advisor-read',60);const who=await identity(request),params=new URL(request.url).searchParams;let id=params.get('id');
 if(!id&&params.get('latest')==='1'){
  const latest=await ownerQuery(who.db.from('support_conversations').select('id').gt('expires_at',new Date().toISOString()),who).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(latest.error)throw Error('Support history unavailable');id=latest.data?.id;
 }
 const c=await conversation(who,id);
 const r=c?await who.db.from('support_messages').select('role,body,model,created_at').eq('conversation_id',c.id).order('sequence',{ascending:false}).limit(50):{data:[]};
 if(r.error)throw Error('Support history unavailable');
 const saved=c?await who.db.from('support_requests').select('response,created_at').eq('conversation_id',c.id).order('created_at',{ascending:false}).limit(100):{data:[]};
 if(saved.error)throw Error('Support history unavailable');
 const messages=r.data.reverse().map(m=>{const turn=m.role==='ASSISTANT'?saved.data.find(t=>t.created_at===m.created_at&&t.response?.answer===m.body)?.response:null;return {...m,...(turn?{products:turn.products,sources:turn.sources,suggestions:turn.suggestions,actions:turn.actions}:{} )}});
 return Response.json({ok:true,conversationId:c?.id||null,status:c?.status||'OPEN',messages},{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){return errorResponse(e)}}
export async function POST(request){try{
 assertOrigin(request);rateLimit(request,'advisor-write',20);const input=await readJson(request,10000),who=await identity(request),{db}=who;
 if(!uuid(input.requestId)||!['message','handoff'].includes(input.action))throw new HttpError(400,'INVALID_REQUEST');
 if(input.action==='message'&&(typeof input.message!=='string'||!input.message.trim()||input.message.length>2000))throw new HttpError(400,'MESSAGE_INVALID');
 let validatedContact;if(input.action==='handoff'){try{validatedContact=contactInput(input.contact)}catch(e){throw new HttpError(400,e.message,e.message)}}
 let context=advisorContext(input.path);
 if(input.listingId!==undefined&&(typeof input.listingId!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(input.listingId)))throw new HttpError(400,'INVALID_LISTING');
 const prior=await db.from('support_requests').select('conversation_id,content_hash,response').eq('id',input.requestId).maybeSingle();if(prior.error)throw Error('Support storage unavailable');
 const c=await conversation(who,input.conversationId||prior.data?.conversation_id,true,context);
 const hash=privateHash('support-request',JSON.stringify({action:input.action,message:input.message,contact:input.contact,path:context.path,...(input.listingId?{listingId:input.listingId}:{})}));
 if(prior.data){if(prior.data.conversation_id!==c.id||prior.data.content_hash!==hash)throw new HttpError(409,'REQUEST_CONFLICT');return Response.json(prior.data.response,{headers:{'Cache-Control':'no-store'}})}
 let data;
 if(!['OPEN','HUMAN','WAITING'].includes(c.status))throw new HttpError(409,'CONVERSATION_CLOSED');
 if(input.action==='handoff'){
  const contact=validatedContact;
  const response={ok:true,conversationId:c.id,status:'WAITING',handoff:true,answer:input.locale==='en-US'?'Your request is saved for staff review. No response time is promised.':'Đã lưu yêu cầu để nhân viên tiếp nhận. Chưa có thời gian phản hồi được xác nhận.'};
  data={trace:{path:context.path,decision:'CONSENTED_CONTACT_REQUEST'},action:'handoff',contactEncrypted:encryptPrivate(JSON.stringify(contact)),response};
 }else{
  if(typeof input.message!=='string'||!input.message.trim()||input.message.length>2000)throw new HttpError(400,'MESSAGE_INVALID');
  if(c.status!=='OPEN'){
   data={trace:{path:context.path,decision:'HUMAN_QUEUE'},action:'customer-message',message:redactAdvisorText(input.message.trim()),response:{ok:true,conversationId:c.id,status:c.status,queued:true,answer:null,aiRouting:false}};
  }else{
  const last=await db.from('support_requests').select('response').eq('conversation_id',c.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(last.error)throw Error('Support history unavailable');
  const savedContext=last.data?.response?.context||c.context;
  const remembered=savedContext?.listingId;
  if(context.path==='/'&&savedContext?.path)context=advisorContext(savedContext.path);
  const newNeed=conversationNeed(input.message),reset=/tim mon khac|find another item/.test(normalizeNeed(input.message));
  const listing=input.listingId||(!reset&&!newNeed.category?(context.listingId||remembered):null);
  if(reset||newNeed.category)context={path:'/explore',listingId:null};
  if(listing)context=advisorContext('/product/'+listing);
  const history=await db.from('support_messages').select('role,body').eq('conversation_id',c.id).order('sequence',{ascending:false}).limit(40);if(history.error)throw Error('Support history unavailable');
  const brain=await runtimeBrain(db),answer=await generateAdvice(db,{message:input.message,history:history.data.reverse(),context,locale:input.locale==='en-US'?'en-US':'vi-VN',brain});
  const {trace,paused,...rendered}=answer;const response={ok:true,conversationId:c.id,status:paused?'WAITING':'OPEN',...rendered};
  data=paused?{action:'customer-message',message:redactAdvisorText(input.message.trim()),trace,response}:{action:'message',message:redactAdvisorText(input.message.trim()),answer:answer.answer,model:answer.model,trace:{...trace,answer:answer.answer},response};
  }
 }
 data.trace={...data.trace,channel:['web','native'].includes(input.channel)?input.channel:'unknown'};
 const result=await db.rpc('reloo_support_commit',{p_actor:who.actor,p_guest:who.guest,p_id:c.id,p_request:input.requestId,p_hash:hash,p_data:data});
 if(result.error)throw new HttpError(409,'SUPPORT_CHANGED_RETRY');
 return Response.json(result.data,{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){return errorResponse(e)}}
export async function DELETE(request){try{assertOrigin(request);rateLimit(request,'advisor-withdraw',10);const who=await identity(request),input=await readJson(request,2000);if(!uuid(input.conversationId))throw new HttpError(400,'INVALID_CONVERSATION');await conversation(who,input.conversationId);const r=await who.db.rpc('reloo_support_withdraw',{p_actor:who.actor,p_guest:who.guest,p_id:input.conversationId});if(r.error)throw new HttpError(409,'WITHDRAW_UNAVAILABLE');const c=await conversation(who,input.conversationId);return Response.json({ok:true,status:c.status},{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}
