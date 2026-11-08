import {createSupabaseServerClient} from '@/lib/supabase/server';
import {securityDb} from '@/lib/security/service';
import {authCapabilities} from '@/lib/auth/capabilities';
import {assertRegistrationStorageReady} from '@/lib/auth/provision';
import {phoneSignupInput} from '@/lib/auth/phone-credentials';
import {assertUniqueContact} from '@/lib/auth/duplicates';
import {assertOrigin,errorResponse,HttpError,rateLimit,readJson} from '@/lib/server/http';
export async function POST(request){try{assertOrigin(request);rateLimit(request,'signup',5);const input=phoneSignupInput(await readJson(request));const capability=await authCapabilities();if(!capability.available||!capability.phoneSignup)throw new HttpError(503,'Đăng ký số điện thoại chưa sẵn sàng. Vui lòng thử lại sau.','PHONE_SIGNUP_UNAVAILABLE');const db=securityDb();await assertUniqueContact(db,null,input.phone);await assertRegistrationStorageReady(db);const auth=await createSupabaseServerClient();if(!auth)throw new HttpError(503,'Dịch vụ tài khoản chưa sẵn sàng.');const {data,error}=await auth.auth.signUp({phone:input.e164,password:input.password});if(error||!data.user)throw new HttpError(error?.status>=500?503:400,'Chưa gửi được mã xác nhận. Kiểm tra số điện thoại hoặc thử lại sau.','PHONE_SIGNUP_FAILED');return Response.json({ok:true,confirmationRequired:!data.session,next:'/auth/complete'},{status:201,headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
