const bounded=(value,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max?value:null;
const ids=new Set(['web','worker','tunnel','database','auth','storage','rest','edge','browser','kyc','localAI','localNewsAI','redis','monitoring']);
export function infrastructureSnapshot(row,now=Date.now()){
 const at=Date.parse(row?.observed_at),raw=row?.observations;
 if(!Number.isFinite(at)||at>now+30000||!raw||raw.scope!=='LINUX_SERVER')return null;
 return {at:new Date(at).toISOString(),stale:now-at>180000,scope:'LINUX_SERVER',cpuPercent:bounded(raw.cpuPercent,100),memoryUsedMb:bounded(raw.memoryUsedMb,1e9),memoryTotalMb:bounded(raw.memoryTotalMb,1e9),diskUsedGb:bounded(raw.diskUsedGb,1e9),diskTotalGb:bounded(raw.diskTotalGb,1e9),hostDiskFreeGb:bounded(raw.hostDiskFreeGb,1e9),publicHttpStatus:bounded(raw.publicHttpStatus,599),kubernetes:kubernetesSnapshot(raw.kubernetes,now),containers:(Array.isArray(raw.containers)?raw.containers:[]).slice(0,20).filter(c=>ids.has(c.id)).map(c=>({id:c.id,status:['running','exited','restarting','paused','created','dead'].includes(c.status)?c.status:'unknown',health:['healthy','unhealthy','starting'].includes(c.health)?c.health:null,restarts:bounded(c.restarts,1e6)}))};
}
export function kubernetesSnapshot(raw,now=Date.now()){
 const at=Date.parse(raw?.observedAt);if(!raw||!Number.isFinite(at)||at>now+30000)return null;
 const total=bounded(raw.totalPods,16),ready=bounded(raw.readyPods,16);
 return {at:new Date(at).toISOString(),stale:now-at>180000,totalPods:total,readyPods:ready!==null&&total!==null&&ready<=total?ready:null,desiredReplicas:bounded(raw.desiredReplicas,16),maxReplicas:bounded(raw.maxReplicas,16),autoscalingActive:typeof raw.autoscalingActive==='boolean'?raw.autoscalingActive:null,publicPageRouting:typeof raw.publicPageRouting==='boolean'?raw.publicPageRouting:null,singlePhysicalHost:raw.singlePhysicalHost===true?true:null};
}
