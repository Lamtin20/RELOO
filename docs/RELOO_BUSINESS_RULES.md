# RELOO rule index v1

Machine-readable source: `lib/product/rules.json`. All entries have ID/version/status/preconditions/input/result/exceptions/roles/source/verifiedAt/owner/tests. This index links implementation, it does not silently rewrite existing rental engine rules or constitute legal approval.

| Rule | Purpose |
|---|---|
| GOV-001 | Change impact + spec/test/changelog, CI consistency |
| UX-001 | Four mini apps, readiness visible, shared nav |
| UX-002 | Explicit intent, no mixed price sorting |
| UX-003 | Accessibility/i18n/mobile evidence |
| AUTH-001 | Server authorization, membership, safe login continuation |
| DATA-001 | Backend-only public schema/RPC, lockdown |
| STAY-001 | Interval/unit inventory + atomic hold |
| STAY-002 | Price/policy snapshots, no fake paid/confirmed |
| STAY-003 | External calendar source dedupe, no destructive failed import |
| PAY-001 | Separate order/payment/refund, no live custody without provider/legal |
| RENT-001 | Existing rental lifecycle/evidence/extension overlap |
| SALE-001 | Negotiation acceptance != payment, hold at checkout |
| JOB-001 | Worker/employer and full-time/shift separate; no deposits for jobs |
| ENV-001 | Staging isolation and credentials fail closed |
| ENV-002 | Protected/noindex staging, no production release |
| OPS-001 | Measured capacity, no extrapolated2000 guarantee |
| LEGAL-001 | Model-specific legal register blocks unapproved release |

READ BEFORE EDIT: AGENTS, this index, complete JSON rules impacted and referenced dependency docs/source. Add impact record to RELOO_CHANGELOG/PROGRESS. Run `node scripts/verify-product-rules.mjs`, scoped tests and lint/build; CI records result. Status PROPOSED/BLOCKED is a real release gate, not a tickbox that can be marked IMPLEMENTED because UI exists. Monetary rates/TTL/SLA not approved remain config proposals. Legal duties are in compliance register, not internal product policy.

| UX-006 | 1.2.0 | PARTIAL | URL context, scroll/draft, bounded explicit sign-in handoff; actual deployed native/provider acceptance pending | tests/mini-app-navigation.test.mjs; tests/purchase-resume.test.mjs |
