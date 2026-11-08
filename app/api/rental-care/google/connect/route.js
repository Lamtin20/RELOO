import { randomBytes, createHash } from "node:crypto";
import {
  careEnabled,
  careAccount,
  bodyFor,
  careError,
  oauthConfig,
  safeResponse,
} from "@/lib/rental-care/server";
import { encryptPrivate, privateHash } from "@/lib/operations/crypto";
import { CALENDAR_SCOPES } from "@/lib/rental-care/calendar";
export async function POST(request) {
  try {
    if (!careEnabled()) throw Error("CALENDAR_NOT_CONFIGURED");
    const account = await careAccount(request),
      b = await bodyFor(request, account),
      config = oauthConfig();
    const state = randomBytes(32).toString("base64url"),
      verifier = randomBytes(48).toString("base64url");
    const result = await account.db.from("rc_oauth_states").insert({
      state_hash: privateHash("calendar-oauth", state),
      profile_id: account.profile.id,
      payload_encrypted: encryptPrivate(
        JSON.stringify({
          verifier,
          redirect: config.redirect,
          native: b.native === true,
          returnToApp: b.returnToApp === true,
        }),
      ),
      expires_at: new Date(Date.now() + 600000).toISOString(),
    });
    if (result.error) throw Error("STORAGE_UNAVAILABLE");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirect,
      response_type: "code",
      scope: CALENDAR_SCOPES.join(" "),
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent select_account",
      ...(account.authUser.email_confirmed_at
        ? { login_hint: account.authUser.email }
        : {}),
    }).toString();
    return safeResponse({ url: url.href });
  } catch (e) {
    return careError(e);
  }
}
