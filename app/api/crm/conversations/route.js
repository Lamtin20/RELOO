import { requirePermission } from '@/lib/operations/permissions';
import { errorResponse } from '@/lib/server/http';
import {assertOrigin,readJson,HttpError,rateLimit} from '@/lib/server/http';
import {decryptPrivate} from '@/lib/operations/crypto';
import {crmAllowed} from '@/lib/operations/access';
import {redactAdvisorText} from '@/lib/support/advisor';
export async function GET(request) {
  try {
    const { db,staff } = await requirePermission(request,'support.read');const reveal=crmAllowed(staff,'support.contacts');
    const { data, error } = await db.from('support_conversations').select('id,title,status,profile_id,created_at,support_messages(role,body,model,created_at,sequence)').or('expires_at.is.null,expires_at.gt.'+new Date().toISOString()).order('created_at',{ascending:false}).limit(50);
    if (error) throw new Error('Support conversations unavailable');
    const leads=await db.from('crm_records').select('id,data,status,created_at').eq('module','support').contains('data',{channel:'ADVISOR'}).neq('status','CANCELLED').order('created_at',{ascending:false}).limit(100);if(leads.error)throw Error('Lead contacts unavailable');
    const conversations=data.map(c=>{const lead=reveal&&leads.data.find(l=>l.data.conversationId===c.id&&Date.parse(l.data.expiresAt)>Date.now());let contact=null;if(lead?.data.contactEncrypted){try{contact=JSON.parse(decryptPrivate(lead.data.contactEncrypted))}catch{contact={unavailable:true}}}return {...c,contact,support_messages:c.support_messages.sort((a,b)=>Number(a.sequence)-Number(b.sequence))}});
    const contactRequests=reveal?leads.data.filter(l=>Date.parse(l.data.expiresAt)>Date.now()&&!data.some(c=>c.id===l.data.conversationId)).map(l=>{let contact=null;try{contact=JSON.parse(decryptPrivate(l.data.contactEncrypted))}catch{contact={unavailable:true}}return {id:l.id,status:l.status,createdAt:l.created_at,contact}}):[];
    return Response.json({ok:true,conversations,contactRequests},{headers:{'Cache-Control':'no-store'}});
  } catch(error){return errorResponse(error);}
}
export async function POST(request){try{assertOrigin(request);rateLimit(request,'advisor-staff',30);const {db,profile}=await requirePermission(request,'support.write'),input=await readJson(request,5000);if(!['reply','takeover','resume'].includes(input.action)||![input.id,input.requestId].every(v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v))||input.action==='reply'&&(typeof input.body!=='string'||!input.body.trim()||input.body.length>2000))throw new HttpError(400,'INVALID_INPUT');const r=await db.rpc('reloo_support_staff',{p_actor:profile.id,p_id:input.id,p_action:input.action,p_body:redactAdvisorText(input.body||''),p_request:input.requestId});if(r.error)throw new HttpError(409,'SUPPORT_CHANGED');return Response.json({ok:true})}catch(e){return errorResponse(e)}}
