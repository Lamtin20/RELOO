import {DEFAULT_BRAIN,validateBrain,knowledgeForStorage} from './policy.js';
export async function runtimeBrain(db){
 const state=await db.from('ai_control_state').select('active_version').eq('id','global').single();if(state.error)throw Error('BRAIN_UNAVAILABLE');
 if(state.data.active_version){const r=await db.from('ai_bot_versions').select('id,version,config,knowledge').eq('id',state.data.active_version).eq('status','PUBLISHED').single();if(r.error)throw Error('BRAIN_UNAVAILABLE');return {...r.data,config:validateBrain(r.data.config),knowledge:knowledgeForStorage(r.data.knowledge),legacy:false};}
 const old=await db.from('crm_records').select('data').eq('module','bots').eq('status','APPROVED').contains('data',{purpose:'support'}).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(old.error)throw Error('BRAIN_UNAVAILABLE');
 return {id:null,version:0,config:{...structuredClone(DEFAULT_BRAIN),modelEnabled:[true,'true'].includes(old.data?.data?.enabled)},knowledge:[],legacy:true};
}
// Observable decisions only; no raw prompts, credentials or hidden reasoning.
export async function recordAiEvent(db,{source,kind,actor=null,conversation=null,version=null,data={}}){
 const safe={};for(const key of ['intent','model','decision','errorCode','durationMs','count','category','city','unsupported','answer','path'])if(data[key]!=null)safe[key]=typeof data[key]==='string'?data[key].slice(0,key==='answer'?1200:160):data[key];
 const r=await db.from('ai_events').insert({source,kind,actor_id:actor,conversation_id:conversation,bot_version:version,data:safe,expires_at:new Date(Date.now()+30*86400000).toISOString()});if(r.error)throw Error('AI_AUDIT_UNAVAILABLE');
}
