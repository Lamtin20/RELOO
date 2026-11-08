# RELOO machine-readable commerce — 24/10/2026

## Before change

Scope: public catalog discovery, read-only API contract, crawler discovery. Rules: 005, 007, 009, 011, 013, 017, 019, 020 and rental/booking/payment domain controls. No new personal fields, storage, provider, SDK, schema, transaction authority or binding policy. Public listing projection remains the authorization boundary; machine output uses an even smaller allowlist. Merchant text is untrusted data, never agent instructions.

## Product boundary

AI can discover public listings, filter title/category, read reference prices and open the existing product screen. This version cannot reserve, purchase, pay, refund or act as an account. A product URL is a handoff, not a reservation or authorization. Existing server quote/auth/identity/owner acceptance/payment controls remain mandatory. Rented listings are not advertised as available. Unknown fees/deposit remain unknown, not zero. Stays, Jobs and World are not represented as purchasable inventory.

Endpoints: `GET /.well-known/reloo-agent`, `GET /api/agent/openapi`, `GET /api/agent/catalog`, `GET /api/agent/catalog/{id}`. OpenAPI describes the implemented read surface; this is not a claim of MCP/UCP/ACP/WebMCP compatibility or automatic support by any AI provider. Staging keeps authentication/noindex and robots exclusion.

Stable keyset pagination by listing ID; maximum 40 scanned rows per page. Post-projection hidden rows may produce an empty page with a next cursor; clients must follow it. No unbounded full-catalog download. Responses are no-store because price and visibility can change. Rate limiting reuses the existing bounded process-local limiter; distributed crawler quotas require edge/operator configuration before large-scale indexing. No private account personalization is exposed through this public API.

## Personalization

Existing declared interests, account personalization, withdrawal/reset and consent checks are reused unchanged. This implementation does not introduce covert tracking, automatic UI experiments or individualized prices/terms. Behavior-based adaptation across sessions and delegated agent checkout are future work requiring separate consent, measurable quality checks and scoped/revocable authority. No claim that all requested ecosystem automation is complete.

## Reference checked

Official OpenAPI 3.1.1 introduction retrieved directly on 24/10/2026: https://spec.openapis.org/oas/v3.1.1.html (local ignored copy `output/research/openapi-3.1.1.html`). It defines an interface description, not agent transaction authorization. Search connector unavailable; direct official HTML was read instead.

## Verification

- Targeted unit/integration: 21 PASS across agent catalog, rental-care and contextual support. Guardian self-tests: 12 PASS. Targeted ESLint: PASS.
- Playwright local HTTP runtime: 10 PASS; manifest/contract, query validation, missing-backend failure, no-store, ID validation and POST rejection. Artifact: `output/research/agent-runtime.txt`. Successful live DB catalog traversal and staging/native verification are NOT_TESTED for this change. Projection tests use synthetic rows, not a live inventory claim.
- Initial production build failed because the simultaneous isolated preview regenerated TypeScript's included development type files. Stop the preview and rerun build serially; preserve the failed attempt in the output report. No type-check bypass or generated-path suppression.
- No UI markup, assets, tracking or personalization behavior was changed; new visual accessibility review not applicable to this API-only change. Existing full-product accessibility evidence remains pending.
- Production and native app are not updated by local code. Current source changes invalidate prior source-bound release evidence; do not reuse prior PASS.
