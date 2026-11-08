# Rental selection, discovery and Account — 18 October 2026

## Reuse and observed reference

This updates the existing Next.js marketplace, `/product/[id]`, `/rent/[id]`, owner composer/editor, inquiry RPC/chat, account profile API, locale provider and consent-controlled recommendation module. No separate app or payment service. Read AGENTS, local Next CSS/router guides, existing product/rental details and source before editing.

REA observation of Mioto on Samsung: `output/rea/mioto-time-picker-review/screen.png` shows day selection plus distinct pickup/return hours and a duration summary; 21:00 to 20:00 the next day is displayed as one rental day. Existing reference captures show handover cards and a fixed price action. Only public search/time screens were inspected; no competitor booking/payment was submitted. RELOO adapts the interaction, without copying assets, insurance or prices.

## Rental selection and pricing

- Shared `RentalSelection` displays dates, canonical 24-hour `hh:mm`, Vietnam timezone and handover cards. Native time input remains available but an explicit HH:mm display avoids AM/PM ambiguity. Past calendar dates are disabled; server independently validates full instants.
- Pickup is free. Delivery appears only when the owner explicitly enables it. Legacy listings with unspecified choices retain pickup; delivery is not assumed. New composer defaults visibly to pickup offered/delivery off. Active rental listing writes reject both explicitly off.
- Optional JSON fields in `listing_data.rentalDetails`: `billingUnit` DAY/WEEK/MONTH, `periodPrice`, `deliveryFee`. Existing daily reference rate remains for legacy modules; the new product/request/card display uses configured period price. Week = 7 days; month explicitly = 30 days. New requests use 24-hour units, rounding partial billing periods up, disclosed before sending. No historical order amount or agreed policy is rewritten. Maximum request interval is 366 days; unknown deposit/delivery remains unknown rather than zero.
- Product footer updates the rental subtotal / billed period count. Choosing rental with complete dates/times opens the review state directly. Request page also supports editing the schedule and reviewing before sending.
- Confirmation itemizes times, handover, rent, proposed deposit, delivery and known subtotal/estimated total. Long terms are expandable. Unknown charges are labeled; no fake complete total. There is no automatic charge or escrow.
- `/api/rent/quote` is a public, origin-checked, rate-limited read using backend-only DB access. Quotes reject locked, sold, inactive, disputed and private-scope listings. Eligibility-gated private listings retain their existing specialized flow.
- Final inquiry POST requires a selection and quote digest, recomputes from current server data, and returns 409 with revised quote when price/conditions changed. The digest detects stale data; it is not a payment authorization or secret token. Server formats the monetary message itself and attaches the quote snapshot to the existing private message JSON. Client-submitted amounts cannot establish price.
- Existing authenticated inquiry RPC enforces accounts/ownership and idempotent message ID. UI prevents concurrent double submission and only acknowledges a request after server response. It still creates a **request/conversation**, not a confirmed order, paid rental or availability hold. Existing owner approval/agreement processes remain responsible for confirmation. Calendar reminders follow actual confirmed rental state, not a quote.
- Explicit rental login continuation retains schedule and a short-lived tab-scoped note resume token; notes are not placed in URLs. A component unmounted after account change cannot inject its old response into the new account's chat state.

## Discovery fix

The recommendation candidate subset was incorrectly used as the entire main feed. `discoveryFeed` now uses it only to prioritize public items, with explicit owner/product/category exclusions preserved. An empty/unavailable recommendation result cannot empty otherwise valid marketplace results. Known exclusions survive temporary preference refresh errors within the same account. Locked, sold, disputed and private-scope items stay excluded from the public feed.

Homepage defaults to ordinary nearest ordering using deliberately supplied location; unknown location keeps ordinary available/newest items and never fabricates GPS/IP location. Explore no longer applies an implicit radius that drops unknown-distance items. Explicit province/radius/search/category/saved/price filters retain their meaning and can legitimately have no matches. Guest preference setup is not required to browse.

## Account and login

Signed-out Account body contains login/register, system language/privacy choices and public help/policy links. User shortcuts, identity entry, saved-owner list, offers, finance, messages, profile and logout are not rendered. Global marketplace navigation remains usable.

Signed-in Account renders an editable name/bio profile directly, with own email/phone shown and direct address/bank/security links. Existing backend identity restrictions remain authoritative; contact verification is not bypassed. Profile fields stay disabled if initial fetch failed, with retry, avoiding accidental overwriting of unknown bio.

Guest language can be explicitly saved as a local functional preference; it does not write account preferences or enable analytics. Authenticated language remains backend-authoritative. Ordinary login, including from Account, lands at home. Explicit ongoing rent/purchase/posting, password recovery, identity and calendar-consent continuations are retained to preserve essential work. Profile completion still runs when required. Auth cookies and OAuth validation are unchanged.

## Verification and operations

- Scoped ESLint: no errors; existing raw-image performance warnings.
- Production web build passed locally; candidate production build runs again before activation.
- Automated suite: rental-selection, listing-rental-details, listing-file, rental-care, security-hardening, ui-language, discovery-query and auth-navigation. Tests include timezone/duration, daily/week/month, unknown costs, owner handover, current server pricing/digest changes, public feed safety, exclusions, normal login/recovery, real PGlite persistence and existing security/calendar regressions.
- Playwright actual browser with clearly labeled synthetic responses: default home/explore visible despite empty recommendations, 21:00/20:00 product selection, updated footer, direct confirmation, price-change review before retry, request acknowledgement, inline own-profile save, guest controls hidden, guest language without account write, login-to-home, delivery-only/weekly pricing and 320/390/768/1440 overflow checks. Screenshots under `output/rental-checkout/`. Fixture inquiry responses did not message real users or create real orders/payments.
- Native Mioto observation is not native RELOO/iOS simulator testing. Shared web/Capacitor content is updated; no native iOS archive or payment success is asserted.
- No schema migration: new period fields and request snapshots use existing JSON storage. No new public-schema grants. Existing confirmed transactions and payment flows remain intact.
- Deploy after encrypted source/database backup and candidate build. Activate healthy Docker API app, synchronize both Kubernetes page renderers and static archive, verify exact build and public read-only quote/UI. Retain prior image/source for rollback; never restore old DB over newer transactions. Owner period fields can remain in JSON after code rollback but should be reviewed before reverting to legacy daily-only presentation.

## Production completion

- Final build `svCbSTE2SzjmklKv0uPrR` was verified on the Docker backend and both Kubernetes renderer pods; matching static JS and health returned HTTP 200. All 37 release source paths (including the guest Account navigation refinement) matched final local sources after follow-up corrections.
- The consolidated automated command passed **41 tests**. Additional browser tests confirmed public review before login, explicit rental continuation with preserved hours/note, local-only guest language, ordinary login to home, delivery-only weekly rate and re-acknowledgement after changed price. Inquiry/profile writes in those tests used synthetic responses, not real customers.
- Real public home and explore each returned visible products in the verification session. Real guest product selection continued to the review page with 21:00–20:00 preserved, free pickup, unknown deposit correctly labeled and 320/390/1440px without overflow/runtime errors. No production inquiry, chat message, login or payment was submitted for testing.
- Real read-only `/api/rent/quote` returned one DAY unit for the 23-hour interval, ignored a client-supplied amount and rejected `99:00`. Evidence: `output/rental-checkout/production-verification.json`; screenshots `production-product-390.png`, `production-review-*.png`, `production-guest-390.png`.
- Existing inquiry WebSocket emission is retained after successful committed RPC/local sync, using the same authenticated chat hook. No real-recipient delivery is claimed from fixture checks. Late responses from an unmounted request component cannot update another account's chat state.
- During rollout Ubuntu/WSL became offline and public health returned Cloudflare 530 while a separate Windows maintenance session was observed. Read-only inspection avoided competing service commands. After Ubuntu recovered, the interrupted candidate build was confirmed canceled, available RAM/disk and healthy API were checked, and deployment resumed. Final public health and renderers were reverified. This feature rollout is not a claim to have fixed Windows/WSL availability.
- CRM/admin Google continuations were explicitly preserved in the shared callback helper; ordinary customer login still returns home. Provider SSO itself was not reauthorized with a real account during this verification.
- Guest Account navigation exposes only Home, Explore and Account; posting/messaging entry points are also omitted there. Signed-in and other marketplace navigation keep their existing functions. Real public screenshot: `production-guest-system-only-390.png`. This preserves a way back to browsing without showing private Account actions.
