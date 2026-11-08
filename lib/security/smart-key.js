import {createSmartReceipt,validSmartReceipt,SMART_SESSION_SECONDS} from './smart-key-session.js';
import {verifiedSessionClaims} from './session-claims.js';
import {HttpError} from '../server/http.js';
import {passkeySetFactor} from './device-factor.js';
export const SMART_COOKIE='reloo-smart-key';
export {createSmartReceipt,SMART_SESSION_SECONDS};
export async function requireSmartKey(request,account){
 const claims=await verifiedSessionClaims(account,request),value=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(SMART_COOKIE+'='))?.slice(SMART_COOKIE.length+1);
 let method,deviceFactor;
 // Untrusted hint only selects a lookup; the signed receipt is validated below.
 try{method=JSON.parse(Buffer.from(value.split('.')[0],'base64url').toString()).method;}catch{}
 if(method==='PIN'){const state=await account.db.rpc('reloo_account_security_state',{p_profile:account.profile.id});if(state.error)throw new HttpError(503,'Chưa kiểm tra được PIN.');if(state.data?.hasPin)deviceFactor='PIN:'+state.data.revision;}
 if(method==='PASSKEY'){const keys=await account.client.auth.passkey.list();if(keys.error)throw new HttpError(503,'Chưa kiểm tra được khóa truy cập.');if(keys.data?.length)deviceFactor=passkeySetFactor(keys.data);}
 const receipt=validSmartReceipt(value,{claims,profileId:account.profile.id,factors:account.authUser.factors,deviceFactor});
 if(!receipt)throw new HttpError(403,'Xác thực Smart Key để xác nhận thao tác.','SMART_KEY_REQUIRED');
 const row=await account.db.from('smart_key_sessions').select('expires_at,revoked_at').eq('id',receipt.id).eq('profile_id',account.profile.id).eq('auth_session_id',claims.session_id).maybeSingle();
 if(row.error)throw new HttpError(503,'Chưa kiểm tra được Smart Key.');
 if(!row.data||row.data.revoked_at||Date.parse(row.data.expires_at)!==receipt.expiresAt*1000)throw new HttpError(403,'Smart Key đã hết hiệu lực.','SMART_KEY_REQUIRED');
 return receipt;
}
