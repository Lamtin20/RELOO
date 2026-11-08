import {cookies} from 'next/headers';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseUrl,getSupabaseAnonKey} from '@/lib/supabase/env';
import {supabaseServerFetch} from '@/lib/supabase/fetch';
import {requireAccount} from '@/lib/security/authorization';
import {verifiedSessionClaims} from '@/lib/security/session-claims';
import {securityState,pinHash} from '@/lib/security/account-credentials';
import {passkeySetFactor} from '@/lib/security/device-factor';
import {openPasskeyChallenge,sealPasskeyChallenge,userVerifiedAssertion} from '@/lib/security/passkey-challenge';
import {SMART_COOKIE,SMART_SESSION_SECONDS,createSmartReceipt} from '@/lib/security/smart-key';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
const challengeOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/security/confirm',maxAge:300};
const isolated=()=>createClient(getSupabaseUrl(),getSupabaseAnonKey(),{global:{fetch:supabaseServerFetch},auth:{persistSession:false,autoRefreshToken:false,experimental:{passkey:true}}});
export async function GET(request){try{const account=await requireAccount(request,{active:false}),state=await securityState(account),keys=await account.client.auth.passkey.list();return Response.json({ok:true,hasPin:state.hasPin,hasPasskey:!keys.error&&keys.data?.length>0},{headers:{'Cache-Control':'private,no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(request){try{
 assertOrigin(request);const account=await requireAccount(request,{active:false});if(request.headers.has('authorization'))throw new HttpError(400,'Dùng phiên ứng dụng để xác nhận.');rateLimit(request,'device-confirm:'+account.profile.id,10);const input=await readJson(request,20000),claims=await verifiedSessionClaims(account,request),jar=await cookies();
 const expected={kind:'CONFIRM',profile:account.profile.id,session:claims.session_id};
 if(input.action==='PASSKEY_OPTIONS'){
  const keys=await account.client.auth.passkey.list();if(keys.error||!keys.data?.length)throw new HttpError(409,'Hãy bật sinh trắc học trong Đăng nhập & Bảo mật trước.');
  const r=await isolated().auth.passkey.startAuthentication();if(r.error)throw new HttpError(503,'Chưa mở được xác thực thiết bị. Hãy dùng PIN.');
  jar.set('reloo-device-confirm',sealPasskeyChallenge({...expected,id:r.data.challenge_id}),challengeOptions);
  return Response.json({ok:true,...r.data,options:{...r.data.options,userVerification:'required'}},{headers:{'Cache-Control':'private,no-store'}});
 }
 let method,factorId;
 if(input.action==='PASSKEY_VERIFY'){
  if(!openPasskeyChallenge(jar.get('reloo-device-confirm')?.value,{...expected,id:input.challengeId})||!userVerifiedAssertion(input.credential))throw new HttpError(401,'Lượt xác nhận đã hết hạn hoặc thiết bị chưa xác thực.');
  jar.set('reloo-device-confirm','',{...challengeOptions,maxAge:0});
  const client=isolated();let verified;
  try{const r=await client.auth.passkey.verifyAuthentication({challengeId:input.challengeId,credential:input.credential});verified=!r.error&&!!r.data?.session&&r.data.user?.id===account.authUser.id;}finally{await client.auth.signOut({scope:'local'}).catch(()=>{});}
  if(!verified)throw new HttpError(401,'Khóa truy cập không thuộc tài khoản hiện tại. Hãy dùng PIN.');
  const keys=await account.client.auth.passkey.list();if(keys.error||!keys.data?.length)throw new HttpError(409,'Khóa truy cập đã thay đổi.');method='PASSKEY';factorId=passkeySetFactor(keys.data);
 }else if(input.action==='PIN_VERIFY'){
  if(typeof input.pin!=='string'||!/^\d{6}$/.test(input.pin))throw new HttpError(400,'Nhập PIN 6 số.');
  const row=await account.db.from('account_security').select('pin_salt,revision').eq('profile_id',account.profile.id).single();if(row.error||!row.data?.pin_salt)throw new HttpError(409,'Hãy tạo PIN trong Đăng nhập & Bảo mật.');
  const result=await account.db.rpc('reloo_verify_account_pin',{p_profile:account.profile.id,p_hash:await pinHash(account.profile.id,input.pin,row.data.pin_salt)});if(result.error||result.data!==true)throw new HttpError(401,'PIN chưa đúng hoặc đang tạm khóa. Sau 5 lần sai, chờ 15 phút.');
  method='PIN';factorId='PIN:'+row.data.revision;
 }else throw new HttpError(400,'Thao tác xác nhận không hợp lệ.');
 // Preserve an already configured TOTP requirement; device confirmation is not
 // a way to lower the account's existing MFA assurance.
 if(account.authUser.factors?.some(f=>f.factor_type==='totp'&&f.status==='verified')&&claims.aal!=='aal2')throw new HttpError(403,'Tài khoản đã bật Smart Key. Hãy xác nhận thêm mã Smart Key.','SMART_KEY_REQUIRED');
 const receipt=createSmartReceipt({subject:account.authUser.id,sessionId:claims.session_id,profileId:account.profile.id,factorId,method});
 const saved=await account.db.from('smart_key_sessions').insert({id:receipt.id,profile_id:account.profile.id,auth_session_id:claims.session_id,expires_at:new Date(receipt.expiresAt).toISOString()});if(saved.error)throw new HttpError(503,'Chưa lưu được lượt xác nhận.');
 jar.set(SMART_COOKIE,receipt.value,{...challengeOptions,path:'/',maxAge:SMART_SESSION_SECONDS});return Response.json({ok:true,authorized:true},{headers:{'Cache-Control':'private,no-store'}});
}catch(e){return errorResponse(e);}}
