# Product detail website update — 17 October 2026

> Latest implementation: [Rental selection and Account update](RENTAL_SELECTION_ACCOUNT_20261018.md). Dates now include HH:mm, handover respects owner choices, product/footer prices follow the configured billing unit, and a server-priced review precedes sending a request. The request remains pending owner confirmation, not a completed payment.

Reference inspected directly: https://www.mioto.vn/car/hyundai-stargazer-2025/KH37HM, desktop and 390px mobile. Reference screenshots: `output/mioto-desktop.png`, `output/mioto-mobile.png`, `output/mioto-mobile-booking.png`. No competitor assets, descriptions, prices, insurance claims or policies copied.

The existing `/product/[id]` route now has a full-width gallery followed by a content/booking layout. Desktop uses an image mosaic and sticky rate/request panel. Mobile uses one image, a compact section navigator and a fixed price/action bar. Existing `/rent`, waitlist, `/purchase`, authenticated inquiry chat, owner listings, rental history and measurement components are reused. A request is never labeled paid or confirmed. No date, total or deposit is invented before the existing rental flow computes it.

Files: `app/product/[id]/ProductClient.jsx`, its scoped `product-detail.css`, `components/listings/ProductGallery.jsx`, `lib/i18n/product-detail.js`. The gallery uses native dialog focus containment, Escape, arrow keys and explicit previous/next controls. Image fallback and empty reviews remain honest. The previous product-only unused spec/review markup was replaced; backend and policy calculations were not changed. No migration or paid service required.

New interface copy supports vi-VN/en-US via the shared account language provider. Seller-authored text and existing legacy category/spec components retain their stored/original language; this release does not claim to translate user content or all legacy components.

## Verification

Browser fixture is explicitly TEST, isolated locally at port 4528. No customer notification, order, payment or production record was created. `output/deployment/product-detail-browser.js` checks widths 320/390/768/1440 (document width equals viewport), desktop sticky versus mobile CTA, gallery navigation/Escape, rental login continuation, rented waitlist continuation, sale-only/missing image, very large price and English copy. Screenshots `output/deployment/product-detail-{320,390,768,1440}.png` and `product-detail-empty-320.png` were inspected. This is browser fixture verification, not proof of successful real payment or device testing. The isolated environment's unrelated business metadata endpoint returns 503; it does not supply this product fixture.

Scoped ESLint: zero errors, one raw avatar image performance warning. Security hardening and language persistence suites: 6 tests passed. `npm run build` completed with exit code 0, including compilation, TypeScript, 143 static pages and build traces. This was a local production build, not a production deployment.

## Deployment and rollback

Production deployment was blocked at verification time: Ubuntu/Tailscale offline, SSH handshake timeout; Windows server remains online. The owner confirmed Ubuntu itself fails to start with `Wsl/Service/CreateInstance/E_FAIL` (distribution error 6, failure step 2). Requested a physical C: free-space check and WSL shutdown/restart diagnostic, not reinstall/unregister. Microsoft's documented shutdown command stops WSL distributions and the lightweight VM without deleting them: https://learn.microsoft.com/en-us/windows/wsl/basic-commands#shutdown. The earlier language release must be inspected before proceeding (`/srv/reloo/backups/ui-language-1792233932090/release.log`). Do not claim either update is live without public verification. Before further image builds, check Windows physical disk free space as well as Linux filesystem space; an older recovery report showed low physical C: space.

Deploy these four files together with the pending shared language provider release. Stage/build before overlaying live files, preserve encrypted source/database backups and the running image tag, then switch the app only and verify product routes. No worker or database policy change belongs to the product UI update. Roll back app image/source if needed; do not restore an old database over customer transactions.
# Production completion

Deployed with shared notifications/language in release `unified-workspace-1792237444218`, build `CqjY10lEoP09fGhh70fPu`. Packaged product sources match local hashes and production health passed. Earlier outage notes below are historical. See `UNIFIED_NOTIFICATIONS_20261017.md` for release evidence and remaining host storage constraints.
> Updated implementation: [Experience and identity update](EXPERIENCE_IDENTITY_20261017.md). Product detail now includes real date selection, an inclusive rental-fee estimate and continuation into the existing request flow with dates/handover preserved. The panel appears before long content on mobile and beside it on desktop. Estimates are not payment totals or confirmed bookings. BOTH sale-to-rental switching and 320–1440 px layouts were checked in a real browser.

