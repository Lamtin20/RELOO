# Product rental details — 18 October 2026

> Current rental selection, confirmation, period pricing, discovery and Account behavior is documented in [RENTAL_SELECTION_ACCOUNT_20261018.md](RENTAL_SELECTION_ACCOUNT_20261018.md). The earlier daily/inclusive request description below is historical: new timed requests use explicit HH:mm and 24-hour billing units, with configured week/30-day-month options. Existing agreed orders are not repriced.

## Reference evidence and adaptation

The user's long Mioto screenshot shows gallery, time/handover, map, insurance, extras, vehicle characteristics/features, owner, reviews, document/deposit terms, usage rules, possible fees and cancellation. REA runtime captures on the connected Samsung confirm the Toyota Vios public detail and extra-service blocks: `output/rea/mioto-detail-current-new/` and `mioto-detail-options-new/`. Search/detail navigation only; no booking, payment, messaging or competitor asset import.

RELOO reuses `/product/[id]`, the existing request route `/rent/[id]`, listing create/update APIs, owner editor and category specifications. It does not acquire Mioto insurance or invent review counts, response rates, exact maps, instant availability or financial commitments.

| Mioto block | RELOO implementation |
| --- | --- |
| Images, dates, rate action | Existing gallery, date selection and request continuation retained |
| Pickup/delivery | Optional declared availability and public-area instructions; exact private location stays in the transaction |
| Vehicle characteristics | Existing category specs plus optional transmission, seats, consumption/range and included features for vehicle group |
| Extras | Owner-defined service/accessory names, conditions, amount or unknown quote, per-use/day/hour/km unit |
| Requirements/deposit | Renter requirements, proposed deposit and conditions; no default promise of free deposit |
| Rules/cancellation/late return | Distinct owner-authored fields, including damage/missing accessories |
| Extra fees | At most six owner-declared charges with applicability, amount and unit |
| Owner/reviews | Existing profile and aggregate data retained, no fabricated operational metrics |
| Insurance | No insurance block or insurance charge inserted without a real supported service |

## Storage and API

`assets.listing_data.rentalDetails` is a versioned JSON object using existing storage; **no schema migration**. The shared `normalizeRentalDetails` rejects unknown keys, bad versions, nonboolean handover flags, overlong text, unsafe/negative amounts, more than six extras/fees and per-km units outside vehicle categories. `null` means unknown; zero is an explicit owner declaration. Both create/update use the existing server validator and resource ownership checks. Existing listing metadata survives update merge. Older clients that omit the field retain it on update through the existing merge; explicit null clears it.

Creation includes the new fields in the existing account-scoped draft; editing includes them in the existing authenticated update payload. The editor waits for loaded listings before initializing its form, so a direct reload does not permanently initialize the form to null. Vehicle additions are optional; older required specs remain unchanged. Public server-rendered detail data includes the new public terms.

The request screen repeats rental terms before sending. Displayed fees/extras are **not selectable paid products**, not automatically charged and not part of an invented final total. Current request pricing remains daily/inclusive and the two parties agree final terms. This update does not change confirmed-order pricing, deposits or cancellation execution. Listing changes do not imply retroactive changes to an agreed rental. No new arbitrary-source fetch, upload, PII collection or third-party map billing was added.

## UI and verification

New rental-detail UI has Vietnamese/English dictionaries. Owner-authored content stays in its original language; legacy specification headings retain existing translations/limitations. New vehicle field labels/options have explicit vi/en display mappings without changing persisted values.

- Scoped lint: no errors (existing raw avatar/preview image performance warnings).
- `node --test tests/listing-rental-details.test.mjs tests/listing-file.test.mjs tests/product-dates.test.mjs tests/security-hardening.test.mjs`: 13 passed. Includes actual PGlite JSONB persistence/update/readback, unknown-vs-zero, payload rejection, unchanged rent, optional vehicle fields, old CSV/spec compatibility and backend-only security grants.
- Real browser with labeled synthetic listing/API responses: 320/390/768/1440px detail overflow checks, owner editor 390px, existing rules/deposit loaded and editable, extras/fees rendered as information rather than fake checkout options. Screenshots under `output/product-depth/`; no production customer listing was created or modified for testing.
- Web production build verified. No native app archive or payment integration claim follows from these web checks.

## Operations

Owners fill `Thông tin thuê & điều kiện giao nhận` in the existing create/edit form. Missing fields remain visibly unprovided, not inferred. Free-form text must not include private address/identity numbers or unsupported protection promises. No bulk filling of existing customer listings.

Release follows encrypted source/database backup, candidate build, app health activation and Kubernetes renderer/static synchronization. Rollback restores the previous app image/source; new JSON data can stay and no database restore over newer transactions is needed. No paid service or destructive migration.

## Production verification

Build `S99sa9RzzNPds5TR4INHd` was activated and verified on both Kubernetes renderer pods. All 15 packaged source files matched local hashes; the matching JavaScript asset returned 200. Health and public listing API returned 200. Real public product detail showed the new rental-terms block at 320/390/1440px without horizontal overflow or browser runtime exceptions. Existing listings were not fabricated with example fee data. Evidence: `output/product-depth/release-verification.json`, `renderer-verification.json`, `production-terms-*.png`. Additional English fixture checks confirmed translated terms/extras/fees headings and no mobile overflow.
