import { authenticatedIdentity } from "@/lib/auth/identity";
import { securityDb } from "@/lib/security/service";
import { encryptPrivate } from "@/lib/operations/crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";
import { supabaseServerFetch } from "@/lib/supabase/fetch";
import {cookies} from 'next/headers';
import {authCookieOptions} from '@/lib/auth/cookie-options';
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    const { authUser,client } = await authenticatedIdentity(request),
      input = await readJson(request);
    if (!/^[a-f0-9-]{36}$/i.test(input.flow || ""))
      throw new HttpError(400, "Phiên ứng dụng không hợp lệ.");
    if (!authUser.email_confirmed_at&&!authUser.phone_confirmed_at)
      throw new HttpError(401, "Cần đăng nhập trước khi trở về ứng dụng.");
    const db = securityDb(),
      flow = await db
        .from("mobile_auth_flows")
        .select("id,expected_user_id")
        .eq("id", input.flow)
        .is("consumed_at", null)
        .is("session_encrypted", null)
        .gt("expires_at", new Date().toISOString())
        .single();
    if (flow.error)
      throw new HttpError(
        409,
        "Phiên đã hết hạn. Hãy bắt đầu lại từ ứng dụng.",
      );
    if(flow.data.expected_user_id&&flow.data.expected_user_id!==authUser.id)throw new HttpError(409,'Trình duyệt đang dùng tài khoản khác. Hãy đăng nhập đúng tài khoản trong app.');
    let appSession,transfer=false;
    if(authUser.email&&authUser.email_confirmed_at){
    const generated = await db.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.email,
    });
    if (
      generated.error ||
      generated.data.user?.id !== authUser.id ||
      !generated.data.properties?.hashed_token
    )
      throw new HttpError(503, "Chưa tạo được phiên riêng cho ứng dụng.");
    const isolated = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: { fetch: supabaseServerFetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await isolated.auth.verifyOtp({
      token_hash: generated.data.properties.hashed_token,
      type: "magiclink",
    });
    if (error || !data.session || data.user?.id !== authUser.id)
      throw new HttpError(503, "Chưa tạo được phiên riêng cho ứng dụng.");
    appSession=data.session;
    }else{
      const current=await client.auth.getSession();if(current.error||current.data.session?.user.id!==authUser.id)throw new HttpError(401,'Phiên đăng nhập đã hết hạn.');
      appSession=current.data.session;transfer=true;
    }
    const result = await db.rpc("reloo_complete_mobile_auth", {
      p_id: input.flow,
      p_session: encryptPrivate(
        JSON.stringify({
          access_token: appSession.access_token,
          refresh_token: appSession.refresh_token,
        }),
      ),
    });
    if (result.error)
      throw new HttpError(
        409,
        "Phiên đã hết hạn. Hãy đăng nhập lại từ ứng dụng.",
      );
    if(transfer){const jar=await cookies();for(const entry of jar.getAll())if(/^sb-[a-zA-Z0-9_-]+-auth-token(?:\.\d+)?$/.test(entry.name))jar.set(entry.name,'',{...authCookieOptions(),maxAge:0});}
    return Response.json(
      { ok: true, url: "reloo://auth?flow=" + input.flow },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
