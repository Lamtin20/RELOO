# RELOO data/API v1

Modular monolith giữ stack hiện có. Public API qua Next backend; public-schema table/RPC không cấp anon/authenticated. Source primitives: `lib/security/authorization.js`, `lib/operations/permissions.js`, `lib/server/http.js`, `lib/supabase/admin.js`.

Shared: identity/profile/address/media/chat/notification/audit/support/payment-provider abstraction. Domain: rental asset inventory, stay unit/time inventory, sale quantity+offers, job shift/headcount/applications. Không lưu người lao động như asset. Private IDs/CCCD/bank/door codes không vào feed/log.

| API | Purpose | Authorization/readiness |
|---|---|---|
| GET /api/listings, /api/db/bootstrap | Existing public catalog | Public projection, no order/private profiles |
| /api/rent/quote/inquiries | Existing rental server prices/request | Cookie/account validation, scope |
| /api/purchases | Purchase read/create/transition | Server account/ownership/SmartKey/version |
| /api/stays | Catalog / quote / hold / simulator / host channels | Production writes503; explicit loopback dev only fixed fixture actor |
| /api/mobile/runtime | Build identity | Public no-store, doesn't prove all clients refreshed |
| /api/superapp | Module readiness/navigation contract | No customer data, server flags; never means legal/commercial approval |
| /api/offers, /api/jobs | Future domain API | NOT_IMPLEMENTED until validated schema/roles/legal; no synthetic public success |

Pagination: stable sort(time,id), opaque cursor bound to query/version, dedupe by domain+id, max page and end marker. Existing home bootstrap has no claim of complete cursor implementation. Never mix rent/hour/sale/salary sorting. Grouped search deep links encode q and transaction intent. Unknown intent returns sector choices, no keyword algorithm claim.

Booking migrations `20261022120000`, `121000`, `122000` in supabase/migrations: types/units/orders/quotes/audit/outbox/external blocks. Apply lockdown after schema; PGlite proof not multi-connection production race test. Integration import cannot trust client price, actor, admin, availability, policy or callback status. Provider network allowlist/SSRF/size/timeouts and secret handling required when connecting real OTA/AI; current link checker does not fetch.
