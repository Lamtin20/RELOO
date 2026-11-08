import {createHash} from 'node:crypto';
// Only explicitly selected operational metadata crosses the private office boundary.
let session;
export function officeEndpoint(env=process.env){
  if(env.RELOO_AGENT_OFFICE_URL!=='http://reloo-agent-office:8787')return null;
  return env.RELOO_AGENT_OFFICE_URL;
}
const clean=(value,max=140)=>typeof value==='string'?value.replace(/[\u0000-\u001f]/g,' ').slice(0,max):'';
export function officeSnapshot({projects=[],jobs=[],providers=[]},now=Date.now()){
  const recent=jobs.slice(0,80).map(j=>({id:clean(j.id,80),agentId:clean(j.agent_id,80),agent:clean(j.agent_name)||'Chưa phân công',project:clean(j.project_name)||'Văn phòng',title:clean(j.title),status:clean(j.status,40),startedAt:clean(j.started_at,40),finishedAt:clean(j.finished_at,40),createdAt:clean(j.created_at,40),parentId:clean(j.parent_job_id,80)}));
  return {connected:true,observedAt:new Date(now).toISOString(),projects:projects.slice(0,40).map(p=>({id:clean(p.id,80),name:clean(p.name)})),jobs:recent,providers:providers.slice(0,30).map(p=>({id:clean(p.id,80),name:clean(p.name),kind:clean(p.kind,40),preset:clean(p.preset,40),enabled:p.enabled===true,status:clean(p.status,30),checkedAt:clean(p.checked_at,40)}))};
}
export async function readOffice(env=process.env,fetcher=fetch){
  const base=officeEndpoint(env),email=env.RELOO_AGENT_OFFICE_EMAIL,password=env.RELOO_AGENT_OFFICE_PASSWORD;
  if(!base||!email||!password)return {connected:false,reason:'NOT_CONFIGURED',projects:[],jobs:[]};
  const key=createHash('sha256').update(base+'\0'+email+'\0'+password).digest('hex');
  const options={redirect:'error',cache:'no-store'};
  async function login(){
    const r=await fetcher(base+'/api/auth/login',{...options,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(5000)});
    const cookie=r.headers.get('set-cookie')?.match(/(?:^|[,\s])office_session=([a-zA-Z0-9_-]{32,128})(?:;|$)/)?.[1];
    if(!r.ok||!cookie)throw Error('OFFICE_AUTH_UNAVAILABLE');
    session={key,cookie:'office_session='+cookie,until:Date.now()+900000};
  }
  async function read(path,retry=true){const r=await fetcher(base+path,{...options,headers:{Cookie:session.cookie},signal:AbortSignal.timeout(5000)});if(r.status===401&&retry){session=null;await login();return read(path,false);}if(!r.ok)throw Error('OFFICE_UNAVAILABLE');
    const reader=r.body?.getReader();if(!reader)throw Error('OFFICE_INVALID_RESPONSE');let size=0;const chunks=[];
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1048576)throw Error('OFFICE_RESPONSE_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  try{if(!session||session.key!==key||session.until<=Date.now())await login();const p=await read('/api/projects'),j=await read('/api/jobs?limit=80'),providers=await read('/api/providers');if(!Array.isArray(p.projects)||!Array.isArray(j.jobs)||!Array.isArray(providers.providers))throw Error('OFFICE_INVALID_RESPONSE');return officeSnapshot({projects:p.projects,jobs:j.jobs,providers:providers.providers});}
  catch{return {connected:false,reason:'CONNECTION_FAILED',projects:[],jobs:[]};}
}
