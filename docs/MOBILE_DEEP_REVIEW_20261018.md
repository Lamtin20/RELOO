# Mobile deep review — 2026-10-18

## Scope and evidence

Existing Next.js marketplace and Capacitor Android app are retained. The Samsung SM-N950N runs the existing remote-web app (`vn.reloo.app`); no replacement framework or APK is required for these shared UI changes. Mioto reference observations are recorded in `MIOTO_SIGNED_IN_WEB_20261018.md` and `REA_NATIVE_ACCOUNT_20261017.md`. REA/ADB evidence is under ignored `output/rea/mobile-deep-review/`.

Observed on the foreground Samsung before this release: tab-to-ready-screen readings across two warmed rounds were Explore 608/586 ms, Account 390/429 ms, Home 624/610 ms; product 591 ms and calendar 198 ms. These are individual click-to-container/paint observations, not percentiles or all-image-load guarantees. Earlier colder observations were much slower (including a 4-second account chunk). Network/server/cache state matters. Paired after-release readings belong in `output/mobile-deep-review/after-paired.txt`; do not substitute estimated results.

## Changes

- Public tab routes are prefetched when the connection permits. Product cards use bounded visible-dwell/intent warming (four background destinations per 30 seconds, deduplicated); category/footer links no longer flood background requests. Save-Data/2G skips full warming. Pending feedback is inline, never a fabricated completion.
- Calendar contents are unmounted while closed; date formatters are reused. Existing Asia/Ho_Chi_Minh selection, time validation and Escape behavior remain.
- Local listing steps focus immediately without forced smooth scrolling. CSV import and optional price estimation are collapsed; estimation is not fetched until requested. Pricing lives in its own step. Mobile final preview precedes publication. In-flight guards prevent duplicate submission.
- Rental confirmation opens immediately with a checking state. Monetary rows stay unresolved until the server quote arrives. Editing/cancelling invalidates and aborts only the read-only quote; a late response cannot replace a newer selection. Submission still requires the authoritative digest and existing idempotency checks.
- Native header derives the visible/current step title. Inline picker Escape precedes route-back. Runtime refresh waits for a safe idle public route, preserving dialogs and edited forms; the rendered build is tracked separately from a candidate update.
- Address selectors expose catalog failure/retry, clear the previous province's ward options and never infer residence or request GPS automatically.
- Public listing responses now contain administrative area only, not house/street/exact coordinates. Owner data remains available to that owner; real transaction participants retain related hidden listing metadata. Actor changes clear private UI state and reject stale bootstrap responses. Partial/redacted data cannot mount the editor. Old editors receive a refresh-required conflict rather than erasing private addresses during rollout.

## Field and rule matrix

| Step/context | Fields and behavior |
| --- | --- |
| Item | Title 3–160 characters, required description up to 6,000; category, condition and category-specific required specifications. UI accepts 1–8 images; existing backend/media validation and WebP storage remain authoritative. |
| Transaction and price | RENT/SALE/BOTH. Daily price 1–100 million VND where required; sale/value up to 1 billion. WEEK/MONTH requires a positive period price up to 1 billion; preview uses the shared 7/30-day ceiling rule. SALE hides rental controls and submits no rental terms. |
| Handover | At least one supported method. Deposit and delivery charges stay explicit; unknown values are not advertised as zero. |
| Area | Province/ward and private street/pickup description; house/unit optional. GPS only after deliberate action. Public area and private pickup details are distinct. |
| Publish | All steps revalidated before POST; one in-flight submission; success only after server acceptance. Authentication/activation remain enforced. |
| Rental dates | Future valid start, end after start, HH:mm, existing maximum 366-day range; selected values preserved through review. |
| Confirmation | Server quote, cost breakdown and policy before send. A request is not an accepted/paid booking. No price, deposit or payment policy changes. |

## Verification

43 automated tests passed in `output/mobile-deep-review/tests-release.txt`: navigation/update safety, public privacy projection, actual DB reader scoping with fixture clients, stale private edits, calendar/selection, rental details, authentication and security baseline. These are unit/integration fixtures, not real transactions.

Browser checks actually run with synthetic API/session/quote/publication fixtures:

- `flows-final.txt`: required fields/focus, weekly rate, no automatic GPS, preview position, duplicate submission, immediate review, late quote rejection and authoritative price.
- `calendar-regression.txt`: image fallback, date/time and cost, filter persistence, Escape, widths 320/390/768/1440 without horizontal overflow.
- `actor-flows-final.txt`: logout/switch, late account response, failed bootstrap/retry and private editor recovery.
- `sale-month-flows.txt`: monthly/sale price rules and unavailable optional estimator.
- `location-error-flows-final.txt`: province failure/retry, old ward exclusion, ward retry recovery.

Screenshots are retained alongside these reports. Samsung keyboard measurements before release confirmed viewport resize from about 773 to 469 CSS px with the title field visible. Recheck after deployment; no unnecessary Android permission or window configuration changes were introduced. Real device publication, uploads, messages, payment and identity-document flows were not exercised. No iOS simulator/device or signed archive was available; shared web validation is not an iOS build claim. Existing listings without an available original image still use the honest fallback.

## Operation and rollout

No schema migration, provider, paid service or secret is added. Existing HttpOnly cookies, nonce CSP, origin validation, backend-only DB privileges and management restrictions remain. Source and DB are encrypted before release; build occurs in an isolated release directory. Activate only a healthy image, reconcile the existing K3s renderers, then compare their exact build IDs and static assets. Rollback restores the previous application image/source, never a database over ongoing user writes. Runtime/source verification and after-device results are retained under `output/mobile-deep-review/`.
