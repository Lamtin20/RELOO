import { createSupabaseServerClient } from "@/lib/supabase/server";
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
    rateLimit(request, "password-recovery", 5);
    const { email } = await readJson(request);
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      throw new HttpError(400, "Email chưa hợp lệ.");
    const client = await createSupabaseServerClient();
    if (!client)
      throw new HttpError(503, "Khôi phục tài khoản chưa được cấu hình.");
    const origin = process.env.APP_ORIGIN || new URL(request.url).origin;
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback?next=%2Fauth%2Freset`,
    });
    if (error && error.code !== "user_not_found")
      throw new HttpError(
        503,
        "Dịch vụ email đang chưa sẵn sàng. Vui lòng thử lại sau.",
      );
    return Response.json(
      {
        ok: true,
        message: "Nếu email có tài khoản, liên kết khôi phục sẽ được gửi.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
