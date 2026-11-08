import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
export async function photonUpdateStatus(){
 const status={schedule:'00:00 Monday',timezone:'Asia/Ho_Chi_Minh',timerEnabled:'NOT_VERIFIED',outcome:'UNAVAILABLE',checkedAt:null};
 if(!process.env.RELOO_PHOTON_ACTIVE_STATE)return status;
 try{
  const raw=await readFile(join(dirname(process.env.RELOO_PHOTON_ACTIVE_STATE),'last-run.json'));if(raw.length>16000)return status;
  const data=JSON.parse(raw.toString());
  if(data.schemaVersion!==1||!['RUNNING','UNCHANGED','UPDATED','FAILED'].includes(data.outcome))return status;
  return {...status,outcome:data.outcome,checkedAt:typeof data.at==='string'&&Number.isFinite(Date.parse(data.at))?new Date(data.at).toISOString():null};
 }catch{return status}
}
