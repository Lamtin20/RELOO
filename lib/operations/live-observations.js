const allowed=(staff,p)=>staff?.permissions?.includes('*')||staff?.permissions?.includes(p);
const safeCode=v=>/^[A-Z0-9_,]{1,160}$/.test(String(v||''))?v:null;
async function sample(db,table,fields,{time,since,timeoutMs=5000}={}){
 const abort=new AbortController();let timer;
 try{let q=db.from(table).select(fields).limit(300);if(time){q=q.order(time,{ascending:false});if(since)q=q.gte(time,since);}if(q.abortSignal)q=q.abortSignal(abort.signal);
 const r=await Promise.race([q,new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('TIMEOUT'));},timeoutMs);})]);if(r.error)throw Error('UNAVAILABLE');return {available:true,rows:Array.isArray(r.data)?r.data:[],capped:r.data?.length===300};
 }catch{return {available:false,rows:[],capped:false};}finally{clearTimeout(timer);}
}
export async function readLiveObservations(db,staff,{now=Date.now(),timeoutMs=5000}={}){
 const since=new Date(now-86400000).toISOString(), channels=[];
 const definitions=[
  ['delivery','neighborhood.read','nk_outbox','status,created_at','created_at'],
  ['calendarSync','settings.read','rc_calendar_events','status,updated_at','updated_at'],
  ['analyticsPipeline','traffic.read','journey_events','created_at','created_at'],
 ];
 await Promise.all(definitions.filter(d=>allowed(staff,d[1])).map(async([id,,table,fields,time])=>{const r=await sample(db,table,fields,{time,since,timeoutMs});channels.push({id,available:r.available,capped:r.capped,observed:r.available?r.rows.length:null,waiting:r.rows.filter(x=>['QUEUED','PENDING','RETRY','SYNCING'].includes(x.status)).length,failed:r.rows.filter(x=>['FAILED','ERROR','DEAD','REAUTH'].includes(x.status)).length,lastAt:r.rows[0]?.[time]||null});}));
 let newsroom=null;
 if(allowed(staff,'content.read')){
  const [runs,calls,candidates,sources]=await Promise.all([
   sample(db,'news_autopilot_runs','status,summary,started_at,finished_at',{time:'started_at',since,timeoutMs}),
   sample(db,'news_autopilot_api_calls','kind,status,model,settled_vnd,error_code,created_at,finished_at',{time:'created_at',timeoutMs}),
   sample(db,'news_autopilot_candidates','status,reason,source_id,source_published_at,updated_at',{time:'updated_at',timeoutMs}),
   sample(db,'news_autopilot_sources','id,name,enabled,region,last_checked_at,last_error,last_eligible_count,last_discovered_count',{timeoutMs}),
  ]);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(now));
  const day=v=>v&&new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(v));
  const steps=['TEXT','IMAGE'].map(kind=>{const rows=calls.rows.filter(r=>r.kind===kind),lastSuccess=rows.find(r=>r.status==='SUCCEEDED');return {kind,available:calls.available,capped:calls.capped,lastSuccessAt:lastSuccess?.finished_at||null,lastAttemptAt:rows[0]?.created_at||null,lastStatus:safeCode(rows[0]?.status),errorCode:safeCode(rows[0]?.error_code),succeededToday:rows.filter(r=>r.status==='SUCCEEDED'&&day(r.created_at)===today).length,spentTodayVnd:rows.filter(r=>day(r.created_at)===today).reduce((s,r)=>s+Math.max(0,Number(r.settled_vnd)||0),0)};});
  const last=runs.rows[0];
  newsroom={available:runs.available,lastRun:last?{status:safeCode(last.status),at:last.started_at,finishedAt:last.finished_at,code:safeCode(last.summary?.code||last.summary?.reason)}:null,steps,
   publishedToday:candidates.available?candidates.rows.filter(r=>r.status==='PUBLISHED'&&day(r.updated_at)===today).length:null,
   eligible:candidates.available?candidates.rows.filter(r=>['NEW','READY'].includes(r.status)&&Date.parse(r.source_published_at)>=now-168*3600000&&Date.parse(r.source_published_at)<=now+300000&&sources.rows.some(s=>s.id===r.source_id&&s.enabled&&s.region==='VN')).length:null,
   held:candidates.available?candidates.rows.filter(r=>['HELD','UNCERTAIN'].includes(r.status)).map(r=>({status:safeCode(r.status),code:safeCode(r.reason)})):[],
   sourcesAvailable:sources.available,sources:sources.rows.filter(s=>s.enabled&&s.region==='VN').map(s=>({id:s.id,name:s.name,checkedAt:s.last_checked_at,errorCode:safeCode(s.last_error),eligible:s.last_eligible_count,discovered:s.last_discovered_count})),capped:[runs,calls,candidates,sources].some(r=>r.capped)};
 }
 const runtime=allowed(staff,'jobs.read')?{scope:'WEB_PROCESS',uptimeSeconds:Math.floor(process.uptime()),memoryRssMb:Math.round(process.memoryUsage().rss/1048576)}:null;
 return {newsroom,channels:channels.sort((a,b)=>a.id.localeCompare(b.id)),runtime};
}
