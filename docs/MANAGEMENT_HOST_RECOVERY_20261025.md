# Management host recovery — 25 October 2026

## Before-change assessment

Scope: Cloudflare host routes, production Chat/Agent Office configuration, CRM management SSO, version-editor serialization and management UI environment labels. No new customer fields, tracker, assets, model provider or transaction permission. Existing private Agent Office operational metadata is restricted to production CRM administrators with current MFA. Rules 005–010, 013, 016–020 and security/runtime release controls apply.

The owner requests live Chat and Agent host recovery and reports increasing server allocation. WSL confirms 20,001 MiB RAM / 8 CPUs / 4,096 MiB swap. The server had just restarted when the screenshot showed Cloudflare 1033. At the subsequent probe the connector had established QUIC connections and Chat returned a RELOO redirect. Recovery at that moment does not prove future tunnel availability or authenticated access.

## Target configuration

Only staging.reloo.vn is UAT. chat.reloo.vn and agent.reloo.vn route to the production shared application, using the existing production database and CRM identity. A host-only, opaque management session is issued through one-time proof-key SSO with current CRM MFA; roles are rechecked server-side. No production refresh token is copied to UAT or exposed to browser JavaScript. Old Chat UAT federation cookies must not shadow production sessions.

Agent Office remains private upstream, with a fixed-endpoint server adapter and a restricted member account for selected job/project/provider metadata. No upstream admin dashboard, default credentials, Docker socket, shell tools or arbitrary endpoint is exposed publicly. Existing task status is real; office motion does not invent agents, exchanges or customer transactions. This release does not grant unattended production-write authority.

Knowledge version reads return canonical editable FAQ fields and a separate review array. Draft reopening must work without relaxing sensitive-data, public-source, publication or financial-policy checks. Production UI links to reloo.vn and labels its actual environment; changing a label alone is not an environment migration.

## Verification and release boundaries

Require fresh lint/typecheck, regression, security, consent, dependency, build and Guardian evidence before a new source release. Record actual release status, source/build identity, encrypted backup, rollback configuration, private adapter health, Cloudflare routes, authenticated CRM reuse and unauthenticated/forbidden access. Legal/asset approvals are not invented; previous operational exceptions are not represented as legal certification. If a new source candidate remains gated, restoring access with an already-released runtime must be reported separately from any local-only fix.

Private evidence is retained under ignored output/uat/management-hosts-20261025/. Do not record credentials, tokens, OTP, raw customer conversations or Cloudflare session state in public reports.
