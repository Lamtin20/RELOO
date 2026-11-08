# Registration, phone validation and Google sign-in

## Android sign-in inside the app

Android uses Google Credential Manager (`RelooGoogle`), with the button flow `GetSignInWithGoogleOption`. Google account selection stays in the native Android interface; the Reloo login, registration and profile completion forms remain in the app. The browser PKCE bridge remains available for iOS until its native Google SDK and signing setup are configured.

The Android OAuth client `RELOO Android Test` belongs to the existing RELOO Auth project, uses package `vn.reloo.app` and the local debug signing certificate SHA-1 `9C:ED:13:FB:69:7D:36:E8:9F:67:23:71:CB:10:67:40:A9:1B:E2:A1`. Store builds need an additional Android client for the actual release/Play signing certificate. Set the existing Web OAuth client ID as `RELOO_GOOGLE_WEB_CLIENT_ID` on the app server; never bundle its secret.

`POST /api/auth/google/native` prepares a five-minute nonce. The raw nonce and flow ID are encrypted in an HttpOnly cookie; only its SHA-256 challenge goes to Google. Completion atomically consumes an unused `mobile_auth_flows` row, verifies the Google ID token and nonce through Supabase Auth, then creates the normal cookie session. Profile lookup uses the verified Auth user ID. New accounts still complete their phone/consent details and pass the existing verification gates. Tokens are not returned in URLs or persisted by the app's Google plugin. Signing out clears the app's Credential Manager state.

References: https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation and https://supabase.com/docs/guides/auth/social-login/auth-google .

Verified on 2026-10-12 (Asia/Saigon), Samsung SM-N950N / Android 9, APK `1.0.1-beta.20261012.0558`: the real Google account chooser runs as `com.google.android.gms/.auth.api.credentials.assistedsignin.ui.GoogleSignInActivity`; an existing Google account signs in successfully and returns to `/account` inside the app. The existing account is preserved. Registration opens the same native chooser and cancellation returns to the app with the button enabled. New-user profile completion was additionally checked with isolated browser mocks; no new real customer account was created for this test. Requests without the bound nonce return HTTP 401.

Current hosting update: authentication now runs on the Vietnam homelab at `https://auth.reloo.vn`. Google callback `https://auth.reloo.vn/auth/v1/callback` was added and a real login/session verified. The chooser now displays `reloo.vn`. Email signup is disabled while the operator uses Google first without SMTP. See [current operations](OPERATIONS_VIETNAM.md); the managed-project restoration notes below are migration history.

## Status checked on 2026-10-10

The Supabase project `fdskbdcuwuabmtzytopq` had been paused. This explained the NXDOMAIN/ENOTFOUND errors and account-service outage. The project was resumed through its dashboard on 2026-10-09 without changing the subscription. Its Auth settings endpoint now returns HTTP 200 and the configured URL/keys can access the account tables.

A separate Google Cloud project `reloo-auth` was created for RELOO, with a Web OAuth client named `RELOO Web`. Its Client ID and Client Secret were saved directly in Supabase's Google provider, which is now enabled. They are not included in this repository or documentation. The unrelated Gokey project's branding was not modified.

Authorized Google origins are `http://localhost:3000` and `https://reloo.vn`; Google's callback is `https://fdskbdcuwuabmtzytopq.supabase.co/auth/v1/callback`. After the homelab deployment, Supabase's Site URL was changed to `https://reloo.vn`. The redirect allowlist has four separate entries: the exact local/production `/auth/callback` URLs and their query-string patterns. A malformed concatenated entry was removed. The Google app remains in **Testing**, with the owner's account added as a test user; public rollout is a separate step.

The security, auth-onboarding and market-data migrations were first validated in a rollback transaction, then applied to the existing project. The original two schema migrations were not blindly replayed. `node scripts/apply-feature-migration.mjs --check` performs a rollback-only validation and migration writes use a transaction lock.

On 2026-10-10 (Asia/Saigon), the public website's Google button, genuine Google account selection, Supabase callback and production session were verified with the existing test account. `/api/auth/session` returned HTTP 200, `signedIn=true` and a completed profile. Its activation status remains `PENDING`, and the website sends it to `/safety`; signing in does not bypass phone/evidence verification or grant posting privileges.

The application distinguishes input errors from Auth/storage outages. Storage checks use a bounded GET instead of HEAD: the upstream HEAD response did not reliably report missing tables. Do not bypass the backend identity gate or report a failed phone-source lookup as NO_MATCH.

## Phone and password policy

Vietnamese mobile numbers are parsed with `libphonenumber-js`, including prefix/type validation. Domestic `0...`, international `+84...`, and equivalent supported international formats normalize to the same 10-digit number. Landlines, invalid mobile prefixes, extensions and other countries are rejected for account phone numbers. This format check is distinct from proving ownership or checking fraud evidence.

New passwords and password changes require at least **8 characters**, one uppercase letter, one ASCII digit and one non-letter/non-digit/non-whitespace special character; maximum length is 128. Signup/reset UI and backend share the same validator. Existing login credentials are checked by Supabase, rather than rejected solely because they were created under an older policy.

## Restore account services

1. In Supabase Dashboard, open the actual RELOO project and check it is running. Copy its Project URL and public anon/publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Store the service-role/secret key only in `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`.
2. Set the database connection for this same project; the old project reference must not be reused. The values belong in `.env.local` for local development or `.env.production` on the production machine. Restart/rebuild after changing public values; they are inlined into the browser bundle.
3. Apply the two original schema migrations only to a fresh database, then run `node scripts/apply-feature-migration.mjs --check` and `node scripts/apply-feature-migration.mjs`. It applies the security/commerce, `20261009090000_auth_onboarding.sql` and `20261009120000_market_data.sql` migrations transactionally, tracking each separately. The existing project has already received these feature migrations.
4. Run `node scripts/diagnose-auth.mjs`. It prints availability, public project metadata and table/provider status, never credentials.
5. In Supabase Authentication settings, set password minimum length to **8**. RELOO's signup/password endpoints additionally require uppercase, numbers and a special character. Supabase's built-in strongest character option also requires lowercase and has a specific symbol list; reconcile any stricter provider setting with the form before enabling it. Configure confirmation email delivery and the redirect allowlist.

When sources cannot be checked, registration can create an auditable PENDING account if the Auth/profile/audit database is ready. A MATCH yields a restricted account and case. Failed core storage/Auth does not yield successful registration. Profile creation, screening, case and audit are written in one database transaction after Auth returns the genuine user id. If Auth succeeds but profile provisioning fails, the signed-in user can return to `/auth/complete` to retry; existing completed profiles and their restrictions are preserved.

## Google provider

Google OAuth is handled by **Supabase Auth with PKCE**. Do not put Google client secrets in the browser bundle or use a fabricated Google identity.

1. Create a **Web application** OAuth client in Google Auth Platform / Google Cloud.
2. Add JavaScript origins `http://localhost:3000` for local development and `https://reloo.vn` for production.
3. Add the actual Supabase project's callback as an authorized redirect URI:

```text
https://<actual-project-ref>.supabase.co/auth/v1/callback
```

This is Google's redirect to Supabase, not the application's `/auth/callback` route. Use the exact callback shown on Supabase's Google provider page when using a custom Auth domain.

4. In Supabase Authentication → Sign In / Providers → Google, enable Google and store the OAuth Client ID and Client Secret there.
5. Configure scopes `openid`, email and profile according to Supabase's provider guide. Configure the Google consent audience and test users if the client is still in testing.
6. In Supabase's redirect allowlist, permit the local and production callback URLs, including their query strings. Add each exact callback URL and a query-only pattern, for example `http://localhost:3000/auth/callback\?**` and `https://reloo.vn/auth/callback\?**`. The backslash makes the question mark literal in Supabase's glob syntax; this permits the callback's `next`/`intent` parameters without allowing unrelated paths before the query string.
7. Set `APP_ORIGIN` to the origin for the current environment. Leave it unset for local development to use the request origin, or set it to `http://localhost:3000`; use `https://reloo.vn` on production.

The Google button calls `POST /api/auth/google`, which checks the real provider settings, stores the PKCE verifier through Supabase SSR cookies, and returns the genuine provider authorization URL. The callback exchanges the code, verifies the user through `getUser()`, and finds the profile by **auth user id**. It never associates an existing profile solely by a submitted email or grants a role from OAuth metadata.

New Google users go to `/auth/complete` to provide their mobile number, name, intent and consent. This uses the same phone-screening and backend activation gate as password registration. Existing completed accounts continue to their requested local destination. Google cancellation/expired codes show controlled errors; arbitrary provider descriptions are not reflected into the UI. Password recovery uses the same callback and can continue to `/auth/reset` without being diverted into onboarding.

Official references:

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/redirect-urls

## Verification

```powershell
node --test tests/auth-storage.test.mjs tests/auth-validation.test.mjs tests/auth-navigation.test.mjs tests/features.test.mjs
node scripts/verify-feature-schema.mjs
node scripts/diagnose-auth.mjs
npm run build
```

Local tests verify validators, account/profile transaction rollback, PENDING restrictions, duplicate onboarding, role protection and immutable audit. Browser tests use explicitly isolated fixtures where the upstream project is unavailable; they do not prove a live Google login or email delivery. Live verification requires the project's real provider settings and credentials.
