# Rental return rules — 23 October 2026

## Scope and authorization

Owner-requested business rules, not statutory penalties or a legal compliance conclusion. Affected modules: goods rental calendar, quotes/inquiries, signed rental agreements/return events, demo hotel quote SQL and bilingual stay copy. Guardian: RULE-002, RULE-004, RULE-007, RULE-016, RULE-020; rental and payment domain rules. No new personal-data fields, trackers, providers, external assets or automatic debit. Existing binding CMS policies are not published or edited by this change.

## Goods rental

Suggested return = pickup + N calendar days − 30 minutes, Vietnam time. 22:00 pickup suggests 21:30 on the next day for one day. At midnight the one-day suggestion ends at 23:30 on the pickup date. Users can still explicitly choose a different valid return time; normal duration pricing remains unchanged. Changing pickup time refreshes the suggestion, while the return-time wheel remains editable.

Late-return assessment uses the agreed total rent divided by the agreed rental duration rounded up to whole 24-hour days, excluding deposits, delivery and other fees. Under 60 minutes: zero. From exactly 60 through exactly 360 minutes: average daily rent / 24 × actual elapsed late hours. Above 360 minutes: one average day, including delays longer than 24 hours. No repeated daily penalty has been authorized. Round the final assessment to whole VND once. Example: 240,000 VND/day → 60 minutes = 10,000; 90 minutes = 15,000; 6 hours = 60,000; above 6 hours = 240,000.

New server-generated quotes include the versioned rule in their digest. New signed proposals require the current version from the UI and include the disclosure in their terms and signed encrypted event. Subsequent return confirmations calculate a review-only assessment from server-held dates/amounts and server time; subsequent confirmations reuse the first recorded return-confirmation time. This is confirmation evidence, not independent proof of actual physical return. Disputed handovers require human review. No wallet, payment, refund or deposit is automatically changed. Legacy agreements without a policy snapshot receive no new assessment. Retries retain the existing agreement/event idempotency controls.

## Hotel stays

New hotel quotes: check-in 14:00 and checkout 12:00, Asia/Ho_Chi_Minh. The forward migration replaces only the quote command default; old quote/order timestamps and policy snapshots remain unchanged. Room bookings remain demo/unavailable for real transactions according to existing server controls. Goods late-return rules do not apply to hotel bookings.

Apply `supabase/migrations/20261023120000_stay_checkout_noon.sql` after the existing booking migrations, followed by `deploy/vietnam/security-lockdown.sql`. Do not rerun the original create-table migration on an existing database. Validate with the booking SQL and security-hardening tests before deployment.

## Deployment evidence

SSH to the pinned UAT host works. DNS lookup of staging.reloo.vn returns NXDOMAIN at this checkpoint. No staging deployment or public availability is asserted. Guardian release gate, isolated UAT schema/runtime and DNS/TLS must be verified before publication. Local test/build logs are under ignored output/rental-return-*.log; they are not hosted-UAT evidence.
