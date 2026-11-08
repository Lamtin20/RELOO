# V4 source security and privacy review

Status: BOUNDED_SOURCE_REVIEW / DYNAMIC_ACCEPTANCE_NOT_TESTED. This is not an independent penetration test, certification or legal conclusion. No live identities, paid endpoints, secrets, transaction records or production infrastructure were probed/modified for this review.

## Verified source boundaries

| Boundary | Source evidence | Limit |
|---|---|---|
| Account/scope/identity | `lib/security/authorization.js`, account/identity modules | Current real-account/device E2E not established |
| Origin/input/rate control | `lib/server/http.js`, protected route handlers | Existing process-local limits do not alone prove distributed abuse capacity |
| Session/script | `proxy.js`, existing auth cookie helpers/security tests | No full new-source browser/token/pen test claimed |
| Public vs private location | `lib/catalog/public-listing.js`, map projection and private location requirement | GPS is client-reported, not a secure position attestation |
| Files/images | `lib/images/webp.js`, listing-media owner checks, retired private-photo upload | Full moderation/provenance/original retention incomplete |
| Money/webhook | `app/api/payments/sepay/webhook/route.js`, goship verifier, transactional RPCs | Live money/replay/provider sandbox acceptance not supplied |
| Messaging | Thread participant filtering and scoped socket checks | Full delivery/reconnect/recipient E2E pending |
| Database | Security lockdown SQL and backend-only access baseline | Source assertions are not current live grant verification |

No new confirmed P0/P1 exploit was established by this bounded review. Absence of a reproduced finding is not absence of vulnerabilities. Release/coverage gaps are classified as gaps, not legal violations or confirmed exploitable flaws.

## Change-specific assessment

Search localization/IDs/focus introduce no new persistence or data recipient and preserve consent-scoped history. Image rendering changes do not grant access, rewrite original content or process new external URLs. Main bypass is a same-document link. Tokens contain public visual constants only. Development-only fixtures remain guarded by the existing development route; no test actor/backdoor is added to production auth. New review/CI documents do not create approvals or disable Guardian.

## Needs validation / accountable decisions

Independent security review, threat-model coverage of every API/state transition, sandboxed dynamic verification, real cross-account/session tests, full upload/archive/SSRF abuse checks, payment webhook replay/race tests and operations restore must be performed in appropriate isolated facilities. Mandatory GPS business necessity, raw-original retention, asset rights and provider licenses require actual accountable privacy/legal/business review. Existing moderate dependency findings need tracked risk treatment; no forced downgrade or waiver is introduced.

Safe plan: synthetic principals/keys, isolated network/DB/provider stubs and bounded CPU/memory/disk/time; validate one trust boundary with minimum effect, then retain redacted evidence. No load/availability probe on production. Physical-device spoof resistance is not inferred from a GPS accuracy field. World/UE5/game security work is excluded.
