# Product images, rental calendar and search filters — 18/10/2026

## Reference and scope

REA runtime captures on the connected Samsung running Mioto are retained under `output/rea/mioto-calendar-20261018/`: home context, date-range screen, separate pickup/return time sheet and search results. The user's two screenshots provide the product calendar and grouped search reference. These observations establish layout/interaction, not every Mioto pricing, cancellation or insurance policy. No booking, payment, message or competitor image import was performed.

RELOO keeps its existing web/application shell, rental request route, backend quote/digest, auth, owner handover terms and DAY/WEEK/30-day-MONTH pricing. This update does not introduce hourly billing, instant-book promises, insurance, invented availability or copied car-specific restrictions. The installed Android shell uses the same website; this is not a new native iOS release.

## Changes

- Shared `RentalCalendar`: Monday-first, scrollable months, start/end range highlighting, HH:mm selects, sticky summary/apply, current-date marker, past-date disabling, range reset, cancel/Escape, safe-area and short-landscape layout. Calendar prices are labelled indicative; owner confirmation remains explicit. No invisible date/time input overlay.
- `RentalSelection`, product CTA and rental request reuse the calendar. The first Choose rental click opens it when dates are missing. Applying updates the existing subtotal; the next step retains server quote validation. A delivery-only listing selects its allowed method rather than an invisible pickup option.
- `ExploreFilters`: area/time summary; actual category-group chips; newest/rating sorts; budget presets and numeric bounds; optional consent-scoped recent search terms; sticky reset/results. Draft changes apply together. Opening the existing location picker suspends and resumes the filter with its draft, rather than putting a div overlay behind a native dialog.
- Rental search selection is carried in URL parameters to product detail and confirmation. Browser back/reload retain it. Reset clears the date parameters as well as legacy estimated duration. Dates in discovery are requested dates, **not a claim that every result has a verified open calendar**.
- New copy uses vi-VN/en-US registries; old unrelated screens are not claimed fully translated.
- Calendar date grid uses a separate class from Rental Care's settings grid; 320 px cells measure 44 px wide. Native Android Back targets the innermost open dialog so a calendar opened from filters closes before the filter draft is discarded.
- Open dialogs expose modal state to the existing native runtime-refresh guard, preventing a background/resume build check from reloading a filter draft. Weekly/monthly rates appear in the period-rate heading, not repeated as if they were daily cell prices.

## Image cause and repair

A real browser audited the current public bootstrap image references. Fourteen original Unsplash images loaded; eight URLs returned HTTP 404, confirmed separately with HTTP requests. Valid images were downloaded unchanged in subject and imported through `scripts/import-web-image.mjs` into 14 WebP derivatives under `public/images/listing-legacy/` (806,188 bytes total). Only those exact legacy references are mapped; other owner uploads/media are retained.

`ListingImage` now bounds pending loads outside cards too. Gallery hero/lightbox try remaining images rather than rendering a single failed source indefinitely. Known 404 references are excluded from the displayed gallery and SEO image array. Invalid/nonarray data becomes an explicit missing-image state. No generic/AI photo is substituted as the actual product.

`listing_009` and `listing_012` have no surviving original image in the audited set. Their interface works and shows the missing-image state; recovering the actual image requires an original/new owner upload. Other affected multi-image listings use their surviving originals. Provenance/status evidence: `output/product-calendar/image-provenance.json`, `broken-image-status.json`, `image-audit.txt`.

## Verification

24 targeted automated checks passed: date/timezone/leap/year boundary, same-day/reverse/restart range, malformed/missing/past/oversized range, 24-hour rounding, owner handover, week/month price contract, server quote changes, backend-only security and language preference persistence. See `output/product-calendar/tests.txt`.

Browser fixture checks use clearly synthetic bootstrap and quote responses, with no real inquiry or payment submitted:

| Context | Evidence / result |
|---|---|
| Missing first image, valid second | Hero loads second source |
| Product CTA → calendar → 21:00/20:00 → review | 23-hour range billed one day; times and totals retained |
| Group + budget + calendar filter | Applied URL/result count/product link match selection |
| Location picker from filter | Picker interactive; query/chip draft survives return |
| Escape from nested calendar | Filter stays open |
| Invalid price bounds | Apply disabled with inline error |
| Reset | Clears selected date/filter URL parameters |
| Same-day return before/after pickup | Invalid blocked, valid allowed |
| Malformed date/time URL | Product still renders; calendar sanitizes invalid values |
| English | Calendar/filter/sort labels translated |
| 320/390/768/1440 | No horizontal page/dialog overflow |
| Landscape | Calendar fits viewport; compact footer |

Screens and detailed results are in `output/product-calendar/`. The fixture server's unrelated Business/History provider endpoints are unavailable; these are not described as integrated tests. Actual public pages/images and read-only quote are checked separately after rollout. No real iPhone/Safari device result is claimed.

No production schema migration or changes to existing agreed order prices, deposit policy or permissions. Rollout uses the existing staged build/encrypted backup and rollback process; Kubernetes/static archive are checked after activation.
