import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertOrigin, errorResponse, HttpError } from "@/lib/server/http";
import {cookies} from 'next/headers';
import {revokeFederation} from '@/lib/auth/federation-identity';
import {FEDERATION_COOKIE} from '@/lib/auth/federation-policy';
import {MANAGEMENT_COOKIE} from '@/lib/auth/management-bridge';
import {CRM_COOKIE} from '@/lib/operations/crm-session';
export async function POST(request) {
  try {
    assertOrigin(request);
    await revokeFederation(request);
    const client = await createSupabaseServerClient();
    const result = await client?.auth.signOut();
    if (result?.error)
      throw new HttpError(503, "Chưa đăng xuất được. Vui lòng thử lại.");
    const jar=await cookies();for(const name of [FEDERATION_COOKIE,MANAGEMENT_COOKIE,CRM_COOKIE])jar.set(name,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
