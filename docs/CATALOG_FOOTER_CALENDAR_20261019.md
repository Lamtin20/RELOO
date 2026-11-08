# Catalog, home footer and rental calendar — 19 October 2026

## Scope and decisions

- Category photo frames are centered and consistent. The actual defect was the link feedback span matching the old direct-child image-frame selector, creating a second colored tile. Scoped module CSS now isolates the frame and positions feedback as an overlay. Desktop uses a balanced seven-column grid; mobile four columns. Existing WebP artwork and destination group IDs are reused; no fake/new category images or logo.
- The full company footer is mounted only on Home, with an additional path guard inside Footer. It is redesigned as brand/trust card plus Support/Policies and a separate privacy/company strip. The real DMCA badge stays under the company logo; no unverified government/security badge is added. Company fields still come from CRM. Native app keeps its existing no-full-footer behavior. Minimal inline legal links in authentication/forms are retained; those are not the full company footer.
- Interpret "30 days" as **today through today + 29 calendar days**, inclusive, using Asia/Ho_Chi_Minh. Both pickup and return must be inside this window. Dates outside it are disabled, have no price, and cannot be submitted as a new booking. The longer duration-estimate option is capped at 30 too. This is a rolling daily window, not a promise that 30 complete 24-hour periods fit before its end.
- Suggested pickup = the current instant + seven actual hours, rounded up to the next minute; return = 24 hours after that pickup. This is **a suggestion, not a mandatory seven-hour lead time**. Users may choose any otherwise valid future time. Existing explicit date/time choices are retained. Partial dates are not silently completed against a conflicting existing date. Suggestions remain local draft state until Apply; no request/booking is automatically created.
- Hour/minute editor is a small native HTML dialog with independent scroll-snap wheels, 00–23 and 00–59. Keyboard arrows/Page/Home/End work. Commit reads actual wheel positions so an immediate click after a scroll cannot save an old React state. Cancel/Back dismisses only this editor without changing the parent calendar draft.

## Enforcement

`lib/rental-window.js` is shared by calendar validation and the server quote path. New manual agreement proposals also enforce the window. Legacy scheduled booking/draft submission paths are checked server-side after idempotent replay; submission reads the draft scoped to its renter. Existing order acceptance/return/payment/history transitions are not rewritten or cancelled. Billing units, rates, deposit, fees, owner approval, locks and payment checks are retained. No DB schema migration or permission changes.

## Files

MainCategories + CSS module + localized group names; Footer/MarketplaceShell/footer CSS; RentalCalendar/TimeWheelPicker and styles/locales; rental-window/calendar/selection/estimate helpers; DiscoveryIntent duration choices; new-agreement and scheduled-booking guards; `tests/rental-window.test.mjs`.

## Evidence

27 window/calendar/quote/home-navigation/security tests plus 15 scheduled-rental safety tests passed (42 total). Coverage includes Vietnam rollover, leap/year boundaries, inclusive last day, past/future rejection, forged out-of-window quote, price/owner/idempotency/sandbox regressions. Source lint passed.

Browser fixture checks actually ran category geometry/feedback, footer Home-only routing, 30 enabled/priced days and no price on disabled dates, suggestion arithmetic, keyboard 09:07, real mouse-wheel scrolling, cancel preservation and nested Escape. Screenshots at 320/390/768/1440 are in ignored `output/catalog-calendar/`. Fixture listing/company data is not production data. Live build/source/renderer, public quote rejection and Samsung touch/Back evidence are recorded there after rollout; do not infer PASS before those results exist.

No real rental, payment, account creation, SMS or private document test. No new raster asset, provider or paid service. No native binary/iOS build is claimed. Rollout uses encrypted source/DB backups, staged build and healthy app activation, then exact K3s renderer verification. Rollback previous image/source; never restore a DB over ongoing writes. No existing booking records are migrated.
