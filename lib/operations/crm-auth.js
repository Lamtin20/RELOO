import { requireAccount } from "../security/authorization.js";
import { HttpError } from "../server/http.js";
import { crmAllowed, effectiveCrmPermissions, crmViews } from "./access.js";
import { crmCookieValue, validCrmReceipt } from "./crm-session.js";
import {managementCookie,managementBridgeAccount} from '../auth/management-bridge.js';
import {federationCookie,federationProof,federationOrigin} from '../auth/federation-identity.js';
import {federationClientConfigured} from '../auth/federation-policy.js';
export async function requireCrmStaff(request) {
  const centralClient=federationClientConfigured(federationOrigin(request));
  const account=managementCookie(request)&&!(centralClient&&federationCookie(request))?await managementBridgeAccount(request):await requireAccount(request,{active:false});
  const row=await account.db.from("crm_staff").select("role,permissions,enabled").eq("profile_id",account.profile.id).maybeSingle();
  if(row.error)throw new HttpError(503,"Chưa đọc được quyền truy cập.");
  if(!crmAllowed(row.data,"crm.read"))throw new HttpError(403,"Tài khoản chưa được cấp quyền vào CRM.","CRM_ACCESS_DENIED");
  const staff={...row.data,permissions:effectiveCrmPermissions(row.data)};
  if(!crmViews(staff).length)throw new HttpError(403,"Tài khoản chưa được cấp phân hệ CRM. Vui lòng liên hệ quản trị.","CRM_ACCESS_DENIED");
  return {...account,staff};
}
export async function verifiedCrmClaims(account,request,token=null) {
  const authorization=request.headers.get('authorization');
  token ||= account.ssoAccessToken || (authorization?.startsWith('Bearer ')?authorization.slice(7):null) || (await account.client.auth.getSession()).data.session?.access_token;
  if(!token)throw new HttpError(401,"Vui lòng đăng nhập lại.","AUTH_REQUIRED");
  const result=await account.client.auth.getClaims(token);
  if(result.error?.status>=500 || result.error?.name==="AuthRetryableFetchError")throw new HttpError(503,"Dịch vụ xác minh phiên đang tạm gián đoạn.");
  if(result.error || !result.data?.claims || result.data.claims.sub!==account.authUser.id)
    throw new HttpError(401,"Phiên đăng nhập chưa được xác nhận.","AUTH_REQUIRED");
  return result.data.claims;
}
export async function requireCrmAccess(request,account=null) {
  account ||= await requireCrmStaff(request);
  const federation=federationProof(account.authUser);
  if(federation){if(federation.expiresAt<=Date.now())throw new HttpError(401,'Phiên CRM đã hết hạn.','AUTH_REQUIRED');return {...account,crmReceipt:{id:federation.receipt,expiresAt:Math.floor(federation.expiresAt/1000),federated:true}};}
  const claims=await verifiedCrmClaims(account,request);
  const receipt=validCrmReceipt(crmCookieValue(request),{claims,profileId:account.profile.id,factors:account.authUser.factors});
  if(!receipt)throw new HttpError(403,"Cần xác thực Google Authenticator trước khi vào CRM.","CRM_MFA_REQUIRED");
  const session=await account.db.from("crm_mfa_sessions").select("id,expires_at,revoked_at").eq("id",receipt.id).eq("profile_id",account.profile.id).eq("auth_session_id",claims.session_id).maybeSingle();
  if(session.error)throw new HttpError(503,"Chưa kiểm tra được phiên CRM.");
  if(!session.data || session.data.revoked_at || Date.parse(session.data.expires_at)!==receipt.expiresAt*1000)
    throw new HttpError(403,"Phiên CRM đã kết thúc. Vui lòng xác thực lại.","CRM_MFA_REQUIRED");
  return {...account,crmReceipt:receipt};
}
