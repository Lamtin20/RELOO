// Only server processes call this; no identifiers, payloads or credentials are stored.
export async function writeOperationsHeartbeat(db,{now=Date.now(),modules=[]}={}){
 if(!db)return false;
 try{
  const result=await db.from('operations_heartbeats').upsert({id:'operations',seen_at:new Date(now).toISOString(),modules:modules.filter(m=>['calendar','neighborhood','personalization'].includes(m))});
  return !result.error;
 }catch{return false;}
}
export function heartbeatState(row,now=Date.now()){
 const timestamp=Date.parse(row?.seen_at);
 if(!Number.isFinite(timestamp)||timestamp>now+30000)return 'unknown';
 return now-timestamp<=90000?'recent':'stale';
}
