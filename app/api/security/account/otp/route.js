import {randomInt,randomUUID} from 'node:crypto';
import {requireAccount} from '@/lib/security/authorization';
import {verifiedSessionClaims} from '@/lib/security/session-claims';
import {SECURITY_PURPOSES} from '@/lib/security/account-credentials';
import {privateHash} from '@/lib/operations/crypto';
import {integrationConfig,integrationReadiness} from '@/lib/operations/integrations';
import {sendGmail} from '@/lib/email/gmail';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
const labels={PIN_SET:'tạo mã PIN',PIN_CHANGE:'đổi mã PIN',PASSWORD_SET:'đặt mật khẩu',PASSWORD_CHANGE:'đổi mật khẩu',PASSKEY_ENROLL:'bật Face ID / Vân tay',PASSKEY_REMOVE:'gỡ khóa truy cập'};
export async function POST(request){try{
 assertOrigin(request);const account=await requireAccount(request,{active:false}),claims=await verifiedSessionClaims(account,request);rateLimit(request,'security-otp:'+account.profile.id,12);const input=await readJson(request,2000);
 if(input.action==='SEND'){
  if(!SECURITY_PURPOSES.includes(input.purpose))throw new HttpError(400,'Thao tác OTP không hợp lệ.');
  if(!account.authUser.email||!account.authUser.email_confirmed_at)throw new HttpError(409,'Cần email đã xác thực hoặc đăng nhập lại để xác nhận thao tác.');
  const config=await integrationConfig(account.db,'GMAIL');if(!integrationReadiness('GMAIL',config).ready)throw new HttpError(503,'OTP email chưa sẵn sàng. Hãy dùng mật khẩu hiện tại hoặc đăng nhập Google lại.');
  const id=randomUUID(),code=String(randomInt(1000000)).padStart(6,'0'),hash=privateHash('ACCOUNT_OTP',id+':'+code);
  const row=await account.db.rpc('reloo_issue_account_otp',{p_profile:account.profile.id,p_id:id,p_session:claims.session_id,p_purpose:input.purpose,p_hash:hash});
  if(row.error)throw new HttpError(429,'Chờ 60 giây trước khi yêu cầu mã mới; tối đa 8 lần mỗi giờ.');
  try{await sendGmail(config,account.authUser.email,{kind:'otp',title:'Mã xác thực '+labels[input.purpose]+' RELOO',body:'Bạn vừa yêu cầu '+labels[input.purpose]+'. Nhập mã sau để xác nhận. Mã có hiệu lực 5 phút.',code,name:account.profile.name,link:'/account/security'});const saved=await account.db.from('account_security_otps').update({delivery:'SENT'}).eq('id',id);if(saved.error)throw Error('OTP_SAVE_FAILED');}
  catch{await account.db.from('account_security_otps').update({delivery:'FAILED',consumed_at:new Date().toISOString()}).eq('id',id);throw new HttpError(503,'Chưa gửi được email OTP. Bạn có thể xác nhận bằng mật khẩu hiện tại hoặc đăng nhập lại.');}
  const [name,domain]=account.authUser.email.split('@');return Response.json({ok:true,id,email:name.slice(0,2)+'***@'+domain,resendAfter:60,expiresIn:300},{headers:{'Cache-Control':'private,no-store'}});
 }
 if(input.action!=='VERIFY'||typeof input.id!=='string'||!/^\d{6}$/.test(input.code||''))throw new HttpError(400,'Nhập mã OTP 6 số.');
 const result=await account.db.rpc('reloo_verify_account_otp',{p_profile:account.profile.id,p_id:input.id,p_session:claims.session_id,p_hash:privateHash('ACCOUNT_OTP',input.id+':'+input.code)});
 if(result.error||result.data!==true)throw new HttpError(401,'Mã chưa đúng, đã dùng hoặc hết hạn. Tối đa 5 lần thử.');
 return Response.json({ok:true,id:input.id},{headers:{'Cache-Control':'private,no-store'}});
}catch(e){return errorResponse(e);}}
