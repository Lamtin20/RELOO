# Agoda and DMCA review — 7 November 2026

## Scope and compliance

Changed modules: public footer badge and backend badge WebP proxy. Provider remains DMCA.com; purpose is displaying a link to the provider's status, not certifying protection. No new user fields, browser script, cookie, provider or schema. The existing proxy sends the public canonical page URL as Referer. Rules reviewed: RULE-009/010/012/014/016/017/018/020. Asset source is the exact DMCA badge supplied by the owner, downloaded from https://images.dmca.com/Badges/dmca-badge-w100-5x1-09.png?ID=fe3278c5-9e96-4c76-a204-720c968aa755 and imported with scripts/import-web-image.mjs. Owner request establishes selection/provenance, not an independent license or legal approval.

## Agoda findings

Source: https://partners.agoda.com/Content/Documents/AffiliateLiteApi/Affiliate_Lite_API_V2.0.pdf

Despite the URL's V2.0 filename, the document itself is titled Affiliate Long Tail Search API and lists revision 1.0 dated 7 February 2018. It describes availability searches and Agoda landing links, not booking creation, payment, cancellation or booking-status APIs.

- Search by cityId or hotelId array with checkInDate/checkOutDate (YYYY-MM-DD), occupancy and optional childrenAges matching numberOfChildren.
- City search supports sorting, rate/star/review filters and maxResult 1–30. No pagination contract is established here.
- vi-vn and VND are listed. Results include hotel information, imageURL, dailyRate, crossedOutRate, ratings, breakfast/Wi-Fi flags and landingURL. dailyRate is described as “sell exclusive”; tax/fee inclusion and final payable totals require clarification.
- Authorization is siteid:apikey, not a documented Bearer or Basic token. Accept-Encoding gzip,deflate is requested. The header paragraph says credentials must match the body, but sample JSON omits credentials: resolve this inconsistency with Agoda.
- The listed endpoint is HTTP; the document explicitly directs partners to their account manager for HTTPS. Do not send real credentials to that HTTP endpoint or infer the current hostname.
- Handle both transport status and body error (example id 911/no results). Confirm quota, IP allowlist, retry/cache limits, current schema and credentials with Agoda.

Recommended RELOO integration: backend-only adapter with protected credentials; validated search inputs; live availability cards; validated HTTPS Agoda landingURL and disclosed affiliate handoff. Agoda completes booking/payment. Do not create a RELOO paid booking or guarantee inventory from search results. Confirm image usage/caching/derivative rights before importing through the existing WebP pipeline. Applicable future controls include RELOO-STAYS, RULE-001/004/005/007/009/010/012/013; contractual/privacy uncertainties are NEEDS_LEGAL_REVIEW. No Agoda integration or live credential test was performed.

## DMCA findings and change

The supplied status URL returned HTTP HTML showing Protection Status Unavailable, Account Status Non-verified, with a tooltip stating DMCA is attempting to confirm the specified page has a badge. This does not establish the exact reason or a verified protection status.

The supplied helper's static source only appends document.location as refurl to a.dmca-badge links at DOMContentLoaded when missing. RELOO already generates a sanitized public refurl and excludes private routes and query strings. Therefore adding this helper does not repair registration and is redundant for link construction; it may also expose query strings if used literally. No external script was added. Static analysis evidence is under ignored output/rea/dmca-20261107; raw provider responses and PDF under output/review-agoda-dmca.

Changed the upstream badge artwork and local WebP outage fallback to the requested 100×20 design. Preserved public-page validation, rate limits, image bounds, accessible name, focus indicator and 44px minimum target. A proxy image may affect vendor badge discovery; this is an inference, not a confirmed diagnosis. Provider-side account/page confirmation remains necessary. No production deployment or provider account modification was performed.

## Verification limits

See output/review-agoda-dmca/checks.log and compliance scan artifacts for executed checks. Typecheck (no configured script), browser desktop/mobile rendering, full axe accessibility and live provider indexing after deployment: NOT_TESTED. No release was attempted; release gate and shared-runtime synchronization remain required before deployment.
