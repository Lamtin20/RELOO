# RELOO Real — product specification v1

## Private confirmed location — 7 November 2026

Latest owner revision: street and house number/recognizable address are mandatory (text accepted for house/landmark). Remove entrance-photo collection and the pin-confirmation checkbox. GPS permission/freshness/accuracy remain required; location selection does not need another tick. Legacy photo deletion remains available. This supersedes the photo/checkbox behavior described below.

Onboarding and the saved profile address support a private confirmed home/entrance pin, written address, user instructions and optional owner-only WebP photo. New listing creation and rental inquiries require explicit GPS permission/sample with client-reported accuracy strictly below 20m and age at most five minutes, plus pin confirmation. Manual/search corrections remain user-declared with unknown measured accuracy; GPS is not anti-spoof attestation. Previously saved private coordinates can prefill empty publishing/rental controls without replacing edits; GPS permission and confirmation must be renewed for the action. Rental handover-point sharing requires a separate acknowledgement. Public map/catalog projections continue to omit private coordinates/photos. Conditional 3D buildings, uncertainty area and route preview reuse MapLibre/provider adapters. Implementation scope, reviews and evidence are in `docs/PRECISE_LOCATION_IMPLEMENTATION.md`; no production or real-device accuracy acceptance is implied.

## Photon scheduled freshness — 7 November 2026

Vietnam Photon data refresh is scheduled for Monday 00:00 Asia/Ho_Chi_Minh using a prepared systemd timer. Download only changed upstream snapshots, verify checksums, build in isolation, validate and atomically switch A/B slots; preserve the previous index on failure. Read-only admin status distinguishes last check from unverified timer activation. Implementation and offline transaction tests exist; production Docker/systemd operation and activation remain NOT_TESTED, subject to the existing release gate. See `docs/PHOTON_WEEKLY_UPDATES.md`.

## Mandatory Live Map direction — 7 November 2026

The owner's RELOO LIVE MAP ENGINE v1.0 request extends Phase 1 to shared OSM/MapLibre discovery, publishing, spatial search, public/private coordinate separation, realtime changes, licensed geocoding/routing and domain integrations. This existing product specification remains the canonical repository source; `RELOO_Master_Specification_v1.0.md` was not found and no competing master document is created. Requirements and measured acceptance are tracked in [LIVE_MAP_IMPLEMENTATION.md](LIVE_MAP_IMPLEMENTATION.md). Existing business scopes below are preserved.

Phase 1 overall status is BLOCKED, not complete: marketplace map infrastructure is implemented locally; licensed tile/geocoder/router access, reviewed staging/backfill and currently unsupported live stays/jobs/coverage/handover integrations are dependencies. UE receives a versioned public contract only until actual UE tooling exists. Privacy, real inventory/price authority, provider attribution and current-source Guardian approvals are mandatory. No map or listing code is deployed merely because unit tests pass.

Subsequent owner constraint: all map services must use free software/data. Selected implementation is self-hosted Martin/tilemaker + regional OSM data, Photon Vietnam geocoding and OSRM driving. See [FREE_MAP_STACK.md](FREE_MAP_STACK.md) for pinned sources, private-network configuration and measured local verification. No paid provider activation is authorized by this direction; hardware usage and ODbL/software notices remain applicable.

Đề xuất sản phẩm 22/10/2026. Nguồn phạm vi mới nhất: master prompt người dùng, không phải chính sách đối thủ. [Tiến độ thực](RELOO_PROGRESS.md), [rule registry](RELOO_BUSINESS_RULES.md), [inventory](research/REPOSITORY_AUDIT.md).

## Domain và sitemap

RELOO dùng modular monolith Next16/React19, backend API chung; Capacitor tải web runtime. Một tài khoản, quyền server theo scope/ownership/CRM; đổi UI không cấp quyền.

| Domain | Khám phá | Quản lý | Giao dịch |
|---|---|---|---|
| Đặt phòng | `/dat-phong`, branch dài hạn chưa giao dịch | `/dat-phong/quan-ly`, `/dat-phong/chu-nha` | Booking riêng, hiện local test |
| Thuê đồ | `/explore?transaction=RENT`, `/product/[id]` | `/lend`, `/dashboard/assets` | `/rent/[id]`, `/dashboard/orders` |
| Đồ cũ | `/explore?transaction=SALE`, product | Composer dùng mode SALE/BOTH | `/purchase/[id]`, `/dashboard/purchases`; offer chưa có |
| Việc làm | `/viec-lam` với tìm việc/tìm người | Gate chưa mở tuyển thật | Ca tách full-time; chưa có pipeline |
| Chung | `/`, `/tim-kiem`, `/dang-tin`, `/giao-dich`, `/account` | Chat/notifications/support/profile | Điều hướng đến domain gốc, không ép mọi đơn chung schema |

Trang chủ vùng đầu có 4 entry rõ. Tìm chung cho chọn ngành khi mơ hồ, giữ query/location; không sort cross-domain theo giá. Feed thật phải cursor/tie-break ổn định, dedupe, kết thúc, retry/load more, ảnh lazy và back restore. Không tạo infinite data từ fixture. Trang chủ giai đoạn đầu tận dụng catalog hiện có, phân loại kết quả và giới hạn minh bạch; pagination mới không được ghi hoàn tất nếu vẫn tải bootstrap cũ.

## Booking slice B/C

Partner draft → room types/units/media/policy → admin approve → catalog → server quote → hold TTL → sandbox payment or host confirmation → confirmed → checkin → checkout/cancel. Snapshot price/policy, độc lập order/payment/refund, outbox. Local harness không phải hosted staging và không dùng identity thật. Production fail closed cho tới khi provider/policy/legal và migration QA được duyệt. Đọc `BOOKING_DESIGN_20261022.md` và `BOOKING_HOST_REFERENCE_20261022.md` cho implementation đã có; các state chưa có không được suy là implemented.

Long-term housing riêng viewing/proposal/rights/contract/deposit/handover/recurring rent/renewal. Chưa có hợp đồng/ops: chỉ thông tin, không tự checkout theo giờ.

## Rental / used goods / jobs

Rental reuse engine, calendar, handover/dispute; không đơn phương khấu trừ cọc và không áp bảo hiểm xe cho đồ. Đồ cũ rao vặt phân biệt processed purchase; offer accepted không paid/sold, reservation TTL tạo atomic khi checkout theo policy đề xuất. Jobs worker/employer, skill/privacy, lương/unit/ca/headcount rõ; không đặt cọc nhận việc; Full-time application/interview/offer riêng. Legal model jobs NEEDS_LEGAL_REVIEW trước release.

## Ngôn ngữ và thông tin

LocaleProvider vi/en, VND integer, business timezone VN, UTC persistence. Public/private separation; không review/count/verification giả. Empty/error/offline/stale/permission/processing đều có action hợp lý. CTA retry không tạo duplicate. Các màn chưa provider hiển thị coming soon, không fake success.
