import {requireAccount} from '@/lib/security/authorization';
import {assertOrigin,errorResponse,HttpError,readJson,rateLimit} from '@/lib/server/http';
import {encryptPrivate,decryptPrivate,privateHash} from '@/lib/operations/crypto';
export async function GET(request){
  try{
    const {profile,db}=await requireAccount(request,{active:false});if(!profile.email)throw new HttpError(400,'Email is not linked to this account.','EMAIL_REQUIRED');const hash=privateHash('EMAIL_EXPOSURE',profile.email.toLowerCase()),row=await db.from('email_exposure_checks').select('result_encrypted,status,checked_at,expires_at').eq('profile_id',profile.id).eq('email_hash',hash).maybeSingle();
    if(row.error)throw new Error('EXPOSURE_STORAGE_UNAVAILABLE');
    const data=row.data?.result_encrypted?JSON.parse(decryptPrivate(row.data.result_encrypted)):null;
    return Response.json({ok:true,status:row.data?.status||'NOT_CHECKED',result:data,stale:row.data?.expires_at?Date.parse(row.data.expires_at)<Date.now():false},{headers:{'Cache-Control':'no-store'}});
  }catch(cause){return errorResponse(cause);}
}
export async function POST(request){
  try{
    assertOrigin(request);rateLimit(request,'email-exposure',3);
    const {profile,authUser,db}=await requireAccount(request,{active:false}),input=await readJson(request);
    if(!profile.email)throw new HttpError(400,'Email is not linked to this account.','EMAIL_REQUIRED');if(input.consent!==true||!authUser.email_confirmed_at)throw new HttpError(400,'Cần xác nhận đồng ý tra cứu email của bạn.');
    const email=profile.email.toLowerCase(),result=await db.rpc('reloo_request_email_exposure',{p_profile:profile.id,p_hash:privateHash('EMAIL_EXPOSURE',email),p_email:encryptPrivate(email)});
    if(result.error)throw new HttpError(503,'Chưa tạo được lượt kiểm tra.');
    return Response.json({ok:true,...result.data});
  }catch(cause){return errorResponse(cause);}
}
