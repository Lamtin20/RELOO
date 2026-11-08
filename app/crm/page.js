import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "@/lib/operations/crm-auth";
import { crmViews, crmNext } from "@/lib/operations/access";
import CrmWorkspace from "@/components/owner/CrmWorkspace";
export default async function CrmPage({searchParams}) {
  const params=await searchParams;
  const next=crmNext("/crm"+(typeof params.view==="string"?"?view="+encodeURIComponent(params.view):""));
  const requestHeaders=await headers();
  if(process.env.NODE_ENV==="production" && ["reloo.vn","www.reloo.vn"].includes(requestHeaders.get("host")?.toLowerCase().split(":")[0]))redirect("https://crm.reloo.vn"+next);
  let account;
  try {account=await requireCrmAccess(new Request("https://crm.reloo.vn/crm",{headers:requestHeaders}));}
  catch(e){
    if(e.status===401 || ["CRM_MFA_REQUIRED","CRM_ACCESS_DENIED","PROFILE_REQUIRED","ACCOUNT_DELETED"].includes(e.code))redirect("/crm/login?next="+encodeURIComponent(next));
    return <main className="crm-login-screen"><section className="crm-login-card"><h1>Chưa xác nhận được quyền truy cập</h1><p>Dịch vụ đang tạm gián đoạn. Vui lòng thử lại.</p><a className="btn btn-primary" href={next}>Thử lại</a></section></main>;
  }
  const views=crmViews(account.staff),requested=new URL(next,"https://crm.reloo.vn").searchParams.get("view");
  return <CrmWorkspace initialSession={{ok:true,user:{id:account.profile.id,name:account.profile.name,email:account.profile.email,activationStatus:account.profile.activation_status,emailVerified:!!account.authUser?.email_confirmed_at},staff:account.staff,expiresAt:account.crmReceipt.expiresAt*1000}}
    initialView={views.includes(requested)?requested:views[0]}/>;
}
