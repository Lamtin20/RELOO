# Production release — 17 October 2026

User explicitly authorized completing and deploying all accumulated changes. This supersedes the earlier “not deployed / server offline” notes in feature acceptance documents; historical test/native limitations still apply.

Release source: 1,399 reviewed-path files packaged without env files, signing material, credential XML, node_modules, build caches or local data. Existing production compose/network/secrets were retained. Source and PostgreSQL backups were encrypted with the existing server backup passphrase. Before changing the live DB, a separate database was restored from that backup and all migrations were applied successfully. App and worker images were built while the previous containers served traffic.

Included: CRM account header/grouped menu, news freshness guard, news/performance changes, Nội Khu search and common workspaces, home banner/menu icon, residence self-declaration, quick rental/loading, Rental Care/calendar and personalization source, operations control center, traffic/seller analytics initial reporting and 429 cooldown, mobile/iOS source preparation and public asset changes.

## Source and schema

The additive migration order is recorded in `output/deployment/full-release-migrations.json`. `security-lockdown.sql` was applied last. Production validation observed zero public-schema table grants to PUBLIC/anon/authenticated, the seven-day publish trigger present, and a recent operations heartbeat. No synthetic residential areas, residents, rentals or analytics sample records were inserted in production.

Production flags enabled: `RELOO_NEIGHBORHOOD_ENABLED`, `RELOO_RENTAL_CARE_ENABLED`, `RELOO_PERSONALIZATION_ENABLED`, `RELOO_PRODUCT_ANALYTICS_ENABLED`. Calendar still requires a real per-user grant/provider configuration; personalization and optional analytics still require their respective consent. Enabling feature flags does not grant consent or make unconfigured providers operational.

News source window is now 168 hours, with database guard rejecting stale/undated publication. Existing paid-news limits/provider configuration remain in place; this release did not raise budgets or grant additional paid API access.

## Verification and limitations

- 61 selected regression tests passed before deployment; the anonymous-access correction additionally passed 30 Neighborhood/Rental Care regression tests.
- Server build succeeded for Next.js app and operations worker. Public health/runtime/home/Nội Khu/login endpoints responded successfully. Seller/CRM private APIs returned 401 without login. Test fixtures were not visible in public responses.
- Browser verified the real production home banner at desktop/mobile, opened Nội Khu, and checked no horizontal overflow. Production CRM after MFA requires the user's own legitimate session; no user OTP/session was impersonated for visual checks.
- Real browser cookies exposed an anonymous-access defect: consent cookies incorrectly triggered account lookup for the public Neighborhood catalog. A follow-up patch checks actual auth cookies and permits anonymous fallback only for 401 on public reads. Anonymous production visitors no longer poll account-scoped personalization every 15 seconds.
- Worker maintenance retains old journey v1 events for 30 days and new v2 product analytics under the documented 90-day retention job; no existing financial retention policy was changed.
- Production residential catalog is currently empty. The page explains manual contributions/review; no fictional “active” area was created to make the page appear populated.
- Analytics deployed is initial internal product reporting/SEO review/link tooling, not full Search Console, bank-reconciled revenue, independently verified AI coverage, linked conversion-funnel reporting or complete infrastructure observability. The UI distinguishes unavailable data and sources; those remaining adapters are not claimed complete. AI product-copy drafts remain unavailable until a scoped provider/budget is configured. Historical news reporting remains the shared Knowledge Hub path.
- DMCA certificate still unverified/unconfigured; no Protected badge is fabricated.
- iOS source is on the server with the release, but Windows cannot compile/sign/archive or publish an iOS app. No App Store/TestFlight release occurred. The previously built Android app loads the new remote website when refreshed; native binary changes require distributing/installing the test APK separately.

## Evidence and rollback

`output/deployment/full-release/runtime.json` identifies the backup/staging directory; `verification.json`, final logs and live screenshots contain review evidence. Original build before release: `GQ2Y2LUiM3dVdfjJqZapU`. The initial new build was `H5qPq7UpIGB65CAmOoX_0`; the final anonymous-access patch has its own runtime ID in the final verification.

Final production build verified: `IXVq4u6PkB7skrXqnEpLv`. Banner, login and Neighborhood were viewed in the public production browser. After rejecting optional cookies, the catalog returned 200; over a 16-second check anonymous personalization requests were zero. Neighborhood loading ended with its truthful empty-catalog state and no error banner. The development preview renders the production notFound/noindex fallback without simulated data; Next.js streaming can return HTTP 200 for this fallback.

Backup image tags and encrypted source/database snapshots are retained on the server. Prefer reverting images/source and disabling new entry flags if necessary; do not blindly restore an old DB snapshot over new customer activity. Migrations are additive. The temporary database clone was dropped after verification. No public-management ports, Docker socket exposure, direct client DB access or production secrets in frontend were added.
