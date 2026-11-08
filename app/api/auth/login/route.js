import {loginIdentifier,resolveLoginCredential} from '@/lib/auth/phone-credentials';
import {securityDb} from '@/lib/security/service';
import {federationClientConfigured} from '@/lib/auth/federation-policy';
import {federationOrigin} from '@/lib/auth/federation-identity';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAuthReady } from "@/lib/auth/capabilities";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    if(federationClientConfigured(federationOrigin(request)))throw new HttpError(409,'Tiếp tục đăng nhập tại CRM trung tâm.','CENTRAL_IDENTITY_REQUIRED');
    rateLimit(request, "login", 12);
    const body=await readJson(request),password=body.password;const identity=loginIdentifier(body.identifier??body.email);
    if (
      typeof password !== "string" ||
      password.length > 128
    )
      throw new HttpError(400, "Thông tin đăng nhập hoặc mật khẩu không hợp lệ.");
    await assertAuthReady();
    const client = await createSupabaseServerClient();
    if (!client) throw new HttpError(503, "Đăng nhập chưa được cấu hình.");
    const { error } = await client.auth.signInWithPassword({
      ...await resolveLoginCredential(identity,securityDb()),
      password,
    });
    if (error?.status >= 500 || error?.name === "AuthRetryableFetchError")
      throw new HttpError(
        503,
        "Dịch vụ đăng nhập đang tạm gián đoạn. Vui lòng thử lại sau.",
        "AUTH_SERVICE_UNAVAILABLE",
      );
    if (error)
      throw new HttpError(
        401,
        "Thông tin đăng nhập hoặc mật khẩu chưa đúng, hoặc tài khoản chưa được xác nhận.",
        "LOGIN_FAILED",
      );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
