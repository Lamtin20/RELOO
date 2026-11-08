import {cookies} from 'next/headers';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {requireAccount} from '@/lib/security/authorization';
import {authorizeSecurityChange} from '@/lib/security/account-credentials';
import {verifiedSessionClaims} from '@/lib/security/session-claims';
import {openPasskeyChallenge,sealPasskeyChallenge,userVerifiedAssertion} from '@/lib/security/passkey-challenge';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/auth/passkeys',maxAge:300};
export async function POST(request){try{
 assertOrigin(request);rateLimit(request,'passkey',15);const input=await readJson(request,20000),client=await createSupabaseServerClient();if(!client)throw new HttpError(503,'Đăng nhập chưa sẵn sàng.');const jar=await cookies();
 if(input.action==='LOGIN_OPTIONS'){
  const r=await client.auth.passkey.startAuthentication();if(r.error)throw new HttpError(503,'Khóa truy cập chưa sẵn sàng. Hãy dùng mật khẩu hoặc Google.');
  jar.set('reloo-passkey-login',sealPasskeyChallenge({id:r.data.challenge_id,kind:'LOGIN'}),options);
  return Response.json({ok:true,...r.data,options:{...r.data.options,userVerification:'required'}},{headers:{'Cache-Control':'private,no-store'}});
 }
 if(input.action==='LOGIN_VERIFY'){
  if(!openPasskeyChallenge(jar.get('reloo-passkey-login')?.value,{id:input.challengeId,kind:'LOGIN'})||!userVerifiedAssertion(input.credential))throw new HttpError(401,'Thiết bị chưa xác thực người dùng hoặc lượt đăng nhập đã hết hạn.');
  jar.set('reloo-passkey-login','',{...options,maxAge:0});const r=await client.auth.passkey.verifyAuthentication({challengeId:input.challengeId,credential:input.credential});if(r.error||!r.data?.session)throw new HttpError(401,'Không xác thực được khóa truy cập. Hãy thử lại.');
  return Response.json({ok:true},{headers:{'Cache-Control':'private,no-store'}});
 }
 const account=await requireAccount(request,{active:false}),claims=await verifiedSessionClaims(account,request);
 if(input.action==='ENROLL_OPTIONS'){
  if(!openPasskeyChallenge(jar.get('reloo-passkey-enroll')?.value,{kind:'ENROLL',profile:account.profile.id,session:claims.session_id}))await authorizeSecurityChange(request,account,input,'PASSKEY_ENROLL');const r=await account.client.auth.passkey.startRegistration();if(r.error)throw new HttpError(503,'Chưa tạo được khóa truy cập.');
  jar.set('reloo-passkey-enroll',sealPasskeyChallenge({id:r.data.challenge_id,kind:'ENROLL',profile:account.profile.id,session:claims.session_id}),options);
  return Response.json({ok:true,...r.data,options:{...r.data.options,authenticatorSelection:{...r.data.options.authenticatorSelection,authenticatorAttachment:'platform',userVerification:'required',residentKey:'required'}}},{headers:{'Cache-Control':'private,no-store'}});
 }
 if(input.action==='ENROLL_VERIFY'){
  if(!openPasskeyChallenge(jar.get('reloo-passkey-enroll')?.value,{id:input.challengeId,kind:'ENROLL',profile:account.profile.id,session:claims.session_id}))throw new HttpError(401,'Lượt thiết lập đã hết hạn.');
  jar.set('reloo-passkey-enroll','',{...options,maxAge:0});const r=await account.client.auth.passkey.verifyRegistration({challengeId:input.challengeId,credential:input.credential});if(r.error)throw new HttpError(400,'Chưa lưu được khóa truy cập.');return Response.json({ok:true});
 }
 if(input.action==='REMOVE'){
  await authorizeSecurityChange(request,account,input,'PASSKEY_REMOVE');if(!/^[a-f0-9-]{36}$/i.test(input.id||''))throw new HttpError(400,'Khóa chưa hợp lệ.');const r=await account.client.auth.passkey.delete({passkeyId:input.id});if(r.error)throw new HttpError(400,'Chưa gỡ được khóa truy cập.');return Response.json({ok:true});
 }
 throw new HttpError(400,'Thao tác không hợp lệ.');
}catch(e){return errorResponse(e);}}
