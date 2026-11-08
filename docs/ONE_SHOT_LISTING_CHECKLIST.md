# RELOO One-Shot Listing — implementation checklist

## Superseding Google configuration — 7 November 2026

Following the owner's request for a working alternative, `PRIMARY_SEARCH_PROVIDER` now defaults to `agent-reach`. Set it explicitly to `google` only when that project has confirmed access. This supersedes the Google-default configuration below; the old seven-item Google criterion remains unmet, rather than being relabelled as success. The Google request made from the backend returned 403: project does not have access to Custom Search JSON API. No Google key was committed or saved into production configuration.

The existing private Agent-Reach research sidecar was tested directly from `reloo-web-app-1`: Sony ILCE-7M4 lookup HTTP 200 in 5,193ms, two official Sony sources; Marshall Acton II HTTP 200 in 15,590ms, official manual and support page. These are two observed lookups, not accuracy/latency guarantees. The service already uses Exa public search and Jina reading; no new provider, account or paid key was installed. This evidence establishes live public-source retrieval, not deployment of the new One-Shot frontend or automatic completion of every product.

Affected modules: search provider selection, provider-scoped cache, assist readiness and additive deployment overlay. Data/purpose unchanged: bounded brand/model/category research for listing drafts, never owner photo/contact/account data. Rules RULE-005/007/009/010/012/017/020 apply; existing provider review remains NEEDS_LEGAL_REVIEW. No binding policy, database, production runtime or permissions changed. Tests cover direct primary research without Google, fallback-disable behavior and cache separation. Final build/security/compliance evidence remains required before release.

Operational setting for the next reviewed release:

```dotenv
PRIMARY_SEARCH_PROVIDER=agent-reach
```

Existing private research URL/token must remain server-only. The primary does not depend on FALLBACK_SEARCH_ENABLED; Google-primary fallback remains optional. If the hosted free provider is rate-limited/unavailable, keep manual draft entry and do not manufacture specifications or prices. Rollback the provider setting and reviewed application build only; no database rollback. Actual UI/native regression for this provider-only revision: NOT_TESTED; no publication flow changed.

Owner specification: supplied 7 November 2026. Implementation is inside the existing listing composer, not a replacement app. No production migration or deployment is authorized by this task.

## Before-change review

Existing stack: Next.js 16.4.2/React 19; actor-bound 24h browser drafts; existing WebP upload/camera pipeline; existing authenticated listing publication API; RELOO-hosted Qwen vision; restricted Agent-Reach/Exa/Jina manufacturer lookup sidecar. The photo assist already starts identification, but requires a second owner confirmation before research or any autofill. Existing merge refuses manual-field overwrite and commercial-term inference.

Affected modules: ListingPhotoAssist, ListingComposer, listing-ai policy/server/search/usage, assist route, focused tests and processing inventory. Existing category schemas, sale/rental publication, storage and database privileges remain the source of truth. No new raster assets or production schema changes are planned.

Data/purpose/provider review: product photo stays with the existing local vision service; only bounded allowlisted brand/model/category, never photo/serial/contact/address/account data, can enter Internet research. Google is the primary configured search provider; existing Exa/Jina lookup is an explicitly reported fallback. New telemetry is aggregate operational counts/timings, with no images/prompts/account data. Technical product cache is bounded and temporary. Rules: RULE-005/006/007/008/009/010/012/014/015/016/017/018/020, RELOO-RENTAL and publication/payment authority boundaries. Provider/retention/legal applicability remains NEEDS_LEGAL_REVIEW; this document grants no approval and does not amend binding policies.

## Seven acceptance criteria

- [x] One successful photo capture/upload starts analysis without an AI start button (synthetic camera/browser service transport verified; actual local vision is not configured).
- [ ] Google is the default Internet search provider; real Google integration is separately verified.
- [x] Title, brand, exact model and description fill only when evidence supports them (bounded allowlisted technology products; fixture verification, not a measured recognition accuracy).
- [x] Only unresolved identity and owner-specific condition/accessories/prices require input (existing required category fields still apply; no fabricated answers).
- [x] Manual edits, including intentionally emptied fields, cannot be overwritten by late responses (also tested through saved-draft reload).
- [x] Existing rental, sale, both-mode and manual-posting flows remain usable (price-mode navigation/manual fallback tested; authenticated production publication NOT_TESTED).
- [x] No automatic publication; final explicit submit and existing server authorization remain required (zero publish requests in browser tests; final review checkbox starts unchecked).

These boxes will be updated from actual test evidence, not from implementation intent. Missing provider credentials or unavailable hardware must remain NOT_TESTED.

Google default configuration and legacy eligible-account adapter are implemented and unit-tested. Actual Google calls remain NOT_TESTED: local GET `/api/listings/assist` reports `configured:false`, `enabled:false`, `primarySearch:google`, `searchReady:false`, `fallbackReady:false`. No real credentials were used or printed. This is six locally verified checklist behaviors plus one external integration blocker, not a percentage of overall product readiness.

## Google API assessment — primary sources fetched 7 November 2026

- https://developers.google.com/custom-search/v1/overview : Custom Search JSON API is closed to new customers; existing customers must transition by 1 January 2027. Published legacy quota: 100 queries/day free, additional $5/1,000 up to 10,000/day. Existing-customer eligibility and credentials must be confirmed before use. Never create an assumed new account or send credentials to browser code.
- https://ai.google.dev/gemini-api/docs/google-search and https://ai.google.dev/gemini-api/terms : Grounding with Google Search exists, but its terms restrict automated extraction/collection of links for crawling, reuse and storage of grounded output. It is not silently substituted for a licensed product-data ingestion/search API. Contract suitability for listing autofill requires accountable review (NEEDS_LEGAL_REVIEW).

Raw official responses are retained under ignored `output/verification/one-shot-listing-20261107/`. The web-search connector failed HTTP 500, so official pages were fetched directly over HTTPS. No Google Lens API is assumed. A licensed Google search alternative for new customers needs provider access/contract confirmation; this implementation must not pretend a legacy adapter solves that external dependency.

## Configuration and operations

Server-only settings (do not add real keys to source or NEXT_PUBLIC variables):

```dotenv
RELOO_LISTING_PHOTO_AI=1
PRIMARY_SEARCH_PROVIDER=google
FALLBACK_SEARCH_ENABLED=true
RELOO_LISTING_AI_DAILY_LIMIT=100
RELOO_LISTING_AI_USER_DAILY_LIMIT=20
# Existing private vision and research sidecars, provisioned separately:
RELOO_ADVISOR_AI_URL=http://product-ai:11434
RELOO_ADVISOR_AI_MODEL=qwen3.5:4b
RELOO_PRODUCT_RESEARCH_URL=http://product-research:8011
# RELOO_PRODUCT_RESEARCH_TOKEN=<existing private token>
# Legacy Google adapter only for a confirmed eligible existing customer:
# GOOGLE_CUSTOM_SEARCH_EXISTING_CUSTOMER=1
# GOOGLE_CUSTOM_SEARCH_API_KEY=<server secret>
# GOOGLE_CUSTOM_SEARCH_ENGINE_ID=<permitted engine>
```

The adapter stops legacy Google calls on 1 January 2027. Confirm the engine's actual domain/search scope in the provider console; no universal Internet coverage is assumed. Fallback is attempted only when enabled and configured and returned as `agent-reach`, never labelled Google success. Only matching manufacturer domains/models supply specifications; retailer/product-price ingestion is not added without source permissions. Manufacturer pages are read via the existing DNS-pinned, public-IP, bounded downloader; Google snippets are not specifications. Contradictory extracted facts stay unresolved. No price/deposit recommendation is made without suitable market evidence.

Requests use browser-generated idempotency IDs; backend stores at most 128 short-lived result promises/fingerprints for two minutes and one active action per process. Default caps count assist actions, not monetary billing. The existing edge/IP limit remains; absent trusted edge IP uses a shared bucket. Local per-process limits reset on process restart and do not replace provider project quotas across multiple renderers. Set provider quotas/billing alerts before enabling paid usage. Aggregate counts/durations are readable only by an authenticated admin at `/api/admin/listing-assist`; no keys, prompts or photos are returned. No acceptance, completion, billing or accuracy numbers are invented.

There are no new long-running job tables: the existing abortable identify/enrich requests drive honest progress states. On failure/cancel, photos and manual fields remain. Adding a photo selects the newest photo for analysis; stale responses are discarded. Owner-edited fields are persisted by name in the existing actor-scoped draft. No automatic replacement of conflicting product identity is offered. The existing three validated publication stages remain, with an explicit final review checkbox, rather than bypassing commercial/address requirements to claim a one-click publish.

Rollback: disable `RELOO_LISTING_PHOTO_AI`, restore the reviewed previous application/shared-renderer build and corresponding processing notice. Manual input remains available. Never roll back the database or erase owner listings. New search configuration does not require a database migration. Do not deploy without the release gate and runtime synchronization.

## Validation record

Evidence directory: `output/verification/one-shot-listing-20261107/`. Regression: 59 Node tests passed (16 new one-shot tests included). Existing Python sidecar suite: 6 passed. Targeted lint: zero errors, two existing img-element warnings. Browser: synthetic camera stream plus fixture identity/research responses tested automatic start, delayed edits, clear-and-reload protection, ambiguous model, retry, timeout, cancel, newest-photo race, source links/date, sale/rental/both fields, final confirmation, opt-out, unavailable/manual path and vi/en responsive layouts at 320/390/768/1440px. No real listing created.

Production build passed compilation, TypeScript and generation. Compliance suite: 12 passed. Bounded compliance scan: six findings, NEEDS_REVIEW with missing release evidence/approvals; not cleared for release. Local HTTP checks: readiness 200 with disabled/unconfigured providers, foreign-origin assistance POST 403, unauthenticated admin metrics 401. Metrics endpoint exposes aggregate operational data only after existing admin authorization.

NOT_TESTED: real Qwen analysis on this local environment, live Google account/quotas/search scope, real iPhone/Android camera, authenticated successful publication, labelled real-photo accuracy benchmark, full accessibility/screen-reader audit, distributed budget enforcement, currency/price research and all nontechnology categories. Provider/legal review remains NEEDS_LEGAL_REVIEW. Build and compliance command outcomes are retained alongside these artifacts; technical tests are not a release/legal certificate.
