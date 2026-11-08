# Data processing inventory

Candidate paths/lines: [discovery.json](discovery.json). Static discovery found 120 files with forms, 31 storage candidates, 153 sensitive-data term candidates. These counts are not a complete field-level inventory. `compliance/field-purposes.json` is deliberately INCOMPLETE until owners classify fields; no necessity/legal basis is invented.

| Processing | Source leads | Data and purpose to verify | Gaps/owner |
|---|---|---|---|
| Account/auth | app/auth, lib/auth, lib/security | Contact/profile, session, authentication and risk | Retention, rights identity verification; Security/Privacy |
| Identity/KYC | components/profile/IdentityConsent.jsx, lib/privacy/identity-policy.js | Identity documents, camera/live capture and verification | Sensitive necessity, providers, retention/deletion exceptions; Privacy/Legal |
| Rentals/neighborhood | lib/neighborhood, lib/rental-care, listing-privacy | Address/residency, contact, handover evidence and disputes | Precision/ACL, no automatic continuous location entitlement; Domain/Privacy |
| Booking | lib/stays, components/stays | Guest/order/stay times, policy and price snapshot | Local synthetic data is not live authorized supply; Domain/Legal |
| Jobs | components/superapp/ServicePages.jsx | Future candidate CV/identity and employer access | Not yet live; purpose/ACL/retention/scam reporting required before launch |
| Payments/refunds | payment/provider modules, webhook routes | Provider references, amounts and ledger/audit | No PAN/CVV logging; webhook/idempotency/retention review; Payments/Security |
| Risk/appeals | lib/security, app/api/security | IP/phone risk evidence, allegations, appeal | ACL/source quality/manual review, no public accusations; Trust/Legal |
| Measurement | cookie-consent, analytics, JourneyMeasurement | Consented pseudonymous visitor/session and public route templates | Cross-border/processor/config review, no PII analytics; Privacy |
| World | contracts and product references | Avatar/chat/game behavior if implemented | Full runtime/source scope and minors/UGC review missing |

Each new field must have module/endpoint/field, purpose, necessity, noticeVersion, reviewed basis, retention, recipients, owner. A draft form or client promise is not server authorization. Subject rights must distinguish deletion requests from mandatory transaction retention; this run does not invent a statutory deadline.

Storage candidates include necessary HttpOnly server auth, readable consent preference, local user settings, session posting drafts and optional measurement IDs. Dynamic keys, IndexedDB/provider cookies and native storage need runtime inspection. Never place tokens in the registry/report.

## Expanded candidate coverage

548 JSX field candidates are now enumerated in compliance/field-purposes.json with literal field/id/type, source path/line/hash and pending owner-purpose/notice/retention review.310 public asset hashes are inventoried separately. No field values, tokens or user records are collected by this static tool. Private purchase draft and discovery scroll use in-tab memory only; purchase draft expiry20min/max50 and actor isolation are internal implementation limits, not statutory retention findings.

Explicit sign-in continuation additionally keeps listing/mode/address/time/version in sessionStorage under a random resume handle, max10entries/20min, then consumes it on authenticated return; wrong/future/expired values are discarded. This is functional transaction draft processing, not a tracker. Formal notice/necessity review remains with the accountable owner. No credential or private address is placed in query parameters.

## Service matching sandbox — 24 October 2026

New service fields are restricted to synthetic staging offers/needs: title, category, fixed city, schedule, duration, optional budget, short redacted note and terms acknowledgement. No live dispatch/payment or training use. Drafts reuse actor-scoped20minute tab memory; persisted sandbox requests/events/receipts expire30days, abandoned offer drafts30days. Account FKs cascade DEMO data; no production transaction-retention policy is inferred. Participants see only their requests; public offers omit owner/contact, and CRM review requires existing support permissions/MFA. Field records in field-purposes.json remain IMPLEMENTED_SANDBOX_PENDING_OWNER_LEGAL_REVIEW; this is not legal approval. See SERVICE_MATCHING_IMPLEMENTATION_20261024.md for roles, notice service-demo-v1 and production blockers.


## Central CRM identity (feature-flagged)

Issuer/subject and explicit local-profile mapping support common CRM sign-in without copying passwords, refresh tokens, customer profiles or remote roles. Central codes: 30 seconds; browser state: 5 minutes; references: earlier of JWT/MFA expiry, at most 8 hours, purged by the operations worker. Mapping metadata lasts until unlink/account deletion, subject to retention review. Backend-only tables and current local account/permission checks apply. Purpose/notice review remains pending; see docs/CENTRAL_IDENTITY_20261024.md.
