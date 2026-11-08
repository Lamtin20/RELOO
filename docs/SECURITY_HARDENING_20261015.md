# RELOO security hardening — 15 October 2026

This release addresses the concrete weaknesses in `output/security-2026-10-15/RELOO-WEB-SECURITY-AUDIT.md`. It is not a certification that all attacks or vulnerabilities are prevented.

## Changes applied on the running system

- Backed up PostgreSQL and transactionally revoked PUBLIC/anon/authenticated access to public-schema tables, columns, sequences and RPCs. Anonymous public RPC count and direct client table grants are zero. UPDATE role/activation/KYC privileges are false. Backend service-role permissions remain for application APIs; Supabase Auth/storage schemas were not blanket-revoked.
- Set global and schema default privileges to prevent newly created public functions/tables from silently reopening client access. Subsequent migrations must preserve this baseline. `deploy/vietnam/security-lockdown.sql` is idempotent and should be applied after future schema imports.
- Gateway blocks direct public REST/storage operations unless using the server key. Browser authentication remains available. CORS no longer accepts development localhost origins in production.
- Nginx limits sensitive Auth routes, login and write endpoints. Limits are shared within the gateway process, not just Next.js process memory. GoTrue verification/refresh limits and 24-hour session timebox / 8-hour inactivity settings are configured. JWT validation/refresh still determines effective token expiry; this does not make all previously issued JWTs instantly invalid.
- Website session and PKCE cookies are HttpOnly/Secure/SameSite=Lax with 24-hour max age. Legacy cookies are upgraded by Proxy. Browser store now refreshes through `/api/auth/session`; Socket.io reads the HttpOnly session cookie server-side and verifies the token with Auth for each gated event. No token is returned to JS for socket setup. CRM retains its own AAL2/TOTP receipt and permission checks.
- Nonce CSP is generated per request. Production script policy uses strict-dynamic without unsafe-inline/eval; inline style remains allowed for existing React/CSS flows, and wasm-unsafe-eval supports vision code. Remote images/media remain permitted over HTTPS for partner content. This is a deliberate compatibility boundary, not a claim of maximally narrow resource allowlists.
- HSTS, nosniff, anti-framing, Referrer-Policy and Permissions-Policy are served. Camera/microphone/location remain available to same-origin features. X-Powered-By is disabled.
- Host/Docker chains restrict management/application ports to loopback, existing/internal Docker communication and Tailscale access; external new connections to listed management ports are dropped. The Cloudflare connector makes outbound connections, so the public site remains available. Firewall applied with timed automatic rollback, then rollback timer canceled after SSH and public health succeeded. The service persists across boot/Docker restart.
- App/worker containers run filesystem read-only, cap_drop=ALL and no-new-privileges. Only explicit media/evidence volumes and bounded temporary/cache mounts remain writable. Base compose files and security overlays contain the settings.
- Correct database backup now targets reloo-vn-db-1, plus public media, private evidence and application/auth configuration. AES-256 GPG archive produced every six hours, checksum and archive readability verified. No automatic deletion until retention policy is confirmed. Root key stays root-only on server. A checksum-verified encrypted copy is held on the development machine; its passphrase is protected by Windows DPAPI for the signed-in user, not plaintext.
- Development task `RELOO-Encrypted-Offsite-Backup` syncs hourly and at sign-in. It requires this machine to be connected and that user signed in. This is a second machine copy, not independent cloud object-lock storage.
- Security checks run every 30 minutes: dangerous DB grants, core headers, public health and backup freshness. Failure records are root-only and emitted to journald/syslog. No external email/Slack/SMS alert destination was configured or messaged.

## Validation performed

- Transactional migration dry run, rollback and live apply; privilege assertions are inside the migration. Tests use an isolated PGlite fixture to verify current and future grants, including preservation of storage-schema grants.
- 25 focused tests passed for Auth, native Google nonce handling, CRM MFA/grants, WebP validation, scoped Shorts access, cookie policy, socket-cookie parsing and SQL lockdown.
- Production build/TypeScript passed. Public homepage, Auth, News, Safety, bootstrap and health return 200; anonymous CRM API returns 401. Bootstrap still returns listings/profiles and zero anonymous orders.
- Public direct REST profile/RPC requests return 403. Post-migration counts: anon table grants 0, authenticated table grants 0, anonymous public RPCs 0.
- A separate temporary Auth account was created without sending email, exchanged into a session, and tested through `/api/auth/session`. Cookie flags were HttpOnly/Secure/Lax and token was absent from response JSON. The account was deleted after testing. Google OAuth start returns 200 and PKCE cookie has HttpOnly/Secure.
- Browser hydration/carousel interaction succeeds. A non-authorized inline event-handler probe was blocked with `script-src-attr`. Dynamic scripts created by already trusted script contexts are not a valid test of parser-injected script blocking under strict-dynamic.
- Backup decrypted and restored into a temporary database; restored profile/asset/article/Auth counts were read, then temporary database removed. No production database replacement occurred. First encrypted off-machine archive passed SHA-256 verification.

Detailed evidence: `output/security-hardening/final-check.json`, `tests-final.txt`, `http-only-session-check.txt`, `infrastructure-verification.txt`, encrypted-copy receipt under `offsite/last-success.json` and the earlier audit directory. Do not publish audit evidence or backup/key artifacts to website/Git.

## Status against the original 20-point checklist

| Point | Post-change status |
|---|---|
| 1 Password hashing | Local email/password login remains disabled; Google Auth used. No plaintext password storage added. |
| 2 Login limits | Nginx login/Auth limits and GoTrue verify/refresh limits active; app-level checks retained. Not a distributed global bot defense. |
| 3 Session expiry | Auth timebox/inactivity configured; JWT expiry and CRM eight-hour receipt retained. |
| 4 Debug logging | No new request-token/body logs; operational security/backup failures recorded locally. |
| 5 Frontend secrets | No token response added; browser Auth SDK usage removed from store/chat; known-secret bundle scan had zero hits in prior audit. |
| 6 Error disclosure | Generic HTTP errors retained; no stack traces returned by tested protected API paths. |
| 7 Upload types | Server decodes image content, rejects unsupported/forged content, stores WebP; video probe retained. |
| 8 Upload bounds | Request, pixels, dimensions, file bytes and media processing limits retained. |
| 9 Server validation | Existing server input/permission checks retained and tested on fixtures. |
| 10 IDOR | Public DB/RPC bypass closed; application ownership checks retained. Full manual two-user business-flow coverage remains outstanding. |
| 11 Admin restriction | Public role/activation/KYC writes removed; CRM MFA and staff-permission fixtures pass. |
| 12 SQL injection | Parameterized query/RPC patterns retained; no unsafe browser-supplied SQL introduced. |
| 13 HTTPS | HTTPS/redirect behavior retained; public health and pages return 200. |
| 14 Browser headers | Nonce CSP, nosniff, frame protection, HSTS, referrer and device permission policy active. |
| 15 Cookies | Live temporary-session test verifies HttpOnly, Secure, Lax and no token JSON response; PKCE cookie also checked. |
| 16 CORS | Production origins allowlisted; localhost removed; public data gateway blocked; socket Origin checked. |
| 17 Database exposure | No host-published PostgreSQL port; management ports filtered outside Tailscale/internal communication. Router/NAT settings not audited. |
| 18 Least privilege | Browser roles have no public data/RPC grants and defaults locked; trusted backend still uses service-role. |
| 19 Cloudflare | Tunnel remains active; account WAF rules cannot be independently configured/confirmed with current access. |
| 20 Backup/monitoring | Six-hour encrypted backup, off-machine copy, isolated restore test, 30-minute security checks installed; external on-call delivery not configured. |

## Remaining boundaries

- Cloudflare account WAF/managed rules and Tailscale ACL/dashboard settings were not modified without the corresponding management access. No DDoS/load test or independent external penetration test was run.
- Bypassing client access does not remove the trusted backend's service-role power. A future step is splitting backend responsibilities into narrower roles/RPCs, with additional integration tests before changing those credentials.
- Do not claim a complete manual tenant-isolation test for every business endpoint. Existing scoped tests and temporary Auth verification are evidence for tested paths, not all future paths.
- No immutable/cloud object-lock offsite retention or external on-call notification is configured. Backups need storage-capacity monitoring; copy/recovery of the DPAPI key requires protecting that Windows account/system.
- Windows host must stay powered, connected and awake. Current autostart task starts WSL after the owning Windows account signs in. It does not make a laptop resilient to power loss or suspend.

## Operations

`systemctl status reloo-host-firewall.service`

`systemctl list-timers reloo-security-backup.timer reloo-security-check.timer`

`journalctl -u reloo-security-check.service -u reloo-security-backup.service`

Run `bash /usr/local/sbin/reloo-restore-check` for a bounded isolated restore drill. Do not decrypt backups into public directories or restore over production without a separate plan. Initial rollback data is root-only under `/srv/reloo/backups/security-lockdown-20261015`, `/srv/reloo/backups/security-web-20261015` and `/srv/reloo/backups/security-infra-20261015`; applying old ACLs would reopen the audited vulnerabilities and is not a routine rollback.
