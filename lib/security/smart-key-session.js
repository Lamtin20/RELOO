import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
export const SMART_SESSION_SECONDS=15*60;
function sign(value){const key=process.env.RELOO_PRIVATE_DATA_KEY;if(!/^[a-f0-9]{64}$/i.test(key||''))throw Error('SMART_KEY_UNAVAILABLE');return createHmac('sha256',Buffer.from(key,'hex')).update('reloo-smart-key-v1:'+value).digest('base64url');}
export function createSmartReceipt({subject,sessionId,profileId,factorId,method='TOTP'},now=Date.now()){if(![subject,sessionId,profileId,factorId].every(v=>typeof v==='string'&&v.length>0&&v.length<150)||!['TOTP','PIN','PASSKEY'].includes(method))throw Error('SMART_RECEIPT_INVALID');const body={version:method==='TOTP'?1:2,method,id:randomUUID(),subject,sessionId,profileId,factorId,issuedAt:Math.floor(now/1000),expiresAt:Math.floor(now/1000)+SMART_SESSION_SECONDS},encoded=Buffer.from(JSON.stringify(body)).toString('base64url');return {id:body.id,value:encoded+'.'+sign(encoded),expiresAt:body.expiresAt*1000};}
export function validSmartReceipt(value,{claims,profileId,factors,deviceFactor},now=Date.now()){
 try{
  if(typeof value!=='string'||value.length>2000||!claims.session_id||!Number.isFinite(claims.exp)||claims.exp*1000<=now)return null;
  const parts=value.split('.');if(parts.length!==2)return null;
  const expected=Buffer.from(sign(parts[0]),'base64url'),actual=Buffer.from(parts[1],'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const body=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  if(![1,2].includes(body.version)||!/^[a-f0-9-]{36}$/i.test(body.id||'')||body.subject!==claims.sub||body.sessionId!==claims.session_id||body.profileId!==profileId||!Number.isInteger(body.issuedAt)||!Number.isInteger(body.expiresAt)||body.issuedAt>now/1000+30||body.expiresAt<=now/1000||body.expiresAt-body.issuedAt!==SMART_SESSION_SECONDS)return null;
  if(body.version===1){if(claims.aal!=='aal2'||!factors?.some(f=>f.id===body.factorId&&f.factor_type==='totp'&&f.status==='verified'))return null;}
  else{if(!['PIN','PASSKEY'].includes(body.method)||!deviceFactor||body.factorId!==deviceFactor)return null;if(factors?.some(f=>f.factor_type==='totp'&&f.status==='verified')&&claims.aal!=='aal2')return null;}
  return body;
 }catch{return null;}
}
