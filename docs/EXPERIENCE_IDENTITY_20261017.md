# Experience and identity update — 17 October 2026

This extends the existing Next.js marketplace, HttpOnly authentication, Rental Care, manual identity review and Capacitor Android app. No framework change, new payment product or automatic identity approval.

## Behavior

- First app launch / first account setup asks for up to five product categories. Skip means all. Account preferences can change them. Explicit choices are distinct from consent to record behavioral events. Anonymous explicit choices stay on the device for at most 30 days; account linking requires confirmation, not an automatic history merge.
- A single onboarding dialog coordinates interests and calendar permission. Android requests OS permission, then creates/reuses an independent local RELOO calendar. Google and device destinations do not silently duplicate each other. Normal calendar menu entries are removed; the permission-management route remains linked from the privacy policy for reconnect/revoke rights. Revoked/denied permissions never count as successful sync.
- Android event ownership markers are scoped to the account, rental source and rental ID, with migration from existing connection markers. Personal calendar events are not edited. The OS/Google can revoke a grant: permanent access is not promised. iOS does not yet have the Android native calendar adapter; Google OAuth remains the available path. No iOS archive/device verification claimed.
- Product detail uses a photo-first layout and a booking panel before long content on mobile, alongside content on desktop. Dates/handover carry to the existing request route and survive authentication. Inclusive daily rental estimates match the existing request convention, exclude unresolved deposit/delivery/other costs, and are not a payment quote. Existing server approval/payment checks are preserved.
- Identity has a public guide at `/verify-identity`, a visible home/account entry and four steps: front, back, QR review, portrait/movement check. All seven supported QR fields are shown. QR stays in memory until explicit final acknowledgement and submission; the backend reparses it and stores QR/submission atomically. A QR scan is not verified identity. Existing human review and encrypted evidence stay in place.
- `/cms/data-collection` is pinned in the footer, privacy page, identity guide and submission notice. Controller details come from the existing CRM `business_settings`, with current version checked again at submission. Missing legal name/address/privacy email blocks new document intake before camera capture; CRM can complete these without a code release. Existing submitted records remain reviewable.
- Consent copy is plain language; optional purposes remain explicit, off by default in settings and independently rejectable. Essential-only does not enable analytics or marketing measurement.

## Legal sources and limitations

The official signed Decree 356/2025/ND-CP, PDF printed page 36, Article 42, states the effective date 1 January 2026 and the end of Decree 13/2023/ND-CP. The policy references current Law 91/2025/QH15 and Decree 356, rather than presenting Decree 13 as current.

- https://vanban.chinhphu.vn/?pageid=27160&docid=216387
- https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf
- https://vanban.chinhphu.vn/?pageid=27160&docid=214590

The policy describes implemented storage/access/retention; it is not legal certification or evidence of completed regulatory filings. Current verification evidence retention follows the existing account/deletion and legal-evidence rules, not an invented automatic 30-day deletion. Android portrait capture includes a short movement video and this is disclosed. Government/biometric provider verification is not asserted.

## Reference evidence

REA public runtime observations from Mioto on the connected Samsung: `output/rea/mioto-user-detail-top`, `mioto-user-detail-current`. Observed photo-first detail, rental times, handover selection and persistent price action. RELOO adapts the layout; Mioto fees, insurance claims, review counts and business terms are not copied. Output evidence is ignored, not production data.

## Additive migrations and rollout

1. Encrypted source/database backup and retain the prior application image.
2. Build the candidate before activating it.
3. In one PostgreSQL transaction apply `declared-interests.sql`, `identity-consent-submit.sql`, then `security-lockdown.sql`; notify PostgREST.
4. Activate app with a health check, then verify Kubernetes renderer synchronization/static assets and public routes. Publish the separately compiled Android beta artifact through the existing update pipeline.
5. Roll back the app image/source if activation fails. Additive tables/functions may remain; never restore the database over newer customer transactions. Reapplying the migrations is supported.

## Verification

- `node --test tests/experience-preferences.test.mjs tests/product-dates.test.mjs tests/rental-care.test.mjs tests/security-hardening.test.mjs` — 22 passed.
- `node --test tests/identity-consent-transaction.test.mjs` — 1 passed: consent/ownership/rollback, single-use session and denied direct authenticated execution.
- The broader identity regression command (`manual-kyc`, `mobile-identity`, `mobile-workflow-schema`, `identity-consent-transaction`) passed all 10 tests. Together with the separate 22-test suite, 32 distinct tests passed.
- Web production build and Android `assembleDebug` succeeded. Android beta is not a Play Store release.
- Playwright actual browser, synthetic endpoints only: category save/skip with no behavioral opt-in; product at 320/390/768/1440 without horizontal overflow; three-day estimate and auth continuation; QR has seven fields and requires both unchecked acknowledgements; guide/policy mobile layout.
- Screenshots: `output/privacy-update/`. Browser fixtures are explicitly synthetic; no real identity record, message, rental or payment was submitted. Physical camera/card acceptance and real Google/OS consent must not be inferred from fixture tests.

Production verification and remaining limitations are recorded in the release output. CRM operator details are supplied by the operator, not invented by this implementation.

## Production evidence — 18 October 2026

- Application build `95EWxGgoZVqag4IOA4BTS`; two Kubernetes renderer pods verified against that exact build. Shared JavaScript asset returned HTTP 200. Health, guide and policy routes returned 200; unauthenticated identity/preferences APIs returned 401. Public client table/RPC grants remain zero.
- `output/privacy-update/production-verification.json` records 47 matching source files across the main release and polish follow-up. Encrypted backups and previous-image tags were retained for each release.
- Android beta `1.0.1-beta.20261017.2327`, versionCode `29870907`, published with SHA-256 verification and installed successfully on the connected Samsung. REA screenshots `output/rea/reloo-onboarding-ready/` show the actual first-run interests dialog. Preferences and OS permission were left for the user; real calendar delivery is not inferred from this screenshot.
- Additional browser checks confirmed the centered landscape dialog with visible skip action, switching a BOTH listing from sale to rental dates, essential-only consent with both optional flags false, and real production product images/mobile layouts without runtime exceptions. A failed harness navigation wait was replaced with a check of the actual SPA URL/state; the resulting flow passed.
- Physical camera/real-card submission and native iOS calendar synchronization are not validated. The iOS device calendar adapter is absent; Google OAuth remains the available calendar path there. No App Store release is claimed.
- The CRM controller fields are intentionally awaiting the operator's entry. Public policy and final intake pull the current CRM record; completing the minimum controller fields requires no code release. No legal identity or contact was invented.
