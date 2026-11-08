import { securityDb } from "@/lib/security/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptPrivate } from "@/lib/operations/crypto";
import { mobileVerifierHash } from "@/lib/mobile/validation";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "native-auth-exchange", 15);
    const input = await readJson(request);
    if (!/^[a-f0-9-]{36}$/i.test(input.flow || ""))
      throw new HttpError(400, "Phiên ứng dụng không hợp lệ.");
    let challenge;
    try {
      challenge = mobileVerifierHash(input.verifier);
    } catch {
      throw new HttpError(400, "Phiên ứng dụng không hợp lệ.");
    }
    const result = await securityDb().rpc("reloo_consume_mobile_auth", {
      p_id: input.flow,
      p_challenge: challenge,
    });
    if (result.error)
      throw new HttpError(409, "Phiên đã hết hạn hoặc đã sử dụng.");
    const session = JSON.parse(decryptPrivate(result.data.session)),
      client = await createSupabaseServerClient();
    const { error } = await client.auth.setSession(session);
    if (error)
      throw new HttpError(401, "Chưa khôi phục được đăng nhập. Hãy thử lại.");
    return Response.json(
      { ok: true, next: result.data.next },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
