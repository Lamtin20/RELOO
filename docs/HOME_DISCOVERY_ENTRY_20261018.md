# Home → Discovery entry — 18 October 2026

The supplied Mioto screenshot informs the large photo hero, centered concise message and overlapping search card. Historical REA evidence `ev_c559b030e97a3950d4bf00a7cc89b7407e73d1faffd778e0841bf846b89f1613` observed the public Mioto desktop homepage. A fresh REA scenario failed; it does not establish new behavior. Reference notes/failure are under ignored `output/rea/home-entry/`. RELOO uses its existing WebP campaign photo, identity, React/Next stack, location store and calendar, not Mioto images/code or car-specific policies.

## Behavior

- Home is an entry point: RENT / SALE / ALL, optional query, manually chosen area and optional complete rental date/time range. Submit opens the existing `/explore` route with normalized URL parameters.
- No selected location remains usable: show global results sorted newest, without fabricating a location or requesting GPS. A selected province/ward is carried as explicit filters; dates use the existing Asia/Ho_Chi_Minh calendar and duration rules.
- Changing to SALE or ALL omits rental date/time/duration parameters. Switching back to RENT retains the draft locally in the mounted page. Expired/incomplete chosen rental dates cannot silently submit as valid. No default rental date, amount, deposit, availability or booking is invented.
- Home module links now open full Discovery views. RENT/SALE/ALL reuse existing filters; BRAND/AFFILIATE use explicit `channel` views and the extracted existing PartnerFeed APIs. Partner views do not pretend to apply generic rental/date/geographic filters to external merchant offers. Existing category/product routes remain.
- Home has one search form: the duplicate header search is omitted on Home, retained on Explore/other pages. Account/location/header actions remain. Mobile layout is compact; at 320×740, the primary search button is above the bottom navigation.
- Existing CMS `home_top` banners retain their placement below the new hero, without replacing its functional search controls. Video remains paused; the previously removed owner CTA is not restored.

## Modules

`HomeDiscoveryHero.jsx` + module CSS: hero and accessible intent/search controls. `lib/search/home-discovery.js`: canonical shared destination builder, no provider calls or analytics. `lib/i18n/home-discovery.js`: new vi-VN/en-US copy. `PartnerFeed.jsx`: existing partner rendering extracted from Home; error payload validation added. `PartnerDiscovery.jsx` + ExploreEntry wrapper: explicit partner catalog route, without changing normal Explore hook order. Header/AppHeader/MarketHome and shared channel-link styling integrate these pieces.

No schema migration, secret, paid service or new raster asset. Existing WebP photo is `/images/refresh-20261018/campaign-rent-wide.webp`. No auth, prices, fee, privacy or transaction-policy changes.

## Actual checks

23 automated tests passed (destination/query/location/date rules, calendar/rental-selection regressions and security baseline). Browser fixture checks exercise unspecified area, explicit province/ward, HH:mm dates, product deep link and back, sale, partner views and failed-source retry. Invalid/expired selection unit checks reject navigation. Enter in the calendar does not accidentally submit Home. There were zero browser page errors or automatic GPS requests in these fixtures. Fixture product/partner data is not production inventory.

Screenshots were captured and viewed at 320/390/768/1440 px. No horizontal overflow; one search form; CTA stays above the bottom navigation at the checked sizes. Evidence is under ignored `output/home-entry/`. Existing legacy modules retain some Vietnamese copy; this is not a claim that the whole app is newly translated. Live build, exact renderer verification and production/Samsung read-only checks are recorded separately there after release. No real listing, message, SMS, purchase or rental is submitted in these tests.

## Release

Use the existing encrypted backups → isolated production build → healthy activation → K3s renderer synchronization → exact build/static asset verification procedure. No database mutation/migration required. Rollback restores the prior application image/source; never replace live transactional data. Existing mobile Capacitor app receives shared web content; no new APK/iOS archive is claimed.
