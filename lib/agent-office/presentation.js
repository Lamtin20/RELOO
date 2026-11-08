export const OFFICE_RENDER_LIMIT=12;
export function officeStatus(status){
 if(['running','in_progress'].includes(status))return 'running';
 if(['done','completed','succeeded'].includes(status))return 'done';
 if(['pending','queued'].includes(status))return 'queued';
 if(['failed','error'].includes(status))return 'failed';
 if(['needs_input','waiting_for_input'].includes(status))return 'needs_input';
 if(['cancelled','canceled'].includes(status))return 'cancelled';
 return 'unknown';
}
const time=job=>{const t=Date.parse(job.startedAt||job.createdAt);return Number.isFinite(t)?t:0};
export function officeAgents(jobs=[]){
 const map=new Map();for(const job of jobs.slice(0,80)){
  if(!job.agentId)continue;const current=map.get(job.agentId);
  if(!current||officeStatus(job.status)==='running'&&officeStatus(current.status)!=='running'||officeStatus(job.status)===officeStatus(current.status)&&time(job)>time(current)||officeStatus(job.status)!=='running'&&officeStatus(current.status)!=='running'&&time(job)>time(current))map.set(job.agentId,job);
 }
 return [...map.values()].sort((a,b)=>Number(officeStatus(b.status)==='running')-Number(officeStatus(a.status)==='running')||time(b)-time(a)||a.agentId.localeCompare(b.agentId));
}
export function filterOfficeJobs(jobs,{project='',status='',query=''}={}){const q=query.trim().toLocaleLowerCase().slice(0,100);return jobs.filter(j=>(!project||j.project===project)&&(!status||officeStatus(j.status)===status)&&(!q||[j.title,j.agent,j.project].some(x=>String(x||'').toLocaleLowerCase().includes(q))));}
