# Mini-app worlds ? 23/10/2026

Status: PARTIAL ? local implementation, no deployment.

User direction: entering a mini app should feel like entering its own service. Changes add a contextual service shell with clear RELOO exit, account entry, own navigation and restrained service accent. Same RELOO tokens/auth/backend are retained; no parallel system or dependency was added.

- Stays: find stay, my bookings, host management; existing preview/readiness remains explicit.
- Rentals: rental results, list an item with RENT intent, rental orders; shorter/longer rental choices remain within rental mode.
- Used goods: sale results, post SALE intent, purchase orders; no rental period input.
- Jobs: worker/employer navigation updates URL and active state; remains coming-soon, no fake applications/payments.

Rule UX-006 and tests/mini-app-navigation.test.mjs define explicit route context and domain separation. Test is included in product foundation CI. Status remains PARTIAL because shared account/product detail/checkout/posting routes have not yet received end-to-end domain continuation; no new persistent context or sensitive storage was introduced. Search/filter query state stays in existing routes; homepage scroll restoration and native back are not accepted by these unit tests.

Compliance impact: RULE-004/006/014/015/016/018/020 plus product controls. No new personal-data purpose, SDK, prices, policies or schema. Existing Guardian source-bound evidence expires after these changes and must not authorize release. Static scanner/gate output is saved with UI artifacts; no legal approval inferred. Dependency advisory remediation remains separate and outstanding.

Source: components/superapp/MiniAppNavigation.jsx, mini-app.css, lib/product/mini-app-navigation.js, MarketplaceShell, ServicePages and DiscoveryIntent. No WebP imports needed.

Evidence: output/playwright/mini-world-20261023/. Selected regression35/35 PASS; scoped lint PASS. Browser/build outcome recorded at final checkpoint below. Domain permissions, live transactions, all authenticated flows and deployed native clients are not asserted.

Final checkpoint: browser22/22 PASS, 12 screenshots; selected regressions35/35 PASS; scoped lint PASS. Build retry exit0, compile/TypeScript/153static pages/traces PASS; initial build stopped on Next security advisory, which remains unresolved. Guardian rerun with current dependency evidence: BLOCKED exit1, 1critical/9high advisory package records; old source-bound approvals remain invalid. No deployment. Screenshots reviewed: rentals390, used1440, jobs390.


## Continuation implementation ? 23/10/2026

`app` URL context now recognizes shared product/rent/purchase/checkout/account/auth/dashboard/help/owner routes only. Validated `returnTo` accepts only a home route belonging to the same mini app, capped at2400characters; never admin/external. Anchor hrefs and imperative business navigation preserve context, including encoded sign-in next. Checkout alias preserves query rather than dropping dates/context. No business permission derives from a query parameter. Global RELOO exit remains untagged.

In-tab discovery scroll cache preserves exact query route positions without cookies/storage. Purchase draft uses bounded tab memory (50entries,20min TTL), actor/item isolation, copied values and clear on server-confirmed completion. Address is not placed into URL or persistent browser storage. Explicit limitations: full reload/OAuth document navigation loses ephemeral draft, actor change does not silently inherit another actor's private draft. Rental sign-in resume keeps its existing separate validated token/expiry mechanism.

Guest dashboard, account and auth retain the service frame. Product/rental fixed CTA keeps its own space rather than overlapping mini-app navigation. Regular navigation and direct deep links are covered; all authenticated backends/native clients still need actual authorized acceptance. The browser script uses clearly labeled synthetic catalog data and never creates an order/payment.

Rule UX-006 version1.1.0 remains PARTIAL for the actual/native/provider and cross-reload draft limits above. This is separate from release/legal approval.


## Explicit sign-in draft handoff (supersedes earlier reload limitation)

Purchase sign-in now creates a random resume handle only after the user submits the sign-in action. SessionStorage holds only listing/mode/address/time/version, capped10entries and20min, no credential. URL contains only the handle and validated mini-app context, never the private address. Full document return restores the draft; authenticated actor return consumes it. Wrong item, expired/future/malformed payload is discarded. Failure to persist shows an actionable error; storage cleanup failure cannot hide a server-confirmed order. Repeated purchase submit is locked while pending, and UI success requires a server order ID.

Ordinary account navigation still uses bounded actor-scoped tab memory. Automatic actor switching does not copy private drafts; only an explicit sign-in resume grants handoff within that tab. The actual external OAuth flow and deployed native clients remain separate acceptance; browser test simulates the session response without submitting credentials or any transaction.

UX-006 v1.2.0, tests/purchase-resume.test.mjs. Purchase labels and submission/error state now use vi/en locale. No payment/price/policy/backend permission changed.
