# RELOO storefront refresh — 7 November 2026

## Direction

Owner request: make RELOO feel deliberately designed, visually clear and less generically AI-generated. This implementation starts with the public homepage and its shared category entry. It is not a completed redesign of every authenticated, admin or native screen.

Use the existing Be Vietnam Pro font and RELOO palette. The home canvas becomes white, primary green marks actions and the second heading line, and line dividers replace repeated rounded pastel containers. Home header corners become square intentionally as part of the requested redesign. Styling is scoped to `.app-shell--home` in `app/home-studio.css`; category layout remains a CSS Module.

- Hero combines a large two-line heading, a short practical introduction, search and an existing camping photo with a real category destination. Desktop uses an asymmetric two-column layout; mobile uses a small image alongside its caption.
- Four services use existing Lucide icons, readable labels and explicit preview/coming-soon states. Their search and posting destinations remain unchanged. No new claim that stays or jobs accept live transactions.
- Main categories use line icons instead of generated 3D thumbnails. Pending-link overlays must retain transparent backgrounds so old global category styles cannot obscure labels and icons.
- Discovery uses a clear heading and links aligned along one divider. Secondary promotion blocks lose multiple competing pastel surfaces. The neighbourhood entry becomes a compact text feature. Rental benefits become six numbered text entries, removing decorative image downloads.
- New hero and discovery copy lives in the existing locale flow, with Vietnamese and English variants in `lib/i18n/home-design.js`. Existing content elsewhere retains its existing translation coverage.

## Affected modules and compliance scope

Files: root layout CSS import; SuperAppEntry; MarketHome; MainCategories and its CSS Module; RentalBenefits; new scoped stylesheet and translation dictionary.

Data/purposes/providers: no new collected fields, storage, external script, credentials, analytics or API provider. Search continues to use the existing service routing. Lucide icons use an existing dependency. The hero reuses `public/images/reloo-camping.webp` already in the repository; no raster was downloaded or generated. Its use is illustrative rather than evidence of a real listing, property, customer or testimonial. Existing repository presence does not independently prove a license; accountable provenance review remains necessary before release. No approvals are invented.

Affected rule IDs: RULE-007 (clear purposes), RULE-010 (asset provenance), RULE-012 (truthful copy and service readiness), RULE-014 (image alternative text), RULE-015 (existing contrast tokens), RULE-016 (keyboard and target sizes), RULE-018 (consent controls retained), RULE-020 (source-bound release evidence). Existing authentication, private data, booking/payment logic, legal policies and consent loader are not changed.

## Validation evidence

Local browser: `http://127.0.0.1:4537/`. Captures, browser check program, source checks and build log: ignored `output/playwright/reloo-studio-20261107/`. Baseline screenshot: `output/playwright/reloo-before.png`.

Run targeted ESLint, existing superapp/home discovery/mobile navigation/palette/market design/security/free integration regression tests, production build, `npm run compliance:scan` and `npm run test:compliance`. Browser coverage checks 320/390/768/1440px in Vietnamese and English, horizontal overflow, hero image/alt, transparent category feedback, search routing, visible service readiness, keyboard focus and reduced motion. This is bounded QA, not a full accessibility certification.

NOT_TESTED: authenticated role journeys, all remaining application routes, actual iPhone/Android hardware and offline/already-open WebView refresh, full axe/screen-reader audit and production runtime consistency. No production release performed. The required compliance release gate and shared-runtime synchronization apply before any deployment; missing approvals must not be bypassed.

Recorded outcomes: targeted ESLint passed without findings; 27 selected regression tests passed; all 48 browser assertions passed with zero captured page exceptions; 12 compliance tests passed. The first browser pass exposed a border-only legacy focus rule; the final scoped keyboard rule restores a visible outline. The initial production build passed compilation, TypeScript and static generation; `build-final.log` covers the final CSS correction. Compliance scan reports six findings and NEEDS_REVIEW due to missing release evidence/approvals, not a release clearance. Screenshots depict the local environment's empty catalog, not a populated production catalog.
