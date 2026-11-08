# UAT infrastructure checkpoint — 24 October 2026 (Vietnam)

Authorized scope: setup staging requested by the owner; no production application release. Affected controls: RULE-017, RULE-020, deployment isolation and release evidence. No new user-data purposes, SDKs or assets.

The owner logged in interactively to a dedicated Chrome session. Observed the existing RELOO tunnel and four production routes. Added only `staging.reloo.vn`, service `http_status:503`. Cloudflare confirmed creation of the DNS record. A query through 1.1.1.1 returned Cloudflare addresses; an HTTPS request returned 503 with TLS verification result 0. This is an intentional unavailable endpoint, not an application deployment or successful UAT.

The original reloo.vn, www.reloo.vn, auth.reloo.vn and crm.reloo.vn routes remained listed after the change. No production image, database, service configuration or existing route was edited.

Evidence: ignored `output/uat/cloudflare-routes-current.txt`, `cloudflare-route-preview.txt`, `cloudflare-routes-after.txt` and associated Playwright snapshots. Do not commit browser session state or account screenshots containing personal details.

Next conditions: isolated backend/schema and synthetic seed, protected application access, immutable build, current Guardian evidence, browser/runtime/catalog checks, backup/restore and outbound denial verification. Guardian missing manual legal/license/data-purpose approvals cannot be fabricated or replaced with a passing technical test. The native app still targets production; it has not been pointed at staging.

## Backend checkpoint

Provisioned six dedicated reloo-staging containers (database, auth, REST, storage, gateway and Mailpit) on an internal Docker network with dedicated volumes and generated credentials. Only the Mailpit inbox is bound to host loopback. No live provider credentials were copied. Credentials and schema diagnostics remain in the server's mode-700 staging secrets directory; values are not recorded here.

Copied only the production public schema using pg_dump --schema-only --no-owner --no-privileges, then restored it transactionally into a verified empty staging public schema. Source schema artifact: 722343 bytes, SHA256 a446fa4d5ce7d774fbf99371903fd23722cd40c7280fff5bc5194b83b2f7c6b2, 184 tables before adding booking tables, zero customer rows copied. No source database writes were performed.

Applied the three booking migrations and forward checkout-noon migration to UAT, followed by security-lockdown.sql. The first gateway start revealed nginx map_hash_bucket_size was too small for the service JWT; increased it to 512 and restarted only that UAT gateway. All six containers subsequently reported running. Verification found zero public-schema table or RPC grants to PUBLIC/anon/authenticated; the network is internal. SQL function definition confirms noon checkout.

Created a private custom-format empty UAT baseline backup. The first restore attempt using the restricted postgres role failed on vault.secrets permissions. A separate restore using the existing UAT-only supabase_admin operator role passed and restored 195 public tables into uat_restore_admin_check_20261024. Both drill databases remain isolated and unpublished. This proves empty baseline restoration, not seeded transaction recovery. Synthetic customer/listing seeds, full provider sandbox flows, browser accessibility, hosted application and native runtime checks remain pending. DNS/TLS is ready, but staging intentionally returns 503 until those release requirements are resolved.
