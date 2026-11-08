# Cá nhân RELOO — khảo sát app Mioto và Chợ Tốt

## Quan sát thực tế ngày 17/10/2026

Thiết bị Samsung SM-N950N do chủ máy cung cấp, hai app đã cài: `com.mioto.mioto`, `com.chotot.vn`. Dùng skill REA với ADB đã có để mở app, ghi Evidence và chụp màn hình; thao tác tap/swipe dựa trên màn hình đã quan sát. Không giải mã lưu trữ tài khoản, đọc chat, thẻ thanh toán, hồ sơ giấy tờ hay gửi giao dịch/tin nhắn. Các ảnh có tên/avatar tài khoản chỉ lưu trong output ignored để nghiên cứu, không đưa vào tài sản website.

| Màn hình | Quan sát | Áp dụng cho RELOO |
|---|---|---|
| Mioto — Khám phá | Hai kiểu dịch vụ, địa điểm/thời gian và CTA tìm xe | Giữ ý định thuê/mua, địa điểm và thời gian rõ; không áp dụng chính sách xe cho đồ dùng |
| Mioto — Cá nhân | Thẻ hồ sơ nhấn được; hàng icon, tên, chevron; nhóm tiện ích, quà tặng, bảo mật; đăng xuất ở cuối | Hồ sơ là lối vào chỉnh sửa; card trắng trên nền xanh nhạt, hàng lớn, chia nhóm rõ |
| Mioto — Hỗ trợ | Kênh liên hệ, gửi yêu cầu và hotline theo nghiệp vụ | Dẫn vào help center hiện có; không sao chép hotline/đối tác bảo hiểm |
| Chợ Tốt — Trang chủ | Tìm kiếm, danh mục, các mục Dành cho bạn/Gần bạn/Mới nhất/Video | Tách mục tiêu khám phá; không khẳng định thuật toán hoạt động từ ảnh |
| Chợ Tốt — Tài khoản | Hồ sơ, đã lưu/xem gần đây, dịch vụ trả phí, ưu đãi, cài đặt và trợ giúp | Giữ tiện ích lưu/xem gần đây và nhóm chủ tin; không thêm tiền ảo/số dư/dịch vụ chưa có |

Bằng chứng: `output/rea/mioto-native-{first,account,account-bottom,support}.json` và thư mục `screen.png` tương ứng; `chotot-native-{first,account,account-bottom}.json`. Package metadata ở `mioto-native-package.json`, `chotot-native-package.json`. Ảnh màn hình đã xem trực tiếp. Đây là quan sát Android, không phải kiểm thử iOS hoặc toàn bộ backend của đối thủ.

## Code và mapping

- `components/mobile/AccountHub.jsx`, `account-hub.css`: giao diện dùng chung desktop/mobile/app; `AppAccount.jsx` giữ export tương thích, `/account` dùng cùng component.
- `lib/i18n/account.js`: nội dung mới vi-VN/en-US, theo LocaleProvider hiện có; cờ chỉ ở mục Ngôn ngữ, không tạo bộ chọn ngôn ngữ ngoài cài đặt.
- `MarketplaceShell.jsx`: thêm tùy chọn `hideBack` mặc định false. Chỉ trang account tắt back thừa và header mobile bị lặp; các trang khác giữ nguyên.
- Đầu trang: hồ sơ → `/dashboard/profile`; lối tắt đơn thuê/đơn mua/tin của tôi/đã lưu giữ route chung.
- Món đồ & giao dịch: đăng đồ, tin nhắn, tài chính, video, kiểm tra tình trạng, xem gần đây.
- Tài khoản & cài đặt: hồ sơ, xác minh, bảo mật, lịch, cá nhân hóa, ngôn ngữ.
- Ưu đãi & dịch vụ: ưu đãi, hoàn tiền, quảng bá tin. Trợ giúp & chính sách: trợ giúp, an toàn, hướng dẫn, điều khoản và riêng tư.
- Chủ đồ đã lưu, bỏ lưu và ưu đãi động vẫn dùng module hiện có. Không tách thêm luồng Nội Khu.

Không ghi ACTIVE là “đã xác minh”. Chỉ hiển thị nhãn kích hoạt tương ứng; quy trình xác minh là riêng. Badge chờ xử lý dùng `AccountCountsProvider`/API hiện hữu, số chưa đọc cho tin nhắn; null hoặc lỗi hiện “—”, có thử lại. Khách chưa đăng nhập không nhận badge giả; link cần auth giữ next. Không thêm database/migration, quyền truy cập, số dư hay provider mới.

## Kiểm tra

- Browser fixture localhost: khách, tài khoản A/B, API lỗi/thử lại, dữ liệu null, tên dài, vi/en, cờ ngôn ngữ, auth next; `account-hub-browser.js` trả passed true.
- 320/390/768/1440 px: viewport bằng document width; ảnh `reloo-account-*.png` đã xem, sửa header lặp sau lần xem đầu rồi chạy lại đạt.
- Sáu test `account-workspace.test.mjs` và `ui-language.test.mjs` đạt, gồm quyền actor và unread SQL. Dữ liệu số lượng trong screenshot test là fixture, không phải số production.
- Lint phạm vi thay đổi không có lỗi, một cảnh báo raw img avatar. Build và phát hành ghi kết quả sau khi hoàn tất.

Giới hạn: các module đích còn có nội dung legacy tiếng Việt; bản này dịch nội dung AccountHub mới, không tuyên bố toàn app đã dịch hết. Không thay native permissions, không build hay phát hành iOS trong đợt này.

## Kết quả phát hành

- Build local cuối đạt; build server đạt, build ID `EXEfKdD9L7rE3znon4Dlx`, phát hành `native-account-1792246610216`.
- Sáu file runtime khớp SHA-256, container healthy, public health 200; API riêng tư đơn/thông báo/ngôn ngữ vẫn trả 401 cho khách. Database không có grant public/anon/authenticated được thêm.
- `output/rea/account-production.js`: production không mock đạt tại 390/1440 px, bốn nhóm, không header/back lặp trên mobile; auth link giữ next. Ảnh `reloo-account-production-mobile.png`, `reloo-account-production-desktop.png` đã xem.
- Mở app `vn.reloo.app` trên Samsung, nhấn Cá nhân, đã thấy giao diện mới; ảnh/Evidence `reloo-account-native-final/screen.png`, `reloo-account-native-final.json` đã xem. Đây là kiểm tra giao diện guest trong app thật; số lượng đăng nhập/đổi tài khoản dùng fixture localhost, không tạo tài khoản/giao dịch thật để thử. Không phát hành APK mới; app hiện có tải giao diện từ website theo cấu hình dự án.
- Bước deploy đầu tự dừng do C còn 4,4 GiB. Không xóa image phục hồi/dữ liệu; dùng lại cache thư viện cho build giao diện, ngưỡng bắt đầu 4 GiB và dừng dưới 3,5 GiB. Bản mới lên thành công; C còn khoảng 4,4 GiB sau phát hành. Dung lượng host vẫn cần được bổ sung để vận hành lâu dài. Bản sao lưu source/database mã hóa và image rollback được giữ.
- Các API business/follows/KYC/ưu đãi không cấu hình trong fixture trả 503, không tính là kiểm thử tích hợp đạt cho các module đó; các đường dẫn/module được tái sử dụng, không sửa backend của chúng trong đợt này.
