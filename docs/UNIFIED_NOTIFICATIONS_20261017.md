# Shared notifications and rental workspace — 17 October 2026

The bell now opens one account-scoped notification dialog over the current page. It does not navigate to another URL. Desktop uses a compact panel on the right; mobile uses a viewport-bounded panel. Native dialog supplies focus containment and Escape; the page behind it remains in place. Filters cover all/unread/transactions/news; unread badges and “mark all read” use the existing authenticated notification API. Loading, empty, error/retry, and guest sign-in states are distinct. New copy supports vi-VN/en-US; original event content remains in its stored language.

The existing neighborhood worker already writes in-app events into `notifications` (`neighborhood-jobs.sql`), so no second collector, inbox, polling service or notification migration was added. Known legacy event metadata is classified through the event catalog, so rental updates appear under Transactions, residency under Account and matches under Listings. Unknown metadata keeps its original type. Read mutations remain scoped to the server-authenticated user. The shared hook now has a bounded request timeout, explicit loading/retry and actor-isolated results. Notification links reject external schemes/protocol-relative/backslash/control-character destinations and normalize old workspace paths.

## Shared navigation and operations

| Previous entry | Current destination |
| --- | --- |
| `/notifications`, `/notifications/neighborhood` | Home opens the shared dialog and removes the legacy trigger query |
| `/dashboard/orders/neighborhood?order=…` | `/dashboard/orders?order=…`, existing authorized order actions embedded |
| Separate rental cards/menu entries | One “Thuê & cho thuê” card and shared status counts/list |
| `/dashboard/assets/neighborhood` | Shared assets page, optional rental schedule/handover settings |
| Separate neighborhood posting CTA | Main product composer; extra schedule/service-area settings in asset management |
| `/needs/neighborhood?need=…` | Shared needs page, existing proposal tools embedded |
| New event/deep links | Shared destinations; old links remain compatible |

`/noi-khu` remains a geographic finding/filtering surface labeled “Đồ gần bạn”. Residence verification, service-area constraints and private handover permissions remain meaningful settings; they are not turned into a separate customer class. Owner, needs and order embeds hide the old branded workspace header. No historical records or permission checks were deleted.

The order API reads both existing storage models, scopes each query to the authenticated renter/owner, preserves each workflow state and merges/sorts before shared pagination (30/page, maximum 100 pages). “CONFIRMED” is displayed as confirmed, never converted to “paid”. Overdue is derived separately without replacing the original state. An unavailable source produces an error instead of an incomplete success. Stable tie-breaking avoids duplicate page boundaries. Summary counts include both rental models, both request sources and pickup/return work. Missing counts stay unknown. Underlying state machines and financial/policy calculations remain separate and unchanged; UI unification is not a destructive database migration. No general-transaction payment reconciliation is invented.

## Validation

- `npm run build`: completed successfully locally before the final compact-card icon adjustment. Final source is built again in the production staging release.
- 14 tests passed: unified pagination/deep links, preserved confirmation/payment semantics, event classification, shared account counts, residence authorization/SQL persistence, security hardening. Scoped lint: zero errors; existing image/navigation warnings remain outside the new dialog.
- Browser fixture `output/deployment/unified-notifications-browser.js`: passed at 1440/390/320px, bell retains `/`, viewport bounds, Escape, read-all server response, error/retry, normalized order link, legacy inbox redirect.
- Browser fixture `output/deployment/unified-orders-browser.js`: passed at 1440/390/320px, exactly three transaction cards, two distinct storage-model orders in one list, no separate rental card, old URL redirected with filter retained.
- `notification-stress-browser.js`: English UI, 120 long notifications, 320×640 viewport; dialog remains between y=12 and y=628 with its own scrolling list and no horizontal overflow.
- Read-only PostgREST probes against the real production schema succeeded for both order queries and notification metadata, using an impossible probe actor and returning zero customer rows. The scheduled-order image relation goes through `nk_listings(assets(images))`; an initial direct join was caught and corrected before switching production. These probes validate schema/relations, not an authenticated customer transaction.
- Screenshots `notification-center-{1440,390,320}.png` and `unified-orders-{1440,390,320}.png` in `output/deployment/` were inspected. Fixtures use fake authenticated sessions and explicitly TEST content. No real customer notification, payment or order was generated. The isolated harness has unrelated unavailable business/security metadata services; these are not recorded as production integration passes.

## Release and storage recovery

Staged release manifest: `output/deployment/unified-workspace-runtime.json`. Includes the pending account language/provider and product-detail changes, plus this shared workspace. Language migration is additive; database lockdown runs afterward. Worker is not rebuilt: old worker deep links remain supported and normalized. Production checks are recorded after the staging build and switch.

Ubuntu came back online during this task. Physical Windows C: had about 58 MB free despite hundreds of GB appearing free inside Linux. Removed only old unused Docker build cache (no images/volumes/containers) and measured, rebuildable Windows npm/pnpm package caches (about 2.9 GB). Linux trim did not reclaim the host VHD allocation. Windows C: then had about 3.3 GB free. No personal files or transaction/media data deleted. Release build aborts if host free space drops below 1 GiB; requires more than 2 GiB initially. This does not claim the long-term host capacity problem is solved.

Encrypted source/database backups and the running-image rollback tag are made before switching. No production database restore is used for UI rollback. Old route aliases must be retained while historical emails/deep links exist.

## Production verification

Deployed successfully: build `CqjY10lEoP09fGhh70fPu`, release `unified-workspace-1792237444218`. Linux production build, TypeScript and 143 static pages completed; app healthy. All 60 packaged source files match local SHA-256 hashes. Language RPC exists; public-schema PUBLIC/anon/authenticated table grants remain zero. Public health is HTTP 200; orders, notification and account-language APIs return HTTP 401 without authentication. Evidence: `output/deployment/unified-workspace-verification.json`.

Real public-browser smoke (`public-notification-smoke.js`, no request mocks): 390px viewport, bell opens the dialog at x=12–378, document width=390, URL stays `https://reloo.vn/`; old notification URL returns to the same shared dialog. Screenshot `notification-production-mobile.png` inspected. This was a guest session; authenticated notification contents/read mutations were verified with the labeled local fixture, not a real customer's inbox. No notification was sent to a real user.

The pending language and Mioto-inspired product-detail sources are included in this same release. Physical C: remains about 3.1 GiB free; the build guard prevented unbounded growth, but long-term disk capacity/WSL VHD compaction remains an operations task.
