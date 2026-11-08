import {randomUUID} from 'node:crypto';
import {vibiConfig,vibiJson,vibiRequest} from './vibi.js';
import {encodeWebp} from '../images/webp.js';
import {editorialImagePrompt} from './image-direction.js';
import {verifyVibiPrices,vibiBillSnapshot,billVnd,reservedVnd} from './billing.js';
import{mkdir,writeFile,readFile}from'node:fs/promises';import{join}from'node:path';import{MEDIA_ROOT}from'../content/media.js';
export async function paidNewsSession(db,runId,candidateId){
 const config=await vibiConfig(db);
 await verifyVibiPrices();
 async function invoke(kind,model,call){
  const id=randomUUID();
  const before=await vibiBillSnapshot(config,model);
  const reserved=await db.rpc('reloo_news_reserve_api_call',{p_id:id,p_run:runId,p_candidate:candidateId,p_kind:kind,p_model:model});
  if(reserved.error)throw Error(reserved.error.message?.includes('NEWS_API_BUDGET_WAIT')?'NEWS_API_BUDGET_WAIT':reserved.error.message?.includes('NEWS_BILLING_UNCERTAIN')?'NEWS_BILLING_UNCERTAIN':'NEWS_PAID_BUDGET_OR_PERMISSION_REQUIRED');
  const started=await db.from('news_autopilot_api_calls').update({billing_before:before}).eq('id',id);if(started.error)throw Error('NEWS_BILLING_RECORD_UNCERTAIN');
  try{
   const result=await call();
   let stored=result.value||null;
   if(result.bytes){const cache=await encodeWebp(result.bytes,{maxEdge:1200,maxBytes:285000});await mkdir(MEDIA_ROOT,{recursive:true});await writeFile(join(MEDIA_ROOT,id+'.webp'),cache.data,{flag:'wx'});stored={image_file:id+'.webp',width:cache.info.width,height:cache.info.height};}
   await db.from('news_autopilot_api_calls').update({result_value:stored,usage:result.usage||{}}).eq('id',id);
   let after,settled;
   for(let i=0;i<5;i++){
    after=await vibiBillSnapshot(config,model,before.day);
    try{settled=billVnd(before,after);break;}catch{if(i===4)throw Error('NEWS_BILLING_UNCERTAIN');await new Promise(resolve=>setTimeout(resolve,(i+1)*1000));}
   }
   const over=settled>reservedVnd(kind);
   const saved=await db.from('news_autopilot_api_calls').update({status:over?'UNCERTAIN':'SUCCEEDED',settled_vnd:settled,billing_after:after,usage:result.usage||{},finished_at:new Date().toISOString()}).eq('id',id);
   if(saved.error)throw Error('NEWS_BILLING_RECORD_UNCERTAIN');
   if(over)throw Error('NEWS_PRICE_EXCEEDED_RESERVATION');
   return result;
  }catch(e){
   await db.from('news_autopilot_api_calls').update({status:'UNCERTAIN',error_code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'API_FAILED',finished_at:new Date().toISOString()}).eq('id',id);
   throw e;
  }
 }
 return {
  json:async(messages,schema)=>(await invoke('TEXT',config.VIBI_TEXT_MODEL,()=>vibiJson(config,messages,schema))).value,
  image:async({title,topic})=>{
   const model=config.VIBI_IMAGE_MODEL;
   if(model!=='gpt-image-2')throw Error('VIBI_IMAGE_MODEL_NOT_VERIFIED');
   const prompt=editorialImagePrompt({title,topic});
   const cached=await db.from('news_autopilot_api_calls').select('result_value').eq('candidate_id',candidateId).eq('kind','IMAGE').eq('status','SUCCEEDED').order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(cached.error)throw Error('NEWS_IMAGE_CACHE_CHECK_FAILED');
   const file=cached.data?.result_value;
   if(file?.image_file&&/^[a-f0-9-]{36}\.webp$/i.test(file.image_file))return {data:await readFile(join(MEDIA_ROOT,file.image_file)),width:file.width,height:file.height,prompt,model};
   const result=await invoke('IMAGE',model,async()=>{const data=await vibiRequest(config,'/images/generations',{model,prompt,size:'1536x1024',quality:'low',output_format:'png'});const encoded=data.data?.[0]?.b64_json;if(typeof encoded!=='string'||encoded.length>30000000||!/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(encoded))throw Error('VIBI_IMAGE_RESPONSE_INVALID');return {bytes:Buffer.from(encoded,'base64'),usage:data.usage||{}};});
   const encoded=await encodeWebp(result.bytes,{maxEdge:1200,maxBytes:285000});
   return {data:encoded.data,width:encoded.info.width,height:encoded.info.height,prompt,model};
  },
 };
}
