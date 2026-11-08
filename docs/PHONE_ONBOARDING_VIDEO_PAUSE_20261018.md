# Phone onboarding and video pause — 18 October 2026

## Delivered source

- Remove the bottom-home "Cho thuê hoặc bán món đồ của bạn" card, Shorts home section, public header link, account/dashboard/CRM video links and publish-mode tabs. Shared Capacitor web content receives the same changes.
- Old `/shorts/*` pages redirect to Explore; old owner video pages redirect to the product composer. All `/api/shorts/*` (including streaming/upload/events) and `/api/crm/shorts` return 410. Encoded path segments are checked too. Existing media and records are retained, not destroyed.
- Worker no longer runs video review/transcode/package loops. Previously queued SHORT jobs finish with `PAUSED_BY_POLICY`, without processing media. Retain their payloads for deliberate requeue if video is re-enabled later.
- Registration first step: phone, password, repeated password, explicit terms/data-policy acceptance. Phone OTP verification precedes the personal profile. The provider issues the HttpOnly session; no browser token access or fabricated successful verification.
- Profile: name, date of birth, normalized province/ward, private contact street/address, optional house number, and self-declared HOUSE/APARTMENT/OTHER. The wording is "Bạn đang ở loại hình nhà ở nào?". No apartment number or resident verification is inferred or required.
- Login accepts email or Vietnamese mobile number. A legacy email account's phone is resolved only on the backend to the original Auth identity; its existing password is still verified by Auth. Never expose the resolved email or fabricate an email for phone-only accounts.
- Existing email and Google users remain supported. Incomplete users return to onboarding after signing in; completion returns to the original safe destination, otherwise Home. Existing complete profiles are not forced through new onboarding.

## Actual integration limit

Production Auth is Supabase GoTrue v2.196.0. Phone signup is not enabled and no SMS provider was configured when inspected. No SMS was sent and no paid service was purchased/enabled. Until a real SMS provider is supplied and configured, phone registration is explicitly unavailable; existing login/Google remain available. Do not label this as working real phone registration.

Production also had its email/password provider disabled. The private Auth stack's `ENABLE_EMAIL_SIGNUP` flag was enabled to restore password login, with `GOTRUE_MAILER_AUTOCONFIRM=false` preserved. A dedicated admin-provisioned TEST Auth identity signed in through the real BFF with HTTP 200 and HttpOnly cookies, then was deleted. This was a password-login test, not an email/SMS registration test. SMTP is still not configured; do not claim email confirmation/recovery delivery works. The new public registration screen uses phone only, with Google retained as an alternative.

The supported adapter uses `signUp({phone,password})`, `verifyOtp({phone,token,type:'sms'})` and `resend({type:'sms',phone})`. Configure the existing Auth service with `GOTRUE_EXTERNAL_PHONE_ENABLED=true`, `GOTRUE_SMS_AUTOCONFIRM=false` and the selected provider's official credentials/settings through the server's private environment. Do not put keys into source, browser, chat or public environment variables. Do not enable automatic phone confirmation to hide missing SMS. Then verify delivery, expiry, retry/caps, existing-number behavior and password recovery using dedicated test numbers before opening signup.

## Data and migration

`deploy/vietnam/phone-onboarding.sql` is additive: allow a missing email for a real phone identity, add the service-only atomic `reloo_finish_signup_profile` RPC. It checks the underlying Auth identity, requires a confirmed phone for phone-only profiles, saves onboarding details with screening/audit in one transaction and preserves existing completed profiles/restrictions. No fake email, new public DB privileges, price or activation policy. Phone OTP does not grant verified identity/resident badges or bypass risk/KYC checks.

Apply the SQL transaction, then `deploy/vietnam/security-lockdown.sql`; keep all public-schema access backend-only. Public listing/profile projections must not expose birthday, contact street or housing details. Existing self-service profile GET retains them in private `profile_data`.

## Verification

17 automated tests passed, including a real PGlite transaction test of the migration (phone-only/no-email storage, unverified identity rejection, retry, privilege revocation) and existing auth/security tests. Browser fixture evidence: `output/phone-onboarding/browser-release.txt`, screenshots in the same directory. Phone registration, wrong/correct OTP, profile persistence payload, redirects, password mismatch, disabled provider, phone login and no video entries were exercised with synthetic API/session responses. Profile widths 320/390/768/1440 had no overflow. These do not prove SMS delivery or real customer registration. No real customer was created, messaged or charged. Build/release and live checks are recorded separately under `output/phone-onboarding/`.

## Rollout / rollback

Use encrypted source/DB backups, isolated production build, migration dry run, app/worker health checks and exact K3s renderer build comparison. On failure restore prior app/worker images and source; never restore the DB over ongoing writes. The additive migration may remain with the previous app. Do not reinstate email NOT NULL once phone-only rows exist. Re-enable video only deliberately; restore entry points/worker behavior and requeue retained paused jobs after review. No stored media is deleted by this release.
