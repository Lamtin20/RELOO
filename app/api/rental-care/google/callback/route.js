import { NextResponse } from "next/server";
import { securityDb } from "@/lib/security/service";
import {
  privateHash,
  encryptPrivate,
  decryptPrivate,
} from "@/lib/operations/crypto";
import { oauthConfig, careEnabled } from "@/lib/rental-care/server";
import { CALENDAR_SCOPES } from "@/lib/rental-care/calendar";
import { requireAccount } from "@/lib/security/authorization";
export async function GET(request) {
  let native = false,
    origin = process.env.APP_ORIGIN || "https://reloo.vn";
  try {
    if (!careEnabled()) throw Error("DISABLED");
    const config = oauthConfig();
    origin = config.origin;
    const u = new URL(request.url),
      state = u.searchParams.get("state"),
      code = u.searchParams.get("code");
    if (
      !state ||
      state.length > 200 ||
      !code ||
      code.length > 8000 ||
      u.searchParams.has("error")
    )
      throw Error("OAUTH_INVALID");
    const db = securityDb(),
      hash = privateHash("calendar-oauth", state),
      found = await db
        .from("rc_oauth_states")
        .select("*")
        .eq("state_hash", hash)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
    if (found.error || !found.data) throw Error("OAUTH_INVALID");
    const pending = found.data,
      payload = JSON.parse(decryptPrivate(pending.payload_encrypted));
    const authenticated = await requireAccount(request, { active: false });
    if (authenticated.profile.id !== pending.profile_id)
      throw Error("OAUTH_ACCOUNT_MISMATCH");
    native = payload.native === true;
    if (payload.redirect !== config.redirect) throw Error("OAUTH_INVALID");
    const consumed = await db
      .from("rc_oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("state_hash", hash)
      .is("consumed_at", null)
      .select("state_hash");
    if (consumed.error || consumed.data?.length !== 1)
      throw Error("OAUTH_INVALID");
    const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirect,
          code,
          code_verifier: payload.verifier,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      }),
      tokens = await r.json();
    if (
      !r.ok ||
      !tokens.access_token ||
      CALENDAR_SCOPES.filter((s) =>
        s.startsWith("https://www.googleapis.com/auth/calendar"),
      ).some((s) => !String(tokens.scope).split(" ").includes(s))
    )
      throw Error("OAUTH_SCOPE");
    const identity = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: "Bearer " + tokens.access_token },
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        },
      ),
      google = await identity.json();
    if (
      !identity.ok ||
      google.email_verified !== true ||
      typeof google.email !== "string" ||
      !google.sub
    )
      throw Error("OAUTH_IDENTITY");
    const previous = await db
      .from("rc_connections")
      .select("id,credentials_encrypted")
      .eq("profile_id", pending.profile_id)
      .eq("provider", "GOOGLE")
      .eq("google_subject", google.sub)
      .order("created_at", { ascending: false })
      .limit(1);
    if (previous.error) throw Error("STORAGE_UNAVAILABLE");
    const prior = previous.data?.[0],
      refresh =
        tokens.refresh_token ||
        (prior?.credentials_encrypted
          ? JSON.parse(decryptPrivate(prior.credentials_encrypted))
              .refresh_token
          : null);
    if (!refresh) throw Error("OAUTH_OFFLINE_REQUIRED");
    const data = {
      profile_id: pending.profile_id,
      provider: "GOOGLE",
      email: google.email.toLowerCase(),
      google_subject: google.sub,
      status: "PENDING",
      last_error: null,
      credentials_encrypted: encryptPrivate(
        JSON.stringify({ refresh_token: refresh }),
      ),
      updated_at: new Date().toISOString(),
    };
    const saved = prior
      ? await db
          .from("rc_connections")
          .update(data)
          .eq("id", prior.id)
          .select("id")
          .single()
      : await db.from("rc_connections").insert(data).select("id").single();
    if (saved.error) throw Error("STORAGE_UNAVAILABLE");
    return NextResponse.redirect(
      native
        ? "reloo://calendar"
        : origin +
            "/account/calendar?calendar=pending" +
            (payload.returnToApp ? "&native_setup=1" : ""),
      303,
    );
  } catch {
    return NextResponse.redirect(
      native
        ? "reloo://calendar?status=failed"
        : new URL("/account/calendar?calendar=failed", origin),
      303,
    );
  }
}
