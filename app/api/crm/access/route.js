import { cookies } from "next/headers";
import { requireCrmStaff, verifiedCrmClaims, requireCrmAccess } from "@/lib/operations/crm-auth";
import { CRM_COOKIE, CRM_SESSION_SECONDS, createCrmReceipt } from "@/lib/operations/crm-session";
import { crmViews } from "@/lib/operations/access";
import {federationProof,revokeFederation} from '@/lib/auth/federation-identity';
import {FEDERATION_COOKIE} from '@/lib/auth/federation-policy';
import { assertOrigin, errorResponse, HttpError, readJson, rateLimit } from "@/lib/server/http";
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:CRM_SESSION_SECONDS};
export async function GET(request) {
  try {
    const account=await requireCrmStaff(request);
    let access=null;try{access=await requireCrmAccess(request,account);}catch(e){if(e.code!=="CRM_MFA_REQUIRED")throw e;}
    return Response.json({ok:true,user:{name:account.profile.name,email:account.profile.email},
      factors:(account.authUser.factors || []).filter(f=>f.factor_type==="totp" && f.status==="verified").map(f=>({id:f.id,name:f.friendly_name || "Google Authenticator"})),
      authorized:!!access,expiresAt:access?access.crmReceipt.expiresAt*1000:null,views:crmViews(account.staff)},
      {headers:{"Cache-Control":"private,no-store"}});
  }catch(e){return errorResponse(e);}
}
export async function POST(request) {
  try {
    assertOrigin(request);const input=await readJson(request,2000);
    if(input.action==="LOGOUT"){
      try {
        const account=await requireCrmAccess(request);if(federationProof(account.authUser)){await revokeFederation(request);(await cookies()).set(FEDERATION_COOKIE,'',{...cookieOptions,maxAge:0});return Response.json({ok:true});}const revoked=await account.db.from("crm_mfa_sessions").update({revoked_at:new Date().toISOString()}).eq("id",account.crmReceipt.id);
        if(revoked.error)throw new HttpError(503,"Chưa thu hồi được phiên CRM. Vui lòng thử lại.");
      }catch(e){if(e.status!==401 && !["CRM_ACCESS_DENIED","CRM_MFA_REQUIRED"].includes(e.code))throw e;}
      (await cookies()).set(CRM_COOKIE,"",{...cookieOptions,maxAge:0});return Response.json({ok:true});
    }
    const account=await requireCrmStaff(request);
    if(account.ssoAccessToken||federationProof(account.authUser))throw new HttpError(400,'Tiếp tục xác thực tại trang CRM trung tâm.','CENTRAL_MFA_REQUIRED');
    if(request.headers.get("authorization")?.startsWith('Bearer '))throw new HttpError(400,"Đăng nhập bằng phiên trình duyệt để xác thực CRM.");
    rateLimit(request,"crm-mfa:"+account.profile.id,8);
    if(input.action==="ENROLL") {
      if(account.authUser.factors?.some(f=>f.factor_type==="totp"&&f.status==="verified"))throw new HttpError(409,"Tài khoản đã có Google Authenticator. Hãy dùng mã từ ứng dụng.");
      for(const factor of account.authUser.factors || [])if(factor.factor_type==="totp"&&factor.status==="unverified"&&factor.friendly_name==="RELOO CRM") {
        const removed=await account.client.auth.mfa.unenroll({factorId:factor.id});if(removed.error)throw new HttpError(503,"Chưa cập nhật được bước thiết lập xác thực.");
      }
      const r=await account.client.auth.mfa.enroll({factorType:"totp",friendlyName:"RELOO CRM",issuer:"RELOO CRM"});
      if(r.error)throw new HttpError(503,"Chưa tạo được mã thiết lập Google Authenticator.","MFA_ENROLL_UNAVAILABLE");
      return Response.json({ok:true,factorId:r.data.id,qrCode:r.data.totp.qr_code,secret:r.data.totp.secret},{headers:{"Cache-Control":"private,no-store"}});
    }
    if(input.action!=="VERIFY"||typeof input.code!=="string"||!/^\d{6}$/.test(input.code)||
       !account.authUser.factors?.some(f=>f.id===input.factorId&&f.factor_type==="totp"))
      throw new HttpError(400,"Nhập mã 6 số của Google Authenticator trên tài khoản này.");
    const r=await account.client.auth.mfa.challengeAndVerify({factorId:input.factorId,code:input.code});
    if(r.error)throw new HttpError(401,"Mã xác thực chưa đúng hoặc đã hết hiệu lực. Vui lòng dùng mã mới.","MFA_CODE_INVALID");
    const claims=await verifiedCrmClaims(account,request,r.data.access_token);
    if(claims.aal!=="aal2"||!claims.session_id)throw new HttpError(403,"Phiên xác thực chưa hoàn tất.","CRM_MFA_REQUIRED");
    const receipt=createCrmReceipt({subject:account.authUser.id,sessionId:claims.session_id,profileId:account.profile.id,factorId:input.factorId});
    const created=await account.db.from("crm_mfa_sessions").insert({id:receipt.id,profile_id:account.profile.id,auth_session_id:claims.session_id,factor_id:input.factorId,expires_at:new Date(receipt.expiresAt).toISOString()});
    if(created.error)throw new HttpError(503,"Chưa tạo được phiên CRM.");
    (await cookies()).set(CRM_COOKIE,receipt.value,cookieOptions);
    const audit=await account.db.from("security_audit").insert({actor_id:account.profile.id,action:"CRM_MFA_VERIFIED",details:{method:"TOTP",expiresAt:new Date(receipt.expiresAt).toISOString()}});
    if(audit.error){(await cookies()).set(CRM_COOKIE,"",{...cookieOptions,maxAge:0});throw new HttpError(503,"Chưa ghi nhận được phiên xác thực. Vui lòng thử lại.");}
    return Response.json({ok:true,expiresAt:receipt.expiresAt},{headers:{"Cache-Control":"private,no-store"}});
  }catch(e){return errorResponse(e);}
}
