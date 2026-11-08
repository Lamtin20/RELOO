# RELOO Real · bàn giao bản thử Đặt phòng

Trạng thái ngày 22/10/2026: **prototype chạy local + nền tảng SQL, chưa hoàn tất phân hệ thương mại**. Không triển khai, chưa apply schema lên backend thật. App Android/iPhone hiện vẫn tải `https://reloo.vn` và chưa nhận bản sửa local này.

Tham chiếu: [khảo sát và bao phủ Dayladau](BOOKING_REFERENCE_20261022.md), [thiết kế/nghiệp vụ/state machine/API](BOOKING_DESIGN_20261022.md). Ảnh tham chiếu chỉ nằm trong ignored `output/rea/dayladau/`; không nhập ảnh/giá/tồn tham chiếu vào sản phẩm. UI minh họa dùng CSS, không thêm raster public.

Bổ sung phiên khảo sát Host: [26 panel editor, wizard, rule và kết quả triển khai](BOOKING_HOST_REFERENCE_20261022.md). Màn `/dat-phong/chu-nha`, migration channels thứ ba, kiểm thử iCal/external inventory và rule check-in nằm trong báo cáo đó. Các số kiểm thử ở các đoạn dưới là kết quả đợt đầu; xem kết quả bổ sung trong `output/playwright/stays-host/`.

## Những phần đã chạy

- `/dat-phong`: entry từ Header và MainCategories; ba cơ sở tổng hợp có nhãn demo; tìm theo nơi/sức chứa, lọc tiện nghi, sắp giá, lưu trong phiên; chi tiết, giá thử, policy, consent, hold 10 phút, thanh toán thử, đơn/deep link, cancel-preview và hoàn thử. Cơ chế locale có sẵn, không tạo language state riêng. Không thu thập tên/điện thoại/CCCD khách trong demo.
- `/dat-phong/quan-ly`: dữ liệu thử về cơ sở draft/submission/suspension; loại phòng + unit; giá versioned; khóa/mở lịch và audit; list đơn và chuyển trạng thái theo scope/time. UI admin duyệt/CRM chưa nối: RPC approve có server-admin guard và được kiểm thử SQL, không có client tự nhận admin.
- Hai migration additive `20261022120000_room_booking.sql`, `20261022121000_room_booking_management.sql`: RLS, backend-only RPC/tables/sequences, type row lock, snapshot quote, actor-scoped idempotency, one quote → one order, payment event dedupe, late money → review, audit append-only, outbox unique. Có khóa lịch và vệ sinh; unit inventory khác room type.
- API `/api/stays` origin/rate/body limit/no-store. Production mutations trả 503 BOOKING_UNAVAILABLE. Local simulator chỉ khi NODE_ENV=development + RELOO_STAYS_TEST_MODE=1 + loopback request. Actor local cố định là fixture; không có header chọn tài khoản/role. Đây **không phải** triển khai auth đặt phòng production.
- Adapter chưa cấu hình trả unavailable; outbox chưa gửi. Không có secret mới hay browser token access. Không thay đổi auth, bảo mật hay luồng thuê đồ/nội khu.

## Chạy lại được

Yêu cầu dùng dependencies hiện có (`@electric-sql/pglite`, Next, npx); không cần provider phòng/payment hay credential production.

```powershell
node scripts/stays-preview.mjs
# http://127.0.0.1:4522/dat-phong
# http://127.0.0.1:4522/dat-phong/quan-ly
```

Mỗi lần chạy tạo database tổng hợp mới ở `output/stays-preview/run-<timestamp>/database`, seed trước khi khởi động Next; trong một run, reload giữ dữ liệu. Ctrl+C dừng preview. Dùng build directory `.next-stays-test` riêng, không ghi đè build production. Env simulator được script truyền cho child, không lưu secret/config vào repo. Không chạy `db:migrate` với database khách để xem demo.

```powershell
node --test tests/stays.test.mjs tests/stays-management.test.mjs tests/stays-api.test.mjs tests/security-hardening.test.mjs tests/rental-selection.test.mjs tests/neighborhood.test.mjs
npx eslint components/stays lib/stays app/dat-phong app/api/stays scripts/stays-preview.mjs tests/stays*.mjs
npm run build

New-Item -ItemType Directory -Force output/playwright/stays
npx --yes --package @playwright/cli playwright-cli -s=stays open http://127.0.0.1:4522/dat-phong --browser chrome
npx --yes --package @playwright/cli playwright-cli -s=stays snapshot
npx --yes --package @playwright/cli playwright-cli -s=stays run-code --filename scripts/stays-browser-check.js
```

## Kết quả và bằng chứng

SQL/API/hồi quy đã chọn **29/29 đạt**; lint phạm vi mới **0 errors, 0 warnings**; production build đã biên dịch/TypeScript/prerender thành công. Lệnh và kết quả test lưu [sql-regression-results.txt](../output/playwright/stays/sql-regression-results.txt). Các cảnh báo module-type của repository không phải lỗi booking. Không chạy toàn bộ test suite của repository.

Browser Chrome thật qua Playwright CLI: **14 mục đạt** tại [browser-results.txt](../output/playwright/stays/browser-results.txt), kết thúc 22/10/2026 18:42 giờ Việt Nam. Không dùng interception để giả response booking: API và PGlite của preview chạy thật. Auth service của host local trả 503 vì preview cố ý không có Supabase thật; không ghi auth production là đã kiểm thử. Offline test tạo lỗi mạng dự kiến; HMR có thể sinh cảnh báo khi đang sửa, không được gọi là lỗi production.

Thêm **7 mục UI đối tác đạt**, ghi tại [partner-results.txt](../output/playwright/stays/partner-results.txt): tạo nháp, loại phòng, giá/version, thêm unit, khóa/mở lịch, gửi admin duyệt và responsive 320/390/768/1440. [Ảnh tồn phòng của cơ sở thử](../output/playwright/stays/partner-draft-inventory.png). Script tái chạy: `scripts/stays-partner-check.js` qua Playwright CLI, sau khi snapshot workspace; nó chỉ tạo dữ liệu tổng hợp. Tổng cộng 21 mục browser, không thay thế kiểm thử native. [Hash source](../output/playwright/stays/source-sha256.json) và [log build](../output/playwright/stays/build-results.txt) được lưu để đối chiếu bản local.

| Kịch bản | Bằng chứng / phạm vi |
|---|---|
| Desktop/tablet/mobile tìm phòng | [1440px](../output/playwright/stays/search-1440.png), [768px](../output/playwright/stays/search-768.png), [390px](../output/playwright/stays/search-390.png), [320px](../output/playwright/stays/search-320.png); check không tràn ngang |
| Không có kết quả | [empty.png](../output/playwright/stays/empty.png), thay sức chứa/nơi |
| Chi tiết/kiểm tra | [detail-mobile.png](../output/playwright/stays/detail-mobile.png), [review-mobile.png](../output/playwright/stays/review-mobile.png); nút hold bị khóa trước consent |
| Giữ/confirm/đơn reload | [held-mobile.png](../output/playwright/stays/held-mobile.png), [confirmed-mobile.png](../output/playwright/stays/confirmed-mobile.png); deep link phục hồi từ DB |
| Mất mạng/retry | [offline.png](../output/playwright/stays/offline.png); không báo thành công khi request thất bại |
| Hủy và refund thử | [preview](../output/playwright/stays/cancellation-preview.png), [cancelled-refunded.png](../output/playwright/stays/cancelled-refunded.png) |
| Tiếng Anh | [english-mobile.png](../output/playwright/stays/english-mobile.png), qua LocaleProvider hiện có |
| Đối tác | [partner-mobile.png](../output/playwright/stays/partner-mobile.png), UI render; CRUD/authorization được test SQL |
| Tồn/giá/callback | SQL test: contention một PGlite, retry idempotent, invalid date/guest, expiry, price version, sai amount, failed/success/duplicate/late callback, hủy trước/sau deadline |
| Quyền/lifecycle | SQL: khách khác bị chặn, partner cơ sở khác rỗng/bị chặn, admin đọc qua trusted param, approved guard, nhận/trả/no-show theo state/time, audit immutable |
| Security migration | Test áp dụng cả security-lockdown.sql lên fixture sau migration booking, kiểm tra không có SELECT/RPC client; service role được giữ |
| Regression | Rental selection + Neighborhood + security-hardening đạt; không đại diện full marketplace E2E |

## Phần chưa hoàn tất / không được mở bán

| Phần | Điều kiện/lý do |
|---|---|
| Nguồn phòng thật, đối tác onboard, auth/CRM booking production | Chưa có nguồn/API/hợp đồng và phạm vi vận hành được duyệt; hiện mọi mutation public fail closed, chưa nối requireAccount/CRM cho booking thật |
| Thuê giờ/qua đêm/tuần-tháng | Tham chiếu có nhãn; nghiệp vụ RELOO chưa xác định; demo chỉ theo ngày với giờ cấu hình thử |
| Weekend/holiday/surcharge/tax/voucher/platform fee/payout | Chưa có cấu hình/chính sách được duyệt; demo nightly flat rate, 0 phí thử, không diễn giải là giá thuế thật |
| Thanh toán/webhook/hoàn/đối soát thật | Hạ tầng hiện có là finance/SePay; chưa có mapping booking/payment intent/provider sandbox được duyệt; không nối simulator vào webhook thật |
| Chờ đối tác xác nhận / đổi lịch sau thanh toán / refund nhiều mốc | Cần policy chính thức; state machine hiện demo xác nhận trực tiếp, đổi ngày bằng tìm/quote mới, không sửa đơn trả tiền |
| Notification/push/reminder và expiry worker | Chỉ outbox + expiry lười; chưa nối unified notifications/operations worker; chưa gửi thật; app background chỉ refresh khi quay lại, chưa có OS notification |
| PostgreSQL nhiều connection/process | PGlite chỉ một connection, Promise contention không thay test hai transaction trên server PostgreSQL thật; row/advisory locks đã viết nhưng chưa đo race multi-process |
| Samsung RELOO / iPhone / native keyboard/safe area thực / Android background dài | Samsung tham chiếu có bằng chứng; RELOO local Samsung bị auto-review chặn ADB reverse/open Chrome `blocked by policy`. Chưa có iPhone trong kiểm tra. Viewport desktop không phải native QA |
| Map/ảnh cơ sở thật/gallery/đánh giá thật/khuyến mại | Không có dữ liệu được phép; CSS demo, ghi nhãn chưa có review/map; không sao chép thương mại |
| Giao diện admin phê duyệt/refund/complaint hoàn chỉnh và unified my orders | RPC nền tảng có guard; chưa có CRM UI/mapping và tích hợp inbox/order chung; workspace hiện chỉ prototype local |
| Triển khai đồng bộ web/native | Chưa deploy; chưa apply migration backend thật; chưa verify runtime/catalog desktop/iPhone/Android production |

## Checklist rollout sau phê duyệt nghiệp vụ

Hoàn thiện các phần chưa có phía trên trước. Migration chạy bởi backend DB operator, backup theo quy trình dự án; apply hai migration đúng thứ tự rồi `deploy/vietnam/security-lockdown.sql`. Chạy test privileges và race PostgreSQL thật trước nhận đơn. Backend phải suy ra actor từ requireAccount và CRM role/membership, tuyệt đối không chuyển p_admin/actor của client xuống RPC. Payment webhook phải dùng cơ chế xác minh hiện có, signature contract thực của nhà cung cấp và mapping order/amount; simulator không đủ điều kiện mở bán. Nối outbox vào notification chung, expiry/reconciliation worker có dedupe; native deep link phải đọc đơn qua account scope.

Release website/app theo AGENTS: cùng build backend và tất cả renderer, verify runtime/public catalog desktop, iPhone, Android. Native hiện tải reloo.vn; chỉ đổi code/config native khi có app release tương ứng. Không suy ra app đang mở/offline đã refresh.
