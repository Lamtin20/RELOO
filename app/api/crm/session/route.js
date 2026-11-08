import { requirePermission } from "@/lib/operations/permissions";
import { errorResponse } from "@/lib/server/http";
export async function GET(request) {
  try { const { profile, staff,crmReceipt,authUser } = await requirePermission(request, "crm.read"); return Response.json({ ok: true, user: { id: profile.id, name: profile.name,email:profile.email,activationStatus:profile.activation_status,emailVerified:!!authUser?.email_confirmed_at }, staff,expiresAt:crmReceipt.expiresAt*1000 }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}
