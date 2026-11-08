import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/password-policy";
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
    rateLimit(request, "password-update", 5);
    const client = await createSupabaseServerClient();
    if (!client) throw new HttpError(503, "Tài khoản chưa được cấu hình.");
    const { data, error: authError } = await client.auth.getUser();
    if (authError || !data.user)
      throw new HttpError(
        401,
        "Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.",
      );
    const verified=await client.auth.getClaims();
    const claims=verified.data?.claims;
    const recovered=!verified.error&&claims?.sub===data.user.id&&claims.amr?.some(item=>item.method==='recovery'&&Number.isFinite(item.timestamp)&&Date.now()-item.timestamp*1000>=0&&Date.now()-item.timestamp*1000<900000);
    if(!recovered)throw new HttpError(403,'Hãy yêu cầu liên kết khôi phục mới hoặc đổi mật khẩu tại Đăng nhập & Bảo mật.','RECOVERY_REQUIRED');
    const { password } = await readJson(request);
    const passwordError = validatePassword(password);
    if (passwordError)
      throw new HttpError(400, passwordError, "INVALID_PASSWORD");
    const { error } = await client.auth.updateUser({ password });
    if (error)
      throw new HttpError(
        400,
        "Chưa đổi được mật khẩu. Thử mật khẩu mới hoặc yêu cầu liên kết khôi phục khác.",
      );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
