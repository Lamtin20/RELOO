# staging.reloo.vn — provisioning and verification runbook

Status22/10/2026: **BLOCKED_EXTERNAL / NOT_DEPLOYED**. DNS lookup in this session yielded no record; no verified staging credential/resources in current env; workstation docker command missing. This is not a production failure. No public change or customer data write was performed.

## Resource contract

`deploy/staging/compose.yml`, `staging.env.example`, `nginx.conf` prepare a dedicated app. **They do not provision a complete backend.** Owner must supply dedicated PostgreSQL/Auth/PostgREST/storage instance/network `reloo-staging-backend`, gateway `staging-gateway:8000`, public auth `staging-auth.reloo.vn`, keys, media/evidence volumes, mail/SMS/push sinks and payment sandbox contract. Do not reuse production database, network, queues, key, bucket, JWT secret, OAuth client/callback or analytics index. Verify resource identity independently; a `staging` label is not proof of isolation.

## Prepare and start

1. Access controlled host over Tailscale; create `/srv/reloo-staging`, separate encryption/backup and test restore. Populate env from example with newly issued staging-only keys; do not copy `.env.local`. Create random access password and matching htpasswd without logging secrets.
2. Provision the isolated backend with schema/migrations and `deploy/vietnam/security-lockdown.sql`. Seed synthetic data with version manifest; no production snapshot. Apply schema expand-only then test privileges/ownership. OAuth redirect only `https://staging.reloo.vn/auth/callback`, separate passkey relying party/client settings.
3. Create dedicated **internal Docker network**; attach only staging app/backend/sinks; outbound deny by firewall/network verified from inside container. Network must not have arbitrary egress: env flag `blocked` alone is not an enforcement mechanism. Required network/source configuration is checked operationally before start. Block all live PSP/email/SMS/push credential paths. Initially payments disabled, not called sandbox success.
4. Run `node scripts/verify-staging.mjs` with dedicated env. Start-production also enforces guard after env load. It rejects production auth/backend URL, shared cookie domain, missing staging secrets, live provider credentials, local actor simulators and non-disabled payment. Do not relax it to pass real credentials.
5. Build using staging public auth URL/anon key; Next public variables are compiled. Existing Dockerfile bakes these, so **cannot promote this staging build unchanged to production** with different public auth. Record this environment-specific difference, build digest and commit; rerun production checks when approved. Prefer one immutable artifact per environment tested and deployed by digest.
6. Set STAGING_IMAGE to registry@sha256 digest and STAGING_ENV_FILE to absolute `/srv/reloo-staging/staging.env`; run `docker compose --env-file /srv/reloo-staging/staging.env -f deploy/staging/compose.yml up -d --no-build` from the checked-out artifact directory. Initialize staging volumes with node UID1000 write permission; do not mount production paths. API must use isolated backend. App listens only loopback4524; management remains Tailscale-only. Edge upstream4525 protects every route via htpasswd; application adds a second auth gate on dynamic staging paths. `/api/health` bypasses Next middleware, therefore edge protection is mandatory.
7. Owner with DNS/Cloudflare authority adds staging and staging-auth records to dedicated edge. Provision HTTPS certificate before credentials are entered; no unauthenticated or cleartext public staging. `robots.txt`, `X-Robots-Tag` and metadata noindex supplement access control, never replace it.

## Verification and release criteria

- External unauth request must401, not200; authenticated health/runtime200; exact build across all web renderers/backend. noindex header plus staging banner; host-only HttpOnly/Secure cookies and OAuth return stage only. Confirm production API blocked from stage and outbound sinks deny actual recipient.
- DB migration/privileges, actual two-client concurrent booking/offer locks, verified sandbox callback replay/out-of-order/late payment, cancel/refund snapshots, permissions/tenant tests, screen recording for full partner→approval→quote→pay→complete/cancel. A PGlite demo is **not** this acceptance.
- Same public catalog/runtime on desktop/iPhone/Android; native current production URL is unchanged. Use separate debug/sandbox app build when testing staging; never flip installed production native config silently.
- Synthetic seed/reset restricted to stage resource fingerprint; immutable audit, policy version and source hash in artifact. Do not run reset against production. RPO/RTO **PROPOSED**, restore drill time and evidence required, no fabricated SLA.

## Rollback / incident

Disable affected feature flag/kill switch, stop ingress for mutations, retain callback/outbox evidence and reconcile provider. Roll app to previous staging image digest only if DB schema compatible. Do not restore old database over new transactions or blindly down-migrate destructive schema. Test backup restore into a new isolated database, verify manifests/row counts/privileges then switch only after review. Log correlation ID without identity/secrets. Keep incident clock and owner actions in progress log.

## Missing owner actions

DNS+TLS access, isolated backend/network/resources, dedicated secrets/access credential, real payment sandbox and legal/partner policy approval are not supplied/verified. Code/config preparation can proceed; no claim staging URL works until these are supplied and all verification above is run. Production release requires separate explicit approval.


## UAT preparation update ? 23/10/2026

See [UAT_SETUP_20261023.md](UAT_SETUP_20261023.md). Dedicated backend.yml + gateway/edge config and secure config generator added. Source tests4/4 and YAML parse pass; no Docker runtime/deploy performed. Pinned Tailscale SSH host reachable but authentication denied; Docker absent locally. Complete schema reconciliation, real host access, egress/DNS/TLS and actual journey acceptance remain blocked. No production resource or account was modified.
