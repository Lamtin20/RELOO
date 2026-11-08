import { requirePermission } from "@/lib/operations/permissions";
import { crmAllowed,CRM_PERMISSIONS,CRM_PERMISSION_GROUPS,CRM_ROLE_LABELS } from "@/lib/operations/access";
import { errorResponse } from "@/lib/server/http";
export async function GET(request){try{
  const {db,staff,profile}=await requirePermission(request,"roles.read");
  const r=await db.from("crm_staff").select("profile_id,role,permissions,enabled,profiles!crm_staff_profile_id_fkey(name,email)").order("created_at");
  if(r.error)throw Error("STAFF_READ_UNAVAILABLE");
  return Response.json({ok:true,staff:r.data,currentProfileId:profile.id,canManage:crmAllowed(staff,"roles.write"),roles:CRM_ROLE_LABELS,permissions:CRM_PERMISSIONS,groups:CRM_PERMISSION_GROUPS},{headers:{"Cache-Control":"private,no-store"}});
}catch(e){return errorResponse(e);}}
