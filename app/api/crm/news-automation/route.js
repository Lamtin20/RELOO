import {requirePermission} from '@/lib/operations/permissions';
import {assertOrigin,readJson,errorResponse,HttpError,rateLimit} from '@/lib/server/http';
import {vietnamDay} from '@/lib/news-autopilot/policy';
import {automationReadiness} from '@/lib/news-autopilot/status';
import {crmAllowed} from '@/lib/operations/access';
import {checkVibiConnection} from '@/lib/news-autopilot/vibi';
import {VIETNAM_SOURCES} from '@/lib/news-autopilot/vietnam-sources';
import {validDailyLimits} from '@/lib/news-autopilot/limits';
export async function GET(request){
 try{
  const {db,staff}=await requirePermission(request,'content.read');
  const results=await Promise.all([
   db.from('news_autopilot_settings').select('*').eq('id',true).single(),
   db.from('news_autopilot_sources').select('id,name,feed_url,topic,jurisdiction,enabled,region,source_kind,last_checked_at,last_error,last_discovered_count,last_eligible_count').eq('region','VN'),
   db.from('news_autopilot_runs').select('id,started_at,finished_at,status,summary').order('started_at',{ascending:false}).limit(12),
   db.from('news_autopilot_candidates').select('id,title,status,reason,article_id,updated_at').in('source_id',VIETNAM_SOURCES.map(s=>s.id)).order('updated_at',{ascending:false}).limit(40),
   db.from('news_autopilot_candidates').select('id',{count:'exact',head:true}).eq('status','PUBLISHED').gte('updated_at',vietnamDay().start),
   db.from('integration_settings').select('health').eq('provider','VIBI_NEWS').maybeSingle(),
   db.from('news_autopilot_documents').select('id',{count:'exact',head:true}),
   db.from('news_autopilot_documents').select('id,title,canonical_url,source_published_at,verified_at,reference_only,source_id').order('verified_at',{ascending:false}).limit(20),
   db.from('news_autopilot_api_calls').select('reserved_vnd,settled_vnd,status').gte('created_at',vietnamDay().start),
   db.from('news_autopilot_budget_adjustments').select('amount_vnd').eq('day',vietnamDay().day).maybeSingle(),
  ]);
  if(results.some(r=>r.error))throw new HttpError(503,'Bộ tin tự động chưa được khởi tạo hoặc đang mất kết nối.');
  const spent=(results[9].data?.amount_vnd||0)+results[8].data.reduce((s,c)=>s+(c.settled_vnd??0),0),reserved=results[8].data.reduce((s,c)=>s+(c.settled_vnd===null?c.reserved_vnd:0),0);
  return Response.json({ok:true,canWrite:crmAllowed(staff,'content.write'),readiness:automationReadiness(results[0].data),settings:results[0].data,sources:results[1].data,runs:results[2].data,candidates:results[3].data,publishedToday:results[4].count,providerHealth:results[5].data?.health||null,documentCount:results[6].count,documents:results[7].data,budget:{spentVnd:spent,reservedVnd:reserved,remainingVnd:Math.max(0,results[0].data.daily_budget_vnd-spent-reserved),conversionCeiling:40000}},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return errorResponse(e);}
}
export async function POST(request){
 try{
  assertOrigin(request);const {db,profile}=await requirePermission(request,'content.write');const input=await readJson(request,2000);
  if(input.action==='SET_LIMITS'){
   if(!validDailyLimits(input.daily_target,input.daily_budget_vnd))throw new HttpError(400,'Chọn từ 1–40 bài/ngày và ngân sách từ 10.000–5.000.000đ/ngày (số nguyên).');
   const saved=await db.from('news_autopilot_settings').update({daily_target:input.daily_target,daily_budget_vnd:input.daily_budget_vnd,updated_by:profile.id,updated_at:new Date().toISOString()}).eq('id',true).select('daily_target,daily_budget_vnd').single();
   if(saved.error||!saved.data)throw new HttpError(503,'Không lưu được hạn mức mỗi ngày.');
   await db.from('security_audit').insert({actor_id:profile.id,action:'NEWS_AUTOPILOT_LIMITS_CHANGED',details:{dailyTarget:input.daily_target,dailyBudgetVnd:input.daily_budget_vnd}});
   return Response.json({ok:true,limits:saved.data});
  }
  if(input.action==='CHECK_CONNECTION'){
   rateLimit(request,'news-provider-check',3,60000);
   let connection;try{connection=await checkVibiConnection(db);}catch(e){throw new HttpError(502,'Chưa kiểm tra được kết nối Vibi. Mã: '+(/^[A-Z0-9_]+$/.test(e.message)?e.message:'VIBI_CONNECTION_FAILED'));}
   const saved=await db.from('integration_settings').update({health:connection}).eq('provider','VIBI_NEWS');if(saved.error)throw new HttpError(503,'Không lưu được trạng thái kết nối.');
   return Response.json({ok:true,connection});
  }
  if(input.action==='SET_COLLECTION'){
   if(typeof input.enabled!=='boolean')throw new HttpError(400,'Trạng thái quét nguồn không hợp lệ.');
   const saved=await db.from('news_autopilot_settings').update({collection_enabled:input.enabled,updated_by:profile.id,updated_at:new Date().toISOString()}).eq('id',true);if(saved.error)throw new HttpError(503,'Không lưu được lịch quét nguồn.');
   await db.from('security_audit').insert({actor_id:profile.id,action:'NEWS_VIETNAM_COLLECTION_CHANGED',details:{enabled:input.enabled}});
   return Response.json({ok:true});
  }
  if(typeof input.enabled!=='boolean'||!Number.isInteger(input.daily_target)||input.daily_target<1||input.daily_target>40)throw new HttpError(400,'Chọn từ 1 đến 40 bài/ngày và trạng thái chạy hợp lệ.');
  const current=await db.from('news_autopilot_settings').select('*').eq('id',true).single();
  if(current.error)throw new HttpError(503,'Không đọc được cấu hình tự động.');
  const readiness=automationReadiness(current.data);
  if(input.enabled&&!readiness.ready)throw new HttpError(409,readiness.blockers.map(b=>b.message).join(' '),'AUTOMATION_NOT_READY');
  const {error}=await db.from('news_autopilot_settings').update({enabled:input.enabled,daily_target:input.daily_target,updated_by:profile.id,updated_at:new Date().toISOString()}).eq('id',true);
  if(error)throw new HttpError(503,'Không lưu được cấu hình.');
  await db.from('security_audit').insert({actor_id:profile.id,action:'NEWS_AUTOPILOT_SETTINGS',details:{enabled:input.enabled,dailyTarget:input.daily_target}});
  return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
