import {scrypt,randomBytes} from 'node:crypto';
import {promisify} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseUrl,getSupabaseAnonKey} from '../supabase/env.js';
import {supabaseServerFetch} from '../supabase/fetch.js';
import {privateHash} from '../operations/crypto.js';
import {verifiedSessionClaims} from './session-claims.js';
import {requireSmartKey} from './smart-key.js';
import {HttpError} from '../server/http.js';
export {validatePin} from './pin-policy.js';
const derive=promisify(scrypt);
export const SECURITY_PURPOSES=['PIN_SET','PIN_CHANGE','PASSWORD_SET','PASSWORD_CHANGE','PASSKEY_ENROLL','PASSKEY_REMOVE'];
export async function pinHash(profileId,pin,salt){return (await derive(pin+':'+privateHash('ACCOUNT_PIN_PEPPER',profileId),salt,32)).toString('hex');}
export const newPinSalt=()=>randomBytes(16).toString('hex');
export async function securityState(account){const r=await account.db.rpc('reloo_account_security_state',{p_profile:account.profile.id});if(r.error||!r.data)throw new HttpError(503,'Chưa tải được bảo mật tài khoản.');return r.data;}
export async function verifyPassword(account,password){
 if(typeof password!=='string'||!password||password.length>128)return false;
 const identity=account.authUser.email?{email:account.authUser.email}:account.authUser.phone?{phone:account.authUser.phone}:null;if(!identity)return false;
 const client=createClient(getSupabaseUrl(),getSupabaseAnonKey(),{global:{fetch:supabaseServerFetch},auth:{persistSession:false,autoRefreshToken:false}});
 const r=await client.auth.signInWithPassword({...identity,password});
 const matched=!r.error&&r.data.user?.id===account.authUser.id;
 if(r.data.session)await client.auth.signOut({scope:'local'});
 return matched;
}
export function recentSecurityAuth(claims,now=Date.now()){
 return (claims?.amr||[]).some(row=>['oauth','password','passkey','otp','webauthn','magiclink'].includes(row.method)&&Number.isFinite(row.timestamp)&&row.timestamp*1000<=now+5000&&now-row.timestamp*1000<300000);
}
export async function authorizeSecurityChange(request,account,input,purpose,{passwordRequired=false}={}){
 if(!SECURITY_PURPOSES.includes(purpose))throw new HttpError(400,'Thao tác bảo mật không hợp lệ.');
 const smart=account.authUser.factors?.some(f=>f.status==='verified'&&f.factor_type==='totp')?await requireSmartKey(request,account):null;
 const approve=async()=>{if(smart){const used=await account.db.rpc('reloo_consume_smart_key',{p_actor:account.profile.id,p_receipt:smart.id});if(used.error)throw new HttpError(403,'Smart Key đã dùng hoặc hết hạn.','SMART_KEY_REQUIRED');}};
 const claims=await verifiedSessionClaims(account,request);
 let passwordVerified=false;
 if(input.currentPassword){if(!await verifyPassword(account,input.currentPassword))throw new HttpError(401,'Mật khẩu hiện tại chưa đúng.');passwordVerified=true;}
 if(passwordRequired&&!passwordVerified)throw new HttpError(400,'Nhập mật khẩu hiện tại.');
 if(typeof input.otpId==='string'){
  const r=await account.db.rpc('reloo_consume_account_otp',{p_profile:account.profile.id,p_id:input.otpId,p_session:claims.session_id,p_purpose:purpose});
  if(!r.error&&r.data===true)return approve();
  throw new HttpError(403,'Mã xác nhận đã dùng hoặc hết hạn. Hãy yêu cầu mã mới.','SECURITY_REAUTH_REQUIRED');
 }
 if(passwordVerified||recentSecurityAuth(claims))return approve();
 throw new HttpError(403,'Xác nhận mã OTP hoặc đăng nhập lại để tiếp tục.','SECURITY_REAUTH_REQUIRED');
}
