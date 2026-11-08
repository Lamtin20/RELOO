# Khảo sát Dayladau cho RELOO Real

Ngày kiểm tra: 22/10/2026, Asia/Ho_Chi_Minh. **Khảo sát một phần, không phải toàn bộ sản phẩm**. A = quan sát UI trực tiếp; B = thông tin công khai có nguồn; C = suy luận/chưa xác minh; D = đề xuất RELOO. Không kết luận backend, ranking, chống gian lận hoặc vận hành nội bộ từ UI.

## Môi trường và chứng cứ

Repo REA được xác minh là `https://github.com/morluto/rea.git`, checkout `D:\reloo_project\.tooling\rea`, commit `fc935d0df3d7589363242e9e5718c94a4262f1d4`, CLI 6.5.0. Không cập nhật toolchain, không tải repository trùng tên. Đã đọc skill reverse-engineer-anything, tài liệu RELOO REA_WORKFLOW và hướng dẫn REA browser scenario/ADB. MCP browser scenario thực sự được dùng; CLI REA ADB thực sự được dùng cho identity/version/launch/screenshot. Thao tác tap/swipe/back và cây accessibility native dùng ADB/UIAutomator hiện có; REA capture không tự chứng minh đã thao tác.

ADB có tại `output/mobile-tools/android-sdk/platform-tools/adb.exe`, version 37.0.1. Thiết bị kết nối trạng thái `device`, model **Samsung SM-N950N**. Package thực tế **com.dayladau.guest**, version **1.0.560 / code 560**, installer **com.android.vending**. Tên package + installer + app hiển thị khớp mục tiêu người dùng; đây không phải kiểm chứng chữ ký APK. Không pull/decompile APK, không cần suy đoán JADX/Frida/root. Không cần bật USB debugging hay cài driver thêm vì kết nối đã hoạt động.

Phiên Samsung có tài khoản đăng nhập sẵn. Không đăng xuất, không đọc token, không nhập OTP/mật khẩu và không mở chỉnh sửa thông tin cá nhân. Tên/số điện thoại xuất hiện khi mở Menu đã được che trên **artifact giữ lại**, gồm screenshot/XML; tên người đánh giá được che. Các file `*-redaction.json` ghi hash ảnh sau che; hash trong REA capture gốc chỉ tham chiếu frame trước che. Không giữ bản ảnh chưa che của Menu/reviews. Không nhắn tin hay tạo đơn/hold/thanh toán/hủy thật.

Web được khảo sát bằng Chrome 155.0.8059.85 qua REA, profile tạm, vi-VN, mobile 390×844 và desktop 1440×1000; chưa đăng nhập. Các ảnh native 1080×2220. Đồng hồ thanh trạng thái Samsung không được coi là nguồn giờ chuẩn; báo cáo dùng ngày/múi giờ client, web capture lưu tham số timezone riêng.

| Artifact/Evidence | Nội dung và giới hạn |
|---|---|
| [devices.json](../output/rea/dayladau/devices.json), `ev_c04b84e4b7a5bd507468ca274b244ad5eca1e6775cae2cea56d88222f48b185c` | A: có thiết bị ADB, không phải device attestation |
| [app-version.json](../output/rea/dayladau/app-version.json), `ev_a49ef340a66bd0e2d7dc5e330103d48dc19167469ffdf62af6b8706805f8efab` | A: version/installer projection dumpsys |
| [Web kết quả](../output/rea/dayladau/web-01-results.png), [JSON](../output/rea/dayladau/web-01-results.json), `ev_9b1f5654aa69903ef73c24ec767ea1839a6980ad9aa4f06fdb044f0280c54958` | A: vào https://dayladau.com/ → trang listings; chỉ frame cuối sau chờ, accessibility có thể gồm cả nội dung ẩn |
| [Web chi tiết](../output/rea/dayladau/web-02-detail.png), [JSON](../output/rea/dayladau/web-02-detail.json), `ev_8bb4b4b00a9bfafe3a23db03bdc1fa876622dc7d6e9e1167f41999c64a61c69b` | A/B: mở một listing công khai, không bấm Đặt ngay |

Mỗi folder native dưới `output/rea/dayladau/` có `screen.png`; JSON cùng tên folder lưu Evidence ID, hash và giới hạn REA; XML cùng tên nếu đã dump. Không xem hash là bằng chứng cho các bước không chụp.

[Thư viện ảnh có chú thích](../output/rea/dayladau/index.html) gom 14 frame native. File XML tạm tự tạo trên Samsung đã được xóa sau khảo sát; chỉ giữ bản local đã che thông tin cá nhân.

## Bao phủ màn hình và hành trình

Danh mục theo yêu cầu: vào app/onboarding/auth/quyền → khám phá/tìm kiếm → lịch/khách → kết quả/filter/map → chi tiết/ảnh/chính sách → kiểm tra/checkout → đơn/hậu mãi → tài khoản/yêu thích/thông báo → trạng thái lỗi. Bảng dưới phân biệt phần đã mở với phần chưa đi đến.

| Màn hình/nhóm | Thao tác dẫn đến / ảnh | Bố cục, CTA, hành vi và quay lại | Phạm vi |
|---|---|---|---|
| Khởi chạy | REA start app → [01](../output/rea/dayladau/native-01/screen.png) → chờ → [02](../output/rea/dayladau/native-02/screen.png) | Frame đầu trống rồi có danh sách; không suy ra timeout hay skeleton từ một frame | A, quan sát hai thời điểm |
| Khám phá | Mở app, ảnh 02 | Ô tìm kiếm phía trên; card có ảnh, metadata, giá và gói; tab dưới; nút bản đồ; không bấm lưu/đặt | A |
| Tìm kiếm | Tap ô tìm kiếm → [03](../output/rea/dayladau/native-03-search/screen.png) | Điểm đến, gần đây, thời gian, khách; CTA dưới; back hệ thống trở về khám phá | A; chưa cấp vị trí |
| Ngày/giờ | Tap thời gian → [04](../output/rea/dayladau/native-04-dates/screen.png) | Tab theo ngày/giờ/tuần-tháng, lịch, khung tóm tắt; không chứng minh mọi mode có tồn hay được thanh toán | A cho nhãn/màn hình; C cho vận hành mọi mode |
| Số khách | Nhãn 2 khách trong 03/04 | Entry đã thấy; chưa mở bộ tăng/giảm nên validation/max còn chưa xác minh | Một phần |
| Chi tiết | Back tìm kiếm → tap ảnh card đầu → [05](../output/rea/dayladau/native-05-detail/screen.png) | Gallery/count, chủ cơ sở, đánh giá, location, metadata; CTA dưới; không bấm nhắn chủ nhà/Đặt ngay | A |
| Giờ và combo | Swipe chi tiết lên → [06](../output/rea/dayladau/native-06-policies/screen.png) | Giờ chuẩn, giờ sử dụng ban ngày, cách nhận phòng, khung hỗ trợ, combo giờ/qua đêm có giá riêng | A; không đồng nhất các khung giờ |
| Mô tả/tiện nghi | Swipe → [07](../output/rea/dayladau/native-07-description/screen.png) | Nội dung thu gọn, entry xem thêm, tiện ích kèm thông tin phí | A; không mở tất cả mục |
| Đánh giá/vị trí | Swipe → [08 đã che](../output/rea/dayladau/native-08-reviews/screen.png) | Review cards, entry xem toàn bộ, map inline; không suy ra xác thực review | A/C |
| Chính sách/giá | Swipe → [09](../output/rea/dayladau/native-09-rules/screen.png) | Nội quy, hoàn/hủy và ghi chú chủ cơ sở, giá theo thứ; back về list đã thao tác | A/B theo từng listing |
| Bộ lọc | Back chi tiết → tap filter → [10](../output/rea/dayladau/native-10-filters/screen.png) | Khoảng giá, cách check-in, phòng/giường/tiện nghi, CTA hiển thị kết quả; chỉ mở, chưa áp dụng filter | A cho form; kết quả lọc chưa kiểm chứng |
| Menu/tài khoản | Back filter → Menu → [11 đã che](../output/rea/dayladau/native-11-menu/screen.png) | Entry thông báo, ưu đãi, cá nhân, thanh toán, hỗ trợ, pháp lý, ngôn ngữ | A cho entry, không mở dữ liệu tài khoản |
| Chuyến đi rỗng | Tab Chuyến đi → [12](../output/rea/dayladau/native-12-trips/screen.png) | Ba tab sắp tới/đã qua/đã hủy đều hiển thị 0; thông báo rỗng giữa màn hình | A, không có đơn để khảo sát hậu mãi |
| Yêu thích rỗng | Tab Yêu thích → [13](../output/rea/dayladau/native-13-favorites/screen.png) | Trạng thái rỗng và gợi ý khám phá; không thay đổi favorites | A |
| Quyền vị trí | Khám phá → bản đồ → [14](../output/rea/dayladau/native-14-map/screen.png) | Android hỏi quyền vị trí; chưa chọn cho phép; chưa quan sát map kết quả toàn màn hình | A cho permission, chưa bao phủ map |
| Gallery đầy đủ | Có entry trong 05 và web detail | Chưa mở thư viện; chưa kiểm chứng swipe/zoom/back gallery | Chưa kiểm thử |
| Onboarding/login/session-expired | App đã có phiên, không reset dữ liệu | Không đăng xuất/reset để tạo trạng thái mới | Chưa kiểm thử |
| Thông báo/quyền notification/ưu đãi/lịch sử | Chỉ thấy entry ở Menu | Không mở nội dung cá nhân hay kích hoạt gửi | Chưa kiểm thử |
| Chọn gói/khách/giá checkout/payment | Có CTA/gói trên chi tiết | Dừng trước CTA có thể tạo hold/đơn thật; không giả định preview vô hại | Chưa kiểm thử |
| Xác nhận/nhận/trả/đổi/hủy/hoàn/hỗ trợ gửi tin | Không có đơn thử Dayladau | Không tạo giao dịch hoặc tin nhắn để khảo sát | Chưa kiểm thử |
| Mất mạng/hết phòng/invalid/loading/error | Chỉ có frame khởi chạy | Không thay network thiết bị cá nhân; chưa có fixture tham chiếu | Chưa kiểm thử |

## Chính sách công khai và kết luận có giới hạn

B: [listing công khai đã mở](https://dayladau.com/listings/lsv3ix6oij), kiểm tra 22/10/2026, nêu quy tắc hủy theo thời điểm, điều kiện đổi phòng/ngày và khung giờ sử dụng khác nhau. Đây là nội dung **của listing đó**, không được coi là một chính sách chung mọi cơ sở. Ảnh 09 là một listing native khác; không so giá giữa hai listing để kết luận lệch giá. Chưa xác minh điều khoản công khai toàn nền tảng nên không dùng làm đặc tả tài chính RELOO.

C: các nhãn gói và tab thời lượng gợi ý có nhiều cách chọn thời gian. Chưa chứng minh cách phân bổ tồn, giữ phòng, settlement, công thức thuế/phí, webhook, refund timing, matching hay anti-fraud. Không có bằng chứng API/ủy quyền sử dụng nguồn phòng của Dayladau.

| Quan sát | Bài học UX | Áp dụng riêng RELOO (D) |
|---|---|---|
| A: tìm kiếm gom nơi/thời gian/khách (03–04) | Giữ ngữ cảnh trước xem giá | Một form tìm kiếm có nhãn, giữ state khi quay lại |
| A: card và chi tiết đều có thời gian/gói (02,06) | Giá cần gắn với khung sử dụng | MVP chỉ bán theo ngày khi nghiệp vụ rõ; không gán cùng giá cho giờ/qua đêm |
| A/B: nội quy và ghi chú hủy ở chi tiết (09) | Đọc chính sách phải đủ gần CTA | Review bắt buộc tổng giá, giờ Việt Nam, snapshot policy và consent |
| A: menu có các nhóm chức năng (11) | Tái sử dụng account/support | Dùng tài khoản/LocaleProvider/MarketplaceShell hiện có; chưa bật notification delivery |
| A: empty trips/favorites (12–13) | Trạng thái rỗng cần giải thích | RELOO có empty results/my bookings; favorites chỉ phiên demo, nói rõ phạm vi |
| A: map yêu cầu quyền sau thao tác (14) | Quyền theo ý định người dùng | Không tự xin vị trí nền; map chưa có adapter thì nói chưa khả dụng |

## Bước tiếp theo cần điều kiện thật

Muốn khảo sát checkout/hậu mãi sâu hơn cần tài khoản và inventory sandbox được Dayladau cho phép hoặc walkthrough do người dùng cung cấp; không dùng tài khoản thật để tạo hold. Onboarding cần phiên thử mới được chủ thiết bị chủ động chuẩn bị, không reset app đang đăng nhập. Không cần cài driver/SDK thêm trong môi trường đã kiểm tra.

Kiểm thử RELOO trên Samsung local chưa thực hiện: auto-review đã từ chối lệnh ADB reverse cổng 4522 và mở Chrome local, chỉ trả lý do `blocked by policy`. Không đổi native config/URL production, không triển khai, không coi mobile viewport Chrome desktop là thiết bị native.
