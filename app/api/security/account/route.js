import {requireAccount} from '@/lib/security/authorization';
import {authorizeSecurityChange,newPinSalt,pinHash,securityState,validatePin} from '@/lib/security/account-credentials';
import {validatePassword} from '@/lib/password-policy';
import {integrationConfig,integrationReadiness} from '@/lib/operations/integrations';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
export async function GET(request){try{
 const account=await requireAccount(request,{active:false}),state=await securityState(account);
 const keys=await account.client.auth.passkey.list();
 const mail=integrationReadiness('GMAIL',await integrationConfig(account.db,'GMAIL'));
 return Response.json({ok:true,hasPin:state.hasPin,hasPassword:state.hasPassword,pinLockedUntil:state.pinLockedUntil,passkeys:keys.error?[]:keys.data||[],passkeysAvailable:!keys.error,emailAvailable:!!account.authUser.email_confirmed_at,otpAvailable:mail.ready===true,hasTotp:account.authUser.factors?.some(f=>f.factor_type==='totp'&&f.status==='verified')||false},{headers:{'Cache-Control':'private,no-store'}});
}catch(e){return errorResponse(e);}}
export async function POST(request){try{
 assertOrigin(request);const account=await requireAccount(request,{active:false});rateLimit(request,'account-credential:'+account.profile.id,6);const input=await readJson(request,5000),state=await securityState(account);
 const purpose=input.action;if(!['PIN_SET','PIN_CHANGE','PASSWORD_SET','PASSWORD_CHANGE'].includes(purpose))throw new HttpError(400,'Thao tác không hợp lệ.');
 if(purpose.startsWith('PIN_')){
  if((purpose==='PIN_SET')===state.hasPin)throw new HttpError(409,'Trạng thái PIN đã thay đổi. Hãy tải lại.');
  if(!validatePin(input.pin)||input.pin!==input.confirmPin)throw new HttpError(400,'PIN cần 6 số, không lặp/liên tiếp và nhập lại trùng khớp.');
  if(state.hasPin){const row=await account.db.from('account_security').select('pin_salt').eq('profile_id',account.profile.id).single();if(row.error||typeof input.oldPin!=='string'||!/^\d{6}$/.test(input.oldPin))throw new HttpError(400,'Nhập PIN hiện tại.');const candidate=await pinHash(account.profile.id,input.oldPin,row.data.pin_salt),checked=await account.db.rpc('reloo_verify_account_pin',{p_profile:account.profile.id,p_hash:candidate});if(checked.error||checked.data!==true)throw new HttpError(401,'PIN chưa đúng hoặc đang tạm khóa. Sau 5 lần sai, chờ 15 phút.');}
  await authorizeSecurityChange(request,account,input,purpose);
  const salt=newPinSalt(),saved=await account.db.rpc('reloo_set_account_pin',{p_profile:account.profile.id,p_hash:await pinHash(account.profile.id,input.pin,salt),p_salt:salt,p_revision:state.revision});if(saved.error)throw new HttpError(409,'Chưa lưu được PIN. Hãy tải lại và thử lại.');
 }else{
  if((purpose==='PASSWORD_SET')===state.hasPassword)throw new HttpError(409,'Trạng thái mật khẩu đã thay đổi. Hãy tải lại.');
  const error=validatePassword(input.password);if(error)throw new HttpError(400,error);if(input.password!==input.confirmPassword)throw new HttpError(400,'Mật khẩu nhập lại chưa khớp.');
  await authorizeSecurityChange(request,account,input,purpose,{passwordRequired:state.hasPassword});
  const saved=await account.client.auth.updateUser({password:input.password});if(saved.error)throw new HttpError(400,'Chưa lưu được mật khẩu. Hãy xác thực lại và thử lại.');
 }
 return Response.json({ok:true},{headers:{'Cache-Control':'private,no-store'}});
}catch(e){return errorResponse(e);}}
