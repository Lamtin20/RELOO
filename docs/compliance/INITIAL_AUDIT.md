# Initial audit ? RELOO Compliance Guardian

Date: 2026-10-23 (Asia/Ho_Chi_Minh). Source: dirty working tree; no reset/deploy. Scope: repository source, not a production penetration test. No prior Guardian coverage ledger found. Candidate inventory is not a confirmed vulnerability list.

## Architecture and boundaries

Next.js 16.4.0 / React 19.2.4, custom Node server; Supabase/PostgreSQL backend-only public schema/RPC; server HttpOnly auth, authorization in lib/security. Capacitor Android/iOS wraps https://reloo.vn. PWA and admin share runtime. RELOO World/NFT source references do not establish an operational game service. Review World as future/limited source until owner provides actual runtime.

Data boundaries: browser/native to API; user to another user/tenant; admin to private records; webhook/provider to payments; consent to optional analytics; source assets to public distributions. Existing modules include rental, neighborhood, booking local adapter, jobs coming-soon, KYC/identity, risk appeals, wallet/payment/outbox.

Existing controls: lib/cookie-consent.js version2 with expiry, default optional categories false, revoke cleanup; ProductAnalytics gated by consent/DNT/GPC; google-browser loader production-host-only but relies on caller for consent. Legal current.js hashes publication and reports draft when entity/publication not ready. Existing secret scanner is bounded patterns, not full history. Existing domain/security tests should be reused.

Deployment: deploy/vietnam, deploy/staging, container/proxy and server scripts. GitHub workflows ios-simulator and product-foundation; no evidence of branch protection/required checks or hosted Guardian installation. Do not stop existing production on findings. A new release gate must fail closed on missing evidence, not invent a successful audit.

## Static discovery

- forms: 120 file candidates.
- storage: 31 file candidates.
- tracking: 60 file candidates.
- permissions: 25 file candidates.
- sensitive: 153 file candidates.
- network: 232 file candidates.
- assets: 11 file candidates.

Full candidate paths/line references: [discovery.json](discovery.json). Dynamic input fields, embedded provider behavior, runtime cookies and network destinations need browser/operator review; regex candidates are not a complete data map. Generated build/node_modules and secrets/env values excluded. app/cms/[slug] means a policy route can exist without an approved current publication.

## Initial observations, not legal findings

- Previous local build reports a dependency security advisory for installed Next.js. Re-validate with dependency audit; do not infer exploitability from version alone.
- Existing full lint has 28 errors/63 warnings; selected scope and runtime checks previously passed, not all-repository acceptance.
- Legal entity, effective policies, cross-border transfers, asset licenses and applicable financial/World obligations need accountable approval. Do not create these facts.
- Public browser tracking denial/revocation must be tested, including at the loader boundary.
- External official legal search tool returned HTTP500; law effectiveness/transitional provisions remain NOT_VERIFIED. Existing source references are leads, not current legal advice.

## Implementation impact assessment before change

New files: compliance registry/scanners/evidence/gate/tests/reports; CI and optional git hooks; admin read-only report endpoint/page guarded with existing requireAccount(admin:true). No DB migration, prices, contracts, published legal policies or existing production runtime changed. Add defense-in-depth consent check only after tracing current tracking call path. No real transaction or production scan authorized by this initial audit.
