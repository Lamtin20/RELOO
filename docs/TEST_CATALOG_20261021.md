# Đồng bộ app–website và danh mục kiểm thử — 21/10/2026

## Dữ liệu đã chuẩn bị và lưu

- Nguồn: `lib/catalog/test-catalog-20261021.js`; kiểm tra/xuất file bằng `scripts/catalog/prepare-test-catalog.mjs`.
- 20 mã `test-20261021-01` đến `test-20261021-20`, mỗi mã 3 ảnh WebP 1600×1200. Đủ thông số bắt buộc, mô tả, tình trạng, giá trị tài sản, giá thuê/bán, kỳ tính tiền, cọc, giao nhận, phụ kiện, hướng dẫn, yêu cầu, hủy/trả muộn/hư hỏng, phí và tùy chọn.
- Bao phủ RENT/SALE/BOTH, DAY/WEEK/MONTH, cọc 0/có cọc, nhận trực tiếp, giao có phí/miễn phí và chỉ giao tận nơi.
- Giá và thông số là giả lập để test. Tiêu đề ghi `[TEST]`, mô tả ghi không phải lời chào giao dịch thực, không chuyển tiền thật. Không tạo đánh giá, lượt thuê, huy hiệu hoặc danh tính giả.
- 60 ảnh có nguồn và giấy phép trong `public/images/test-catalog-20261021/credits.json`: 15 nguồn Wikimedia Commons, 5 nguồn Unsplash. Ảnh 1 là toàn sản phẩm; ảnh 2–3 là trích vùng chi tiết của cùng ảnh nguồn, không phải các góc chụp khác nhau. Không dùng ImageGen.
- Bản xem: `output/catalog-refresh/products.json`, `summary.json`, `contact-sheet.png`. Đây không phải danh mục đã công khai.

Đã lưu 20 tin `paused` vào tài khoản chính Lâm Tín, sau khi kiểm tra tài khoản ACTIVE. Cả 20 tin có đủ 3 ảnh tham chiếu và điều kiện thuê; 0 tin test công khai, 0 tác vụ thông báo quảng bá. Tài khoản chính được dùng tạm khi chưa có lựa chọn khác từ người dùng.

## Gỡ danh mục cũ và giới hạn đăng mới

Trước thay đổi có 13 asset cũ (11 available, 2 rented) và 7 giao dịch. Đã gỡ cả 13 khỏi công khai bằng `is_locked=true`; giữ nguyên hồ sơ, chủ sở hữu, trạng thái và quan hệ giao dịch. 7 giao dịch vẫn tồn tại. Danh mục dành cho khách chưa đăng nhập hiện trống.

3 tài khoản ACTIVE chưa có hồ sơ danh tính hợp lệ tại thời điểm kiểm tra. Không sửa `verified_identities`, hồ sơ duyệt hoặc trạng thái danh tính để ép đăng tin. 20 tin mới chỉ có thể công khai sau khi chủ đồ được duyệt danh tính thật.

`deploy/vietnam/catalog-retirement.sql` đã được áp dụng cùng `security-lockdown.sql` trong giao dịch bảo trì, sau backup mã hóa. Chỉ tác vụ `current_user=postgres` được ẩn một dòng khi mọi trường ngoài `is_locked`/`updated_at` giữ nguyên. Mở lại, đăng mới và đổi chủ vẫn qua kiểm tra bình thường. Không cho phép bỏ qua danh tính.

`scripts/catalog/swap-sql.mjs` tạo giao dịch đăng đủ 20 tin sau khi chủ đồ active/verified. Giao dịch dừng trước mọi ghi nếu chủ đồ chưa đủ điều kiện; không xóa asset/ảnh/giao dịch cũ. Có chặn áp dụng lại sau khi bộ test đã được công khai/sử dụng. Các tác vụ thông báo do chính bộ fixture tạo được loại khỏi hàng đợi trước commit, không ảnh hưởng thông báo khác.

Receipt backup và thao tác: `output/catalog-refresh/draft-stage-receipt.json`, `retirement-receipt.json`. Công cụ `execute-swap.mjs` trong cùng thư mục mặc định chỉ tạo SQL dry-run; `--apply` vẫn kiểm tra chính sách thật của DB.

## Giao diện và đồng bộ

- Tin của tôi có mục **Tạm ẩn**, badge trạng thái và nút **Xem** để mở tin paused mà không cần đi qua màn chỉnh sửa yêu cầu xác minh. Giá phân biệt mua lại/ngày/tuần/tháng; tin ẩn không thể đẩy tin. Đã kiểm tra fixture đủ 20 thẻ và 20 liên kết xem.
- Store không dựng lại 13 tin demo cũ khi khởi tạo hoặc khi backend lỗi. Website và app đọc cùng backend.
- Quy tắc phát hành trong `AGENTS.md`: đồng bộ backend Docker và mọi renderer K3s, so build HTML với `/api/mobile/runtime`, so hash danh mục trên desktop/iPhone/Android. `scripts/verify-production-sync.mjs` kiểm tra cả build và danh mục.
- APK RELOO thực tế trên Samsung đã được kéo bằng REA; `assets/capacitor.config.json` xác nhận `server.url=https://reloo.vn`. Evidence: `native-package-evidence.json`, `installed-app-runtime.json` trong `output/catalog-refresh/`. Không cần thay APK cho thay đổi web này.
- Phiên app ngủ/offline nhận bản mới khi online và tiếp tục sử dụng; không ép tải lại giữa luồng nhập/đặt thuê.
- Phát hành dùng backup nguồn/DB mã hóa và health guard. Docker dùng bộ CA tin cậy đi kèm Node để khởi tạo TLS tới kho Debian, sau đó cài gói `ca-certificates`; không tắt kiểm tra TLS. Dùng HTTPS để tải thư viện đóng gói.

## Kiểm tra

- 45 test logic/điều hướng/quyền riêng tư/bảo mật đạt, gồm kiểm tra thực bằng PGlite rằng đổi danh mục nguyên tử, giữ giao dịch, chặn chủ đồ chưa được duyệt và không gửi thông báo cho dữ liệu test.
- Fixture trình duyệt: 20 trang chi tiết, 3 ảnh tải được mỗi trang, danh sách 20 tin ở 320/390/1440px; không tràn ngang hoặc page error. Trang quản lý Tạm ẩn cũng kiểm tra đủ 20 tin và liên kết xem ở các kích thước đó.
- Kiểm tra metadata 60 WebP và xem contact sheet; tên/quy cách đã chỉnh theo nhóm hình minh họa.
- Kết quả nguồn triển khai và renderer: `output/catalog-refresh/release-verification.json`. Build/danh mục theo thiết bị: `production-sync.json`. Không diễn giải kiểm tra bằng user agent là kiểm thử camera hoặc Apple Maps trên iPhone thật.

Trạng thái đăng công khai bộ mới còn phụ thuộc chủ đồ hoàn tất xác minh và hồ sơ được duyệt.
