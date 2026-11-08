# RELOO marketplace design — 12/10/2026

The home screen now shares one implementation between web and Android. Rental, sale, affiliate and Local Brand have distinct entry points, labels and pricing. BOTH listings show the alternate purchase/rental price; choosing the sale feed shows the sale price first.

The cramped shortcut row is replaced by separate Shorts, cashback, income and safety sections. Mobile navigation uses Home, Explore, Post, Messages and Account; focused flows retain their contextual navigation behavior. Main navigation and category disclosure controls use the existing MIT-licensed Morphicons React integration, with Lucide data and reduced-motion support. Upstream was inspected at commit `38d2a7221633a453eeafebd872ee3649b9274b22`; the installed compatible version remains 1.7.1.

Category groups retain the requested horizontal swipe row. A native modal sheet adds illustrated, expandable groups and child-category chips, inspired by the supplied Chợ Tốt arrangement. The sheet traps focus, supports Escape and returns focus to its trigger. No competing application's artwork or branding was copied.

Local Brand is a separate CRM-managed partner registry. Under settings, staff with `content.write` can link a real shop profile and up to 30 sale/BOTH listings belonging to that shop. Public feeds display ACTIVE brands and only available, unlocked products that still belong to the registered shop. Version checks prevent stale edits. This is a first-party partner registry, not an unspecified external commerce API integration. No partner or product is fabricated.

Affiliate cards read the existing authorized catalog/feed and lead to the cashback workflow with the selected original URL. Purchase/payment remains at the merchant. Cashback percentages are displayed only when returned by the existing provider approval rules; no guaranteed reward is invented. Empty/error/retry states remain visible when no live feed exists.

Migration after the existing schema: `deploy/vietnam/local-brands.sql`. Source and database must be backed up before deployment. No Google/Gmail or eKYC blocker is resolved by this interface release.

Validation before deployment: 125 tests passed, production build passed, targeted lint had zero errors. Browser review at 320, 390, 768 and 1440 pixels showed no document overflow. Category expansion, Escape dismissal and focus restoration passed. Affiliate fixture data was intercepted only in the local test browser; it was not written to production. Post-deployment Samsung review and release details are appended after verification.

Release verified on the physical Samsung SM-N950N: viewport and document width both 411px, one category row, all category illustrations loaded, all five navigation items inside the viewport. Home, Explore rental/sale filters, rental request, product, posting, clip creation and account routes were reviewed after deployment. Focused routes retained their own navigation. Android hardware Back closes the category sheet, stays on the home route and restores focus. Shorts, cashback, income and safety sections were visually reviewed on-device. Morphicons SVG paths changed during interaction; reduced-motion configuration was checked.

Android `1.0.1-beta.20261012.2229` / versionCode `29863649` was built, published, installed and opened. Server app is healthy; the Local Brand migration committed. All 24 release source files matched the server SHA-256 audit. Source/database backups are under `/srv/reloo/backups/market-design-20261012`; earlier backups remain intact.

Production currently returns no published Local Brand partners and no connected affiliate product feed. The app displays accurate empty states; actual partner onboarding/catalog authorization is still required to populate those sections. No purchase, message, listing or partner record was submitted during UI testing. These checks cover the reviewed routes and conditions, not a promise that every future device/network condition is error-free.
