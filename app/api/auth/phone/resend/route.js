import {createSupabaseServerClient} from '@/lib/supabase/server';
import {phoneCredential} from '@/lib/auth/phone-credentials';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
export async function POST(request){try{assertOrigin(request);rateLimit(request,'phone-resend',2,60000);const {e164}=phoneCredential((await readJson(request)).phone);const auth=await createSupabaseServerClient();if(!auth)throw new HttpError(503,'Dịch vụ tài khoản chưa sẵn sàng.');const {error}=await auth.auth.resend({type:'sms',phone:e164});if(error)throw new HttpError(400,'Chưa gửi lại được mã. Vui lòng đợi rồi thử lại.');return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
