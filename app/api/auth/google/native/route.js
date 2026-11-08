import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAuthReady } from "@/lib/auth/capabilities";
import { findAccountProfile, needsProfileCompletion } from "@/lib/auth/identity";
import { authLink } from "@/lib/auth-navigation";
import { mobileNext } from "@/lib/mobile/validation";
import { securityDb } from "@/lib/security/service";
import { GOOGLE_NONCE_COOKIE, createGoogleNonce, readGoogleNonce, validGoogleIdToken } from "@/lib/auth/native-google";
import { assertOrigin, errorResponse, HttpError, readJson, rateLimit } from "@/lib/server/http";

export async function POST(request) {
  try {
    assertOrigin(request);
    const input = await readJson(request, 16000);
    if (!["prepare", "complete"].includes(input.action)) throw new HttpError(400,"Yêu cầu đăng nhập không hợp lệ.");
    rateLimit(request, "native-google-" + input.action, 10);
    await assertAuthReady({ google: true });
    const store = await cookies();
    const options = { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/api/auth/google/native", maxAge: 300 };
    if (input.action === "prepare") {
      const clientId = process.env.RELOO_GOOGLE_WEB_CLIENT_ID;
      if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId || "")) throw new HttpError(503,"Đăng nhập Google trong ứng dụng chưa sẵn sàng.");
      const flow = crypto.randomUUID();
      const nonce = createGoogleNonce(flow);
      const { error } = await securityDb().from("mobile_auth_flows").insert({id:flow,challenge:nonce.challenge,next_path:mobileNext(input.next),intent:["both","renter","lender"].includes(input.intent)?input.intent:"both"});
      if (error) throw error;
      store.set(GOOGLE_NONCE_COOKIE,nonce.cookie,options);
      return Response.json({ok:true,clientId,nonce:nonce.challenge},{headers:{"Cache-Control":"no-store"}});
    }
    if (!validGoogleIdToken(input.idToken)) throw new HttpError(400,"Thông tin đăng nhập Google không hợp lệ.");
    let nonce;
    try { nonce = readGoogleNonce(store.get(GOOGLE_NONCE_COOKIE)?.value); }
    catch { throw new HttpError(401,"Phiên Google đã hết hạn. Vui lòng thử lại.","GOOGLE_NONCE_INVALID"); }
    store.set(GOOGLE_NONCE_COOKIE,"",{...options,maxAge:0});
    // Consume atomically before token exchange, including on failed attempts.
    const { data: flow, error: flowError } = await securityDb().from("mobile_auth_flows")
      .update({consumed_at:new Date().toISOString()}).eq("id",nonce.flow).eq("challenge",nonce.challenge)
      .is("consumed_at",null).is("session_encrypted",null).gt("expires_at",new Date().toISOString())
      .select("next_path,intent").maybeSingle();
    if (flowError) throw flowError;
    if (!flow) throw new HttpError(401,"Phiên Google đã được sử dụng hoặc đã hết hạn.","GOOGLE_NONCE_INVALID");
    const client = await createSupabaseServerClient();
    if (!client) throw new HttpError(503,"Dịch vụ tài khoản chưa sẵn sàng.");
    const { error } = await client.auth.signInWithIdToken({provider:"google",token:input.idToken,nonce:nonce.nonce});
    if (error) throw new HttpError(401,"Chưa xác nhận được tài khoản Google. Vui lòng thử lại.","GOOGLE_TOKEN_INVALID");
    const { data, error: identityError } = await client.auth.getUser();
    if (identityError || !data.user) throw new HttpError(401,"Chưa xác nhận được phiên đăng nhập.");
    const profile = await findAccountProfile(data.user);
    const next = needsProfileCompletion(profile) ? authLink("/auth/complete",mobileNext(flow.next_path),flow.intent) : mobileNext(flow.next_path);
    return Response.json({ok:true,next},{headers:{"Cache-Control":"private,no-store"}});
  } catch (error) { return errorResponse(error); }
}
