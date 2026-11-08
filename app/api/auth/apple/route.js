import {authCallbackOrigin} from '@/lib/auth/callback-origin';
﻿import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAuthReady } from "@/lib/auth/capabilities";
import { safeNextPath } from "@/lib/auth-navigation";
import { ACCOUNT_ROLES } from "@/lib/auth/validation";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readJson,
} from "@/lib/server/http";
import { getSupabaseUrl } from "@/lib/supabase/env";

export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "apple-signin", 10);
    const input = await readJson(request);
    const next = safeNextPath(input.next),
      intent = ACCOUNT_ROLES.includes(input.intent) ? input.intent : "both";
    await assertAuthReady({ apple: true });
    const client = await createSupabaseServerClient();
    if (!client)
      throw new HttpError(503, "Đăng nhập Apple chưa được cấu hình.");
    const callback = new URL(
      "/auth/callback",
      authCallbackOrigin(request),
    );
    callback.searchParams.set("next", next);
    callback.searchParams.set("intent", intent);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: callback.href,
        skipBrowserRedirect: true,
        scopes: "name email",
      },
    });
    if (error || !data.url)
      throw new HttpError(
        502,
        "Chưa tạo được phiên đăng nhập Apple.",
        "APPLE_START_FAILED",
      );
    const target = new URL(data.url),
      auth = new URL(getSupabaseUrl());
    if (
      target.origin !== auth.origin ||
      !target.pathname.endsWith("/auth/v1/authorize")
    )
      throw new HttpError(502, "Liên kết đăng nhập chưa được xác nhận.");
    return Response.json(
      { ok: true, url: target.href },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

