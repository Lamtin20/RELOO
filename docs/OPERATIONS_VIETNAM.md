# RELOO Operations and Vietnam Hosting

Updated 2026-10-10, Asia/Saigon.

Infrastructure addendum 2026-10-17: K3s/containerd now manages two stateless web renderers with a CPU HPA limit of three on the same Vietnam host. API mutations, media uploads, Socket.io, database/Auth and workers retain the existing Docker backend. A private bridge, immutable static archive, graceful edge fallback and encrypted cluster backups are installed. This is not multi-host HA. Source, measured validation and operating commands: `docs/KUBERNETES_OPERATIONS.md`.

## Hosting and Data

The operator confirmed that RELOO-HOMELAB-01 is physically in Vietnam. Application data and authentication now run in a separate self-hosted Supabase stack at `/srv/reloo/apps/vietnam`, compose project `reloo-vn`, with persistent local Postgres and storage directories. Existing homelab PostgreSQL 16, Redis, MinIO and monitoring were preserved.

The original 44 public tables were copied and reconciled with no count differences. The migration preserved 8 profiles, 13 assets, 7 legacy transactions and the existing Google identity ID. The source had no storage objects. Private backups are under `/srv/reloo/backups/vietnam`.

The old managed project `fdskbdcuwuabmtzytopq` still contains the original copy until its requested deletion is explicitly confirmed and performed. Migration alone does not erase it. Google and Cloudflare continue to process information required for their services; this is not a claim that every third-party interaction occurs in Vietnam.

Backend database and Auth requests use `SUPABASE_INTERNAL_URL` on the private Docker network. The public client endpoint is `https://auth.reloo.vn`. No database/storage/admin ports were newly published to the Internet. API and browser lookup services do not log raw request queries.

## Domains and Authentication

- Main application: `https://reloo.vn`; www redirects to the apex and HTTP redirects to HTTPS.
- Authentication gateway: `https://auth.reloo.vn`, with Google callback `/auth/v1/callback`.
- CRM: `https://crm.reloo.vn`, with `/crm` available on the same hostname.

The genuine Google account-selection screen was verified to display **reloo.vn**. The existing owner's callback and real server session were verified after migration. On 2026-10-10 the owner's customer profile became ACTIVE after a fresh real lookup under the operator's `CLD_NOT_FOUND_V1` policy; its prior UNAVAILABLE case was cleared with source evidence and audit. CRM ownership remains a separate staff permission. Google OAuth remains in Testing unless separately published in Google Cloud.

The operator chose Google first because no SMTP credentials are available. Email signup is disabled rather than claiming a confirmation email was sent. Supply SMTP before enabling email signup/recovery. Application password endpoints retain the 8-character, uppercase, digit and special-character rules.

Refresh tokens remain persisted and are renewed through Supabase SSR/browser clients. A temporary service/network failure does not clear the current UI identity. Explicit logout revokes the current session. Invalid/revoked credentials and the one-time change of authentication system can require signing in again; an unconditional promise to accept expired/revoked sessions would bypass authentication.

The authentication gateway owns CORS headers: it removes upstream duplicates and returns one allowed RELOO/development origin with `Vary: Origin`. This fixes browser refresh-token failures caused by a combined `*, https://reloo.vn` header. Unknown origins receive no access-control allow-origin header.

## Risk and Profiles

`/dashboard/profile` persists name, address and bio through the backend. PHONE, ZALO, EMAIL and BANK identifiers are normalized, encrypted and queued for screening. Bank hashes include the declared bank code. National ID is handled through the separate KYC workflow.

The lookup transport opens the genuine public CheckScam/ChongLuaDao pages in a dedicated browser container. It is explicitly a **public website lookup**, not a licensed external API. It does not solve CAPTCHA, impersonate a provider, or treat a failed request as a negative result. The browser has no database credential, encryption key or evidence volume.

CheckScam returned HTTP 403 during verification. A ChongLuaDao footer mentioning reCAPTCHA is not itself an access challenge. Phone/provider cards and IP anonymity fields are parsed only when the returned page corresponds to the requested input. Website changes, unavailable sources and insufficient results remain explicit.

`/safety` now distinguishes refreshing stored status from requesting a new phone lookup. The latter queues a real worker job, polls its status and shows the previous result and timestamp while it runs. The database deduplicates concurrent requests and applies a 15-minute cooldown, including jobs that finished with UNAVAILABLE. Reusing an existing profile identifier also requests a retry rather than silently returning the old row. Deploy `deploy/vietnam/screening-retry.sql` before the updated application.

HTTP 403 is an upstream access block, not a clean screening result. The user and authorized CRM reviewer can open the exact public search for manual comparison. Activation under `CLD_NOT_FOUND_V1` records the real accepted ChongLuaDao result and the real blocked CheckScam result together, with evidence and audit; it does not relabel CheckScam as negative. Deploy `deploy/vietnam/phone-clearance.sql` before the updated worker. Accepted phone clearance expires after 24 hours; the worker queues refreshes for active accounts before expiration.

- MATCH requires evidence, restricts backend operations and creates/updates a RiskCase plus a REVIEW blacklist entry.
- NO_MATCH, UNKNOWN, UNAVAILABLE and STALE remain distinct. Under the operator's `CLD_NOT_FOUND_V1` policy, a correctly echoed current phone with both iCallme and Scam.vn reporting "Khong tim thay" is accepted as a scoped NO_MATCH and can activate the account even while CheckScam is UNAVAILABLE. Positive warnings, an existing administrator restriction, unrelated risk cases and active blacklist entries always prevent that automatic clearance.
- A permanent account restriction is an administrator's confirmed decision, with evidence and audit. Users can submit appeals.
- Clearing an individual blacklist entry does not clear the associated RiskCase or activate an account. Clearance requires its separate verification decision.
- Editing a restricted profile is denied in both API and SQL. The login dialog offers review and close actions.
- Device IDs are random first-party security identifiers, not proof of physical identity. IP/device evidence is linked to the observed account; shared IPs never automatically identify or blacklist other users. IP blacklist signals expire within 24 hours.
- A fresh positive anonymity result permits browsing but blocks inquiries/chat at HTTP and Socket.io backends. The web popup asks the user to disable VPN/proxy. Unknown/unavailable IP results are not invented as positive detections.

Public traffic passes through an internal edge proxy that overwrites client-IP headers and authenticates its forwarded values. Untrusted forwarded IP headers are ignored. Dynamic Docker DNS and sufficient OAuth header buffers are configured so replacing containers or returning chunked cookies does not break login.

## Listing Files and Required Fields

New listings start with no selected category. Specifications and accessories are expanded after category selection and validated in the composer, create/update API and database trigger. Deploy `deploy/vietnam/listing-required.sql`, generated by `scripts/generate-listing-guard.mjs`, before the updated application. Every product specification is required except optional usage count and masked vehicle plate. Categories without an existing accessory field now have one; users can explicitly declare no accessories. Existing published listings remain visible; edits must supply the current required fields. Updates that only change rental status remain compatible with legacy listings.

The composer downloads category-specific UTF-8 CSV templates, imports files up to 256 KB with preview, and exports draft product information. Papa Parse handles CSV quoting and multiline fields. Unknown/duplicate fields, invalid selections and malformed prices are rejected. Partial imports remain drafts and cannot bypass publication validation. Photos and province/ward selection remain in the listing form; imported data never publishes automatically. Static templates are generated with `node scripts/generate-listing-templates.mjs` under `public/templates/`.

The development laptop now has Tailscale 1.104.1 installed, its service is Automatic/Running and unattended mode is enabled. Remote deployment can use SSH to the homelab at `100.107.146.119` with the pinned existing host key, without requiring the home LAN. No exit node or public SSH port was added.

## Identity Documents

`/dashboard/kyc/verify` accepts a 12-digit ID, front/back card images and a selfie, with explicit processing consent. Large mobile photos are optimized before upload. Backend upload bytes/pixels/types are bounded; metadata is stripped. Images and OCR fields are encrypted, stored outside public assets and removed after the 30-day retention period.

The local Python service uses Vietnamese/English Tesseract OCR and DeepFace 0.0.102 with SFace/cosine distance. Fields that can be extracted from labels are candidates requiring confirmation. The engine was tested with official public DeepFace fixture images (same-person acceptance and different-person rejection) and an explicitly synthetic number image. This does not validate a real government document.

The UI reports actual distance/threshold rather than inventing an accuracy percentage. A single still image does not establish liveness. Every submission enters REVIEW; an authorized reviewer must inspect all three images before approval. Each document view is audited. KYC approval and risk/account activation remain separate decisions.

## CRM and Automation

The first CRM owner was bootstrapped from the verified existing Google project-owner identity, without changing customer activation. Use `/crm` to assign staff permissions; self-permission changes are rejected. Backend permissions and private table grants apply regardless of hidden UI controls.

The portal supports persistent records for promotions, content/images, support tickets/complaints, callcenter follow-up, personnel, accounting entries, tax drafts, affiliate product management and bot settings. Record version checks prevent silently overwriting newer edits. Saving a record, audit and its publication schedule is transactional. Published content/promotions can appear on the website; scheduled content is published by the worker only if its version/status still match.

The callcenter currently records follow-up and outcomes; it is not connected to a telephone/PBX provider. Accounting/tax records and CSV exports are drafts/management artifacts, not official tax filings or a full accounting certification. Provider credentials/contracts/digital signing integration are required for those external operations.

The worker claims jobs atomically, records outcomes, supports bounded retry and retention cleanup. It supports identifier/network checks, local OCR/face processing, scheduled publication and existing bounded affiliate/market collection scripts. Publisher access and approved cashback traffic remain prerequisites for genuine affiliate links/conversions; no key was supplied and no live rewards are claimed.

Ollama and Qwen2.5 1.5B run locally. Customer support uses approved RELOO knowledge with source links and can create a staff ticket when the user requests handoff. Conversation history is stored locally. Staff can view support conversations and ask for an operational analysis of actual metrics. APPROVED bot settings can enable/disable support/analysis AI. AI has no tool capable of granting roles, activating accounts, sending money or submitting tax filings.

API traces contain method, normalized route, status and latency, excluding queries/tokens/bodies. They are retained for 14 days. Optional first-party journey events require analytics consent and are retained for 30 days. Recommendation interests use activity within RELOO with consent. Browser histories and other websites' cookies cannot be read by this application. Report views use bounded recent samples and do not claim to include unobserved/rejected tracking traffic.

## Weather and Brand

Windy Point Forecast was tested with a real successful response. The API key stays server-side. The header displays the nearest GFS forecast for TP.HCM with temperature unit conversion, relevant Lucide weather icon, attribution and forecast timestamp. It is a forecast, not a live thermometer observation.

The operator retained the current RELOO logo. Browser favicon, PNG icon and Apple touch icon were regenerated from it.

## Operate

From `/srv/reloo/apps/web` on the homelab:

```sh
docker compose -p reloo-web \
  --env-file .env.production --env-file .env.tunnel \
  -f compose.yml -f deploy/compose.homelab.yml \
  up -d --build --wait --wait-timeout 120 app worker browser kyc ai edge
```

Do not start an additional tunnel profile; the existing homelab connector handles the main, www, auth and CRM hostnames. Keep persistent encryption keys, service tokens and private `.env` files backed up separately with restricted access. Do not print resolved compose environments.

Root-only migrations are applied with `docker exec -i reloo-vn-db-1 psql -U postgres --single-transaction -v ON_ERROR_STOP=1 < migration.sql`. Use the operations migration plus the versioned deployment SQL for private grants, staff review, access-device records and transactional CRM actions. Never blindly rerun source-schema creation on a populated database.

Verification includes Node auth/risk tests, an isolated PostgreSQL fixture, real Google callback/session, live CRM persistence, public/private API checks, actual Windy response and real OCR/DeepFace engine fixtures. Browser artifacts are in `output/playwright/`. Live external-source availability and customer-specific document validity must not be inferred from fixture tests.

Primary references: [Supabase self-hosting](https://supabase.com/docs/guides/self-hosting/docker), [custom Auth domains](https://supabase.com/docs/guides/platform/custom-domains), [Windy Point Forecast](https://api.windy.com/point-forecast/docs), [DeepFace](https://github.com/serengil/deepface), [Cloudflare tunnel configuration](https://developers.cloudflare.com/api/resources/zero_trust/subresources/tunnels/subresources/cloudflared/subresources/configurations/methods/update/).
