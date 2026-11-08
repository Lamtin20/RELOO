import {authCallbackOrigin} from '@/lib/auth/callback-origin';
import {loginLanding} from '@/lib/auth-navigation';
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authLink, safeNextPath } from "@/lib/auth-navigation";
import {
  findAccountProfile,
  needsProfileCompletion,
} from "@/lib/auth/identity";
import { ACCOUNT_ROLES } from "@/lib/auth/validation";

export async function GET(request) {
  const url = new URL(request.url),
    origin = authCallbackOrigin(request);
  const next = loginLanding(url.searchParams.get("next"));
  const intent = ACCOUNT_ROLES.includes(url.searchParams.get("intent"))
    ? url.searchParams.get("intent")
    : "both";
  function failure(code) {
    const target = new URL(authLink("/auth", next, intent), origin);
    target.searchParams.set("error", code);
    return NextResponse.redirect(target);
  }
  if (url.searchParams.has("error"))
    return failure(
      url.searchParams.get("error") === "access_denied"
        ? "oauth_cancelled"
        : "oauth_failed",
    );
  const client = await createSupabaseServerClient(),
    code = url.searchParams.get("code");
  if (!client || !code) return failure("oauth_expired");
  try {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return failure("oauth_expired");
    const { data, error: identityError } = await client.auth.getUser();
    if (identityError || !data.user) return failure("oauth_failed");
    if (next === "/auth/reset")
      return NextResponse.redirect(new URL(next, origin));
    const profile = await findAccountProfile(data.user);
    if (needsProfileCompletion(profile))
      return NextResponse.redirect(
        new URL(authLink("/auth/complete", next, intent), origin),
      );
    return NextResponse.redirect(new URL(next, origin));
  } catch {
    return failure("profile_unavailable");
  }
}
