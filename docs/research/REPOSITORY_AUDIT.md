# Repository audit — 22/10/2026

Source inspected, không tự xác nhận deployment. Repository có nhiều modified/untracked từ trước; không commit/reset tự động. Không tìm file Master Specification trong bounded repo file search. No Unreal/World changes.

| Thành phần | File/route/API thực tế | Trạng thái theo bằng chứng |
|---|---|---|
| Stack | package.json Next16.4/React19; App Router; server.mjs Socket.io | SOURCE_IMPLEMENTED; build trước đạt, build mới phải chạy |
| Web home | app/page.js → MarketHome → HomeDiscoveryHero/useListings | Catalog/rental/sale UI, chưa thể hiện 4 ngành, feed slice24 không cursor |
| Auth | lib/auth, security/authorization, proxy, auth cookies | SERVER_IMPLEMENTED; không role-switch demo như README, live credentials chưa test phiên này |
| DB | Supabase service client/pg, public schema privileges lockdown | Backend-only; schema additive, production DB phiên này chưa chạm |
| Storage | media/image WebP pipeline, HttpOnly/auth protections | SOURCE_IMPLEMENTED; import assets mới phải WebP |
| Rental | rent quote/inquiries, neighborhood SQL, dashboard/orders | SOURCE_IMPLEMENTED + local tests trước; full lifecycle real provider NOT_VERIFIED |
| Used sale | API purchases, purchase order state/version/SmartKey | SOURCE_IMPLEMENTED; negotiation offers absent in searched domain |
| Booking | lib/stays, 3 migrations, /api/stays | TEST_LOCAL; PGlite and synthetic fixed actor; production mutations503; no provider real |
| Host | 26-panel research; RELOO workspace + channels | PARTIAL_LOCAL; iCal text only, no scheduled OTA/AI/door delivery |
| Jobs | no domain before this change | NOT_IMPLEMENTED; UI coming soon to be explicit |
| Notification | unified center, server endpoint, outbox infrastructure | SOURCE_IMPLEMENTED; booking outbox not connected delivery |
| Payment | SePay verify/webhook/reconciliation in lib/finance | SOURCE_IMPLEMENTED, actual provider/hợp đồng/booking mapping NOT_VERIFIED |
| Mobile | mobile/capacitor.config.json loads https://reloo.vn | WebView shared runtime; Android/iOS real runtime sync chưa test bản mới |
| Admin/CRM | permissions/owner/admin/staff, audit/finance/legal | SOURCE_IMPLEMENTED; role scoped server, no new blanket grants |
| CI | .github/workflows/ios-simulator.yml dispatch | Chưa có mandatory product-rule and cross-domain workflow trước thay đổi |
| Capacity | SERVER_CAPACITY_20261018.md/results.csv | Prior measured workload125VU short/100VU soak, not2000 users or new booking/job workload |
| Staging | DNS lookup no returned record; no staging env credential seen; local docker command absent | BLOCKED_EXTERNAL; not deployed |

Conflict ledger: README calls full demo/PayOS/NFT fees; old architecture calls non-ecommerce. Retain history, mark deprecated scope. Không mở NFT/wallet hay coi phí demo cũ approved. Compliance old matrix has sources but not current article-by-article signoff: link legal register and gate features until review.
