import {integrationConfig} from '../operations/integrations.js';
// Protocols verified against Vibi's own client guide, pricing catalog and live probes.
// One request per invocation. A timeout is an unknown billing outcome, never retried.
export async function vibiConfig(db){
 const c=await integrationConfig(db,'VIBI_NEWS');
 const base=c.VIBI_BASE_URL||process.env.VIBI_BASE_URL;
 if(base!=='https://vibi.top/v1')throw Error('VIBI_BASE_NOT_VERIFIED');
 const key=c.VIBI_API_KEY||process.env.VIBI_API_KEY;
 if(!key)throw Error('VIBI_KEY_NOT_CONFIGURED');
 return {...c,VIBI_BASE_URL:base,VIBI_API_KEY:key};
}
export async function vibiRequest(config,path,body,{multipart=false,timeout=180000,fetcher=fetch}={}){
 if(!['/chat/completions','/images/edits','/images/generations'].includes(path))throw Error('VIBI_PROTOCOL_NOT_VERIFIED');
 let response;
 try{response=await fetcher(config.VIBI_BASE_URL+path,{method:'POST',headers:{Authorization:'Bearer '+config.VIBI_API_KEY,...(!multipart?{'Content-Type':'application/json'}:{})},body:multipart?body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});}
 catch{throw Error('VIBI_OUTCOME_UNKNOWN_NO_RETRY');}
 if(!response.ok)throw Error(({401:'VIBI_AUTH_FAILED',403:'VIBI_MODEL_DENIED',429:'VIBI_QUOTA_OR_RATE_LIMIT'})[response.status]||'VIBI_HTTP_'+response.status);
 try{return await response.json();}catch{throw Error('VIBI_RESPONSE_INVALID_NO_RETRY');}
}
export async function vibiJson(config,messages,schema){
 const model=config.VIBI_TEXT_MODEL||process.env.VIBI_TEXT_MODEL;
 if(model!=='claude-sonnet-4-6')throw Error('VIBI_TEXT_MODEL_NOT_VERIFIED');
 const body={model,stream:false,max_tokens:2400,messages:[...messages,{role:'user',content:'Return one JSON object only, no markdown fences. Required JSON schema: '+JSON.stringify(schema)}]};
 if(Buffer.byteLength(JSON.stringify(body),'utf8')>28000)throw Error('NEWS_TEXT_PAYLOAD_TOO_LARGE');
 const data=await vibiRequest(config,'/chat/completions',body);
 if(data.choices?.[0]?.finish_reason!=='stop')throw Error('VIBI_TEXT_INCOMPLETE');
 const content=data.choices[0].message?.content;
 if(typeof content!=='string'||content.length>30000)throw Error('VIBI_TEXT_INVALID');
 try{return {value:JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')),usage:data.usage||null,model};}catch{throw Error('VIBI_JSON_INVALID');}
}
export async function checkVibiConnection(db){
 const config=await vibiConfig(db);let response;
 try{response=await fetch(config.VIBI_BASE_URL+'/models',{headers:{Authorization:'Bearer '+config.VIBI_API_KEY},signal:AbortSignal.timeout(15000)});}catch{throw Error('VIBI_CONNECTION_FAILED');}
 if(!response.ok)throw Error(response.status===401?'VIBI_AUTH_FAILED':'VIBI_CONNECTION_HTTP_'+response.status);
 const data=await response.json();const ids=(data.data||[]).map(m=>m.id);
 return{status:'CONNECTED',checkedAt:new Date().toISOString(),textModel:config.VIBI_TEXT_MODEL,imageModel:config.VIBI_IMAGE_MODEL,textListed:ids.includes(config.VIBI_TEXT_MODEL),imageListed:ids.includes(config.VIBI_IMAGE_MODEL),note:'Kết nối và quyền xem model hợp lệ. Danh sách model không thay thế kiểm tra tạo nội dung.'};
}
