import {heartbeatState} from './heartbeat.js';
import {automationReadiness} from '../news-autopilot/status.js';
import {readLiveObservations} from './live-observations.js';
import {infrastructureSnapshot} from './infrastructure.js';
// Read-only operational registry. Add a source here to extend the world and API together.
export const CONTROL_SOURCES = [
  {id:'gateway',permission:'traffic.read',table:'api_traces',fields:'status,duration_ms,created_at',time:'created_at',view:'traffic',kind:'gateway'},
  {id:'jobs',permission:'jobs.read',table:'automation_jobs',fields:'status,kind,created_at',time:'created_at',view:'jobs',kind:'worker'},
  {id:'news',permission:'content.read',table:'news_autopilot_runs',fields:'status,started_at',time:'started_at',view:'news',kind:'ai'},
  {id:'orders',permission:'orders.read',table:'transactions',fields:'status,created_at',time:'created_at',view:'overview',kind:'marketplace'},
  {id:'calendar',permission:'settings.read',table:'rc_calendar_events',fields:'status',view:'settings',kind:'calendar'},
  {id:'residency',permission:'neighborhood.read',table:'nk_places',fields:'status',view:'neighborhood',kind:'neighborhood'},
];
export const CONTROL_LINKS = [['gateway','orders'],['gateway','jobs'],['jobs','news'],['jobs','calendar'],['orders','residency']];
const FAILED=new Set(['FAILED','ERROR','REAUTH','REVIEW','BLOCKED','NO_FRESH_SOURCE','BUDGET_WAIT','UNCERTAIN']);
const RUNNING=new Set(['RUNNING','PROCESSING','GENERATING','SYNCING']);
const WAITING=new Set(['QUEUED','PENDING','NEW','HELD']);
export const hasControlPermission=(staff,p)=>staff?.permissions?.includes('*')||staff?.permissions?.includes(p);
async function optionalRow(db,table,fields,column,value,timeoutMs){
 let timer;const abort=new AbortController();
 try{
  let q=db.from(table).select(fields).eq(column,value).maybeSingle();if(q.abortSignal)q=q.abortSignal(abort.signal);
  const r=await Promise.race([q,new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('TIMEOUT'));},timeoutMs);})]);return r.error?null:r.data;
 }catch{return null;}finally{clearTimeout(timer);}
}
export function summarizeControlSource(source, rows=[], now=Date.now()) {
 const counts={observed:rows.length,failed:0,running:0,waiting:0};
 for(const r of rows){const status=String(r.status||'').toUpperCase();if(FAILED.has(status)||source.id==='gateway'&&Number(r.status)>=500)counts.failed++;if(RUNNING.has(status))counts.running++;if(WAITING.has(status))counts.waiting++;}
 const durations=rows.map(r=>Number(r.duration_ms)).filter(v=>Number.isFinite(v)&&v>=0).sort((a,b)=>a-b);
 const dates=source.time?rows.map(r=>Date.parse(r[source.time])).filter(t=>Number.isFinite(t)&&t<=now):[];
 return {...counts,p95:durations.length?durations[Math.max(0,Math.ceil(durations.length*.95)-1)]:null,lastActivity:dates.length?new Date(Math.max(...dates)).toISOString():null};
}
export async function readControlCenter(db,staff,{now=Date.now(),timeoutMs=5000}={}) {
 const since=new Date(now-86400000).toISOString();
 const observations=readLiveObservations(db,staff,{now,timeoutMs});
 const pulse=hasControlPermission(staff,'jobs.read')?optionalRow(db,'operations_heartbeats','seen_at,observations,observed_at','id','operations',timeoutMs):Promise.resolve(null);
 const aiConfig=hasControlPermission(staff,'content.read')?optionalRow(db,'news_autopilot_settings','enabled,provider,paid_api_enabled,daily_api_call_limit,daily_budget_vnd,metered_budget_enabled,daily_target,paid_image_enabled','id',true,timeoutMs):Promise.resolve(null);
 const nodes=await Promise.all(CONTROL_SOURCES.filter(s=>hasControlPermission(staff,s.permission)).map(async s=>{
  let timer;const abort=new AbortController();
  try{
   let query=db.from(s.table).select(s.fields).limit(300);
   if(s.time)query=query.gte(s.time,since).order(s.time,{ascending:false});
   if(query.abortSignal)query=query.abortSignal(abort.signal);
   const result=await Promise.race([query,new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('TIMEOUT'));},timeoutMs);})]);
   if(result.error)throw Error('SOURCE_UNAVAILABLE');
   const metrics=summarizeControlSource(s,result.data||[],now);
   const workloads=s.id==='jobs'?[...new Set((result.data||[]).map(r=>r.kind).filter(k=>/^[A-Z_]{1,50}$/.test(k)))].map(kind=>({kind,...summarizeControlSource(s,result.data.filter(r=>r.kind===kind),now)})):[];
   return {id:s.id,kind:s.kind,view:s.id==='orders'&&!hasControlPermission(staff,'reports.read')?null:s.view,status:metrics.failed?'attention':metrics.observed?'observed':'empty',metrics,workloads,windowHours:s.time?24:null,events:s.time?(result.data||[]).slice(0,5).map(r=>({status:/^[A-Z0-9_]{1,40}$/.test(String(r.status))?String(r.status):'UNKNOWN',at:r[s.time]})):[],capped:metrics.observed===300};
  }catch{return {id:s.id,kind:s.kind,view:s.view,status:'unavailable',metrics:null,capped:false};}
  finally{clearTimeout(timer);}
 }));
 const ids=new Set(nodes.map(n=>n.id));
 const [pulseRow,settings]=await Promise.all([pulse,aiConfig]);
 const ai=settings?{enabled:settings.enabled===true,ready:automationReadiness(settings).ready,provider:['LOCAL','VIBI'].includes(settings.provider)?settings.provider:'UNKNOWN',budgetVnd:settings.daily_budget_vnd??null,dailyTarget:settings.daily_target??null,imageEnabled:settings.paid_image_enabled===true}:null;
 return {ok:true,generatedAt:new Date(now).toISOString(),windowHours:24,pollSeconds:15,nodes,ai,infrastructure:infrastructureSnapshot(pulseRow,now),observations:await observations,heartbeat:heartbeatState(pulseRow,now),links:CONTROL_LINKS.filter(([a,b])=>ids.has(a)&&ids.has(b)),schemaVersion:2};
}
