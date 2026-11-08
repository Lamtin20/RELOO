# RELOO Real — tiến độ có bằng chứng

Ngày bắt đầu 22/10/2026 (Asia/Ho_Chi_Minh). Nguồn yêu cầu: [master prompt đã lưu](research/REQUEST_SUPERAPP_20261022.md). Phạm vi là RELOO Real, không phải World/Unreal. Trạng thái: nền A/B local đã triển khai/kiểm thử, B integrated staging đang BLOCKED_EXTERNAL; chưa nghiệm thu toàn bộ super app.

## Checkpoint hiện tại

- Đã đọc AGENTS, README, kiến trúc, security/compliance, capacity, mobile config, source route/API, CI và migrations. Không tìm thấy `RELOO_Master_Specification_v1.0.md` trong danh sách tệp dự án đã kiểm tra; không dựng nội dung giả.
- Xác minh Samsung SM-N950N qua REA/ADB. Có Mioto 5.3.1, Chợ Tốt 5.51.0, Small Jobs 1.2.4. Package query go2joy không khớp; chưa kết luận app không tồn tại dưới package khác.
- Thu nguồn chính thức Go2Joy/Small Jobs/Mioto/Chợ Tốt và metadata luật 91/2025 qua browser REA, lưu `output/rea/superapp/`. Phân biệt UI, policy và proposal trong `research/REFERENCE_MATRIX.md`.
- Bản booking các phiên trước: local PGlite, không thanh toán thật, không deploy; giữ nguyên và mở rộng có kiểm soát. Không gọi đó là staging.
- Không có credential staging được xác minh trong env phiên; workstation không có lệnh docker; truy vấn DNS `staging.reloo.vn` chưa trả record. Chuẩn bị config/runbook và preflight; không claim DNS/HTTPS/app đã hoạt động.

## Kế hoạch theo dependency

| Giai đoạn | Trạng thái | Điều kiện hoàn tất còn thiếu |
|---|---|---|
| A audit/research/rules | IN_PROGRESS | Bổ sung luồng Samsung và mapping evidence/test |
| B shell/home/staging/booking slice | IN_PROGRESS | Code + QA local; staging DNS/isolated resources/credential; real PostgreSQL race and sandbox provider |
| C booking vận hành | PARTIAL_LOCAL | Provider phòng/payment, policy chính thức, worker và UAT |
| D rental/nội khu | EXISTING_PARTIAL | Đối chiếu recovery/payment/dispute và full regression |
| E đồ cũ/offer | EXISTING_PURCHASE_NO_OFFER | Offer/reservation atomically, provider/legal gate |
| F jobs | NOT_IMPLEMENTED | Domain/schema/pipeline, employer verification + legal model |
| G cross-module/release | NOT_RUN | Staging đủ điều kiện, native QA, UAT; không tự production |

## Bất đồng tài liệu được phát hiện

README cũ mô tả demo role-switch/PayOS/NFT/escrow và kiến trúc cũ gọi không phải sàn TMĐT. Mã auth hiện tại dùng session server và kiểm tra quyền; legal matrix cũ chưa được xác nhận lại toàn bộ. Master prompt mới không cho mở rộng NFT/financial wallet và yêu cầu phân loại pháp lý theo hoạt động. Không xóa lịch sử; dùng rule registry và tài liệu sản phẩm mới làm mục lục phạm vi Real, link về engine hiện hành. Fee, SLA, hạn mức chưa duyệt = PROPOSED.

## Checkpoint code A/B đã bổ sung

- `lib/product/modules.js`, `components/superapp/*`, `lib/i18n/superapp.js`: 4 mini-app entry, shared intent routing; `/tim-kiem`, `/dang-tin`, `/giao-dich`, `/viec-lam` và GET `/api/superapp`. Home giữ module thuê cũ, feed dedupe và load-more hữu hạn trên dataset đang có. **Chưa có cursor backend feed mới**, không tự claim infinite catalog.
- BottomNav chung có 5 mục Guest/Account; admin giữ nav riêng. Header profiles cho màn mới; posting intent SALE khởi tạo composer nhưng không ghi đè draft người dùng. Booking `tab=orders` và incoming query nối chung entry.
- `lib/runtime/staging.js`, proxy/start-production/layout/robots, `deploy/staging/*`: preflight isolation + access/noindex/banner + image-digest app deployment preparation. Backend/DNS/TLS không tự được tạo bởi compose app.
- `lib/product/rules.json`: 17 rule đầy đủ trường/version/status; `scripts/verify-product-rules.mjs`, `scripts/check-source-secrets.mjs`, `.github/workflows/product-foundation.yml`. CI workflow đã viết, **chưa chạy trên GitHub** vì chưa commit/push; không gán kết quả local cho CI remote.
- New tests superapp/staging + regression17/17 đạt trong run đầu. Scoped lint0error; composer có warning `<img>` cũ. Secret signature scan1430source files pass trong run đã ghi; đây không phải full secret audit. Browser đang kiểm tra; build source cuối cần log kết quả trước checkpoint nghiệm thu.
- Kết quả cuối bộ đã chọn: **53/53 tests đạt**, scope superapp/staging + home/navigation/auth + security/booking/host/rental/neighborhood. **16 browser checks đạt**, 320/390/768/1440 và locale, intent/deep link. Artifact `output/playwright/superapp/tests.txt`, `browser.txt`, các PNG. Browser không giả response giao dịch; auth upstream của local harness unavailable nên không claim live authentication hoặc native pass.
- HTTP kiểm tra bằng `node:http` với Host staging.reloo.vn →503 + noindex khi thiếu cấu hình, local bình thường200. Preflight CLI exit1 đúng kỳ vọng vì không có staging env; lưu staging-preflight.json. Kiểm tra này không cần hoặc chứng minh hosted DNS/TLS.
- Source HEAD đầu vào `24c37bc` có nhiều uncommitted changes; không commit/push/deploy tự động. CI workflow chưa chạy remote. Build source cuối và hash được lưu trong output; kiểm tra log trước dùng artifact. Không có DB production/schema change trong phần A/B này.
- Build cuối **PASS** (Next webpack, TypeScript, static generation và traces), log `output/playwright/superapp/build.txt`; ảnh đã xem trực tiếp gồm home390/1440 và lịch iCal trước đó. Scope lint mới0error/0warning; full repository lint chưa được coi pass. Staging compose YAML parse PASS, Docker runtime NOT_RUN vì không có Docker CLI trên workstation.
- Đã kiểm tra thêm metadata nguồn truy cập deploy và biến User/Machine: không có build-publish password/Cloudflare API hoặc tunnel token trong các scope đó. Recovery store có Sunshine secret lịch sử, không phải credential staging được xác minh; không dùng nó để giả đủ quyền triển khai. Không mở prompt xin lại mật khẩu/OTP hoặc xuất secret ra chat.
- Samsung: Small Jobs splash/home/category sheet; Mioto home; Chợ Tốt feed. Tên tài khoản/task/notification counts được che trong artifact. Những luồng submit/hậu mãi chưa quan sát đánh dấu UNOBSERVED.

### Trở ngại thực sự cho lát cắt staging B

DNS lookup trả `DNS_ERROR_RCODE_NAME_ERROR` cho staging.reloo.vn. Không credential host/DNS đã xác minh trong process env. Cần dedicated auth/DB/storage/outbox resources, TLS/access password, sandbox provider và chính sách chủ sở hữu trước triển khai integrated booking. Có thể chạy code local; không mở stage simulator actor để lách auth thật. E/F và full B/C vẫn chưa được coi hoàn tất vì UI entry/rule spec không thay domain backend và sandbox integration.

## Lệnh tiếp tục

Đọc AGENTS + `RELOO_BUSINESS_RULES.md`, file này, rồi kiểm tra git status (repo có nhiều thay đổi người dùng từ trước, không reset/ghi đè). `npm run test:stays`; bộ superapp/rule/staging được ghi tiếp khi triển khai. Mỗi checkpoint phải ghi file/test/artifact thực tế, không đánh dấu PASS cho NOT_RUN. Không chạy deploy production hoặc test gửi tiền/tin/đơn thật.


## UI checkpoint ? 23/10/2026

Xem [RELOO_UI_REDESIGN_20261023.md](RELOO_UI_REDESIGN_20261023.md). Shared design/component refresh ?? tri?n khai local; 54 browser render checks v? 8 interaction checks PASS, 57 selected regression tests PASS. To?n b? 98 route/authenticated/native v?n PARTIAL; kh?ng b?o deployed. Build/lint xem artifact cu?i.

K?t qu? cu?i UI: build retry PASS (c?n advisory Next.js), scoped lint PASS; full lint FAIL 28 errors/63 warnings; final selected tests 76/76 PASS, admin fixture7/7. Xem checkpoint UI ?? bi?t gi?i h?n.


## Mini-app worlds ? 23/10/2026

Contextual service headers and domain navigation implemented for stays/jobs/rentals/used entry routes. Rental/sale discovery separated; job role URL-backed. UX-006 PARTIAL until shared detail/checkout/posting continuation and native acceptance. Selected tests35/35, browser22/22, scoped lint PASS. See RELOO_MINI_APP_WORLDS_20261023.md and output/playwright/mini-world-20261023/index.html. No deployment. Guardian prior source-bound approvals invalidated; dependency advisory unresolved.
