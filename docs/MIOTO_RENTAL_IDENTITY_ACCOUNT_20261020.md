# Lịch thuê, bản đồ, xác minh và cá nhân — 20/10/2026

## Nguồn đã xem

- Web chính thức https://www.mioto.vn/, ở desktop/mobile qua REA. Evidence trang chủ: `ev_c0939bd2476d368a5fa4b9f5a853c8b375ab794d2e445d39bb928923dc3b5d35`; lịch desktop: `ev_6659adbfaf1a796e93c0fa6c84d39f18091e68d353e8e4e721f97c954c8aec8e`.
- App `com.mioto.mioto` trên Samsung SM-N950N, kết nối ADB bằng bộ công cụ có sẵn. REA CLI đọc thiết bị và chụp màn hình; thao tác điều hướng và đọc cây giao diện bằng ADB. Không thay toolchain đã pin.
- Đã xem: trang chủ → lịch ngày → giải thích tính ngày → chọn giờ; tìm xe → danh sách → bản đồ → chi tiết xe/giao nhận; cá nhân → tài khoản. Không tạo chuyến, thanh toán hay gửi giấy tờ trên Mioto.
- Bằng chứng gốc và XML: `output/rea/mioto-20261020/` (ignored). Ảnh kiểm tra RELOO và script tái hiện: `output/playwright/` (ignored).

## Quan sát và phạm vi suy luận

| Quan sát trực tiếp ở Mioto | Áp dụng cho RELOO |
| --- | --- |
| Lịch theo khoảng ngày, ngày qua bị khóa; phần ngày trong khoảng được nối; tóm tắt ở dưới | Thêm trạng thái ngày nhận/trả rõ ràng, nối khoảng ngày, giữ tổng kết và nút áp dụng cố định |
| Hai cột nhận/trả có các mốc 19:30, 20:00, 20:30… | Thay bộ cuộn giờ/phút tự do bằng hai danh sách mốc 30 phút; loại mốc nhận đã qua và mốc trả không sau nhận |
| Giải thích app: thuê ngày áp dụng chuyến >8 giờ; dưới 24 giờ tính một ngày | Giữ chính sách RELOO hiện có: 24 giờ/ngày, phần lẻ làm tròn lên. Không tự áp mức tối thiểu 8 giờ cho các loại đồ, cũng không thêm sản phẩm thuê theo giờ khi chưa có biểu giá |
| Gợi ý quan sát được: nhận 21:00, trả 20:00 ngày sau | Gợi ý RELOO tiếp tục dùng thời gian chuẩn bị 2 giờ, làm tròn lên mốc 30 phút; trả sớm hơn giờ nhận 1 giờ ngày sau. Đây là lựa chọn triển khai RELOO, không phải kết luận rằng Mioto luôn dùng thời gian chuẩn bị 2 giờ |
| Kết quả giữ ngày/giờ sang chi tiết; có tự đến lấy và giao tận nơi; bản đồ/danh sách chuyển đổi được | Giữ ngày/giờ trên liên kết kết quả/bản đồ → sản phẩm; tiếp tục dùng lựa chọn giao nhận và báo giá backend hiện có |
| App cá nhân là menu; thông tin liên hệ/ngày sinh/liên kết nằm ở trang tài khoản riêng | Thay hồ sơ dài trên tổng quan bằng thẻ hồ sơ dẫn đến màn chỉnh sửa; giữ các lối vào đơn thuê/mua, tin, lưu, địa chỉ, ngân hàng, lịch, cài đặt; gom công cụ chủ đồ vào mục mở rộng |

## Sửa trong RELOO

- Khắc phục bộ chọn từng phút nhưng validator chỉ nhận 00/30. Cả UI và backend vẫn yêu cầu mốc 30 phút. Giờ quá khứ không nằm trong danh sách nhận; trả cùng ngày phải sau nhận. Gợi ý qua nửa đêm không còn nhảy tùy ý về 14:00. Khi xác nhận luôn kiểm tra lại thời gian thực.
- Luồng dài hạn dùng tối thiểu/gợi ý 30 ngày ở trang chủ, bộ lọc tìm kiếm và sản phẩm có giá theo tháng. Ước lượng danh sách hỗ trợ 1–365 ngày, cùng giới hạn lịch; ngày/giờ đầy đủ vẫn là căn cứ tính tiền backend. Không thay giá/chính sách cọc hoặc giao nhận.
- Giải thích ngay trong lịch: nhận 21:00 hôm nay, trả 20:00 mai = 1 ngày; trả 21:30 mai = 2 ngày. Hiện cả giờ sử dụng thực và số ngày tính tiền. Giá tuần/tháng theo tin đăng.
- Bản đồ Google nhúng ngay ở chọn khu vực, địa điểm sản phẩm và phần bản đồ kết quả. Kết quả cho chọn sản phẩm để đổi khu vực trên bản đồ; liên kết sản phẩm mang theo ngày/giờ. Đây là bản đồ khu vực công khai, không phải hệ thống nhiều ghim giá như Mioto hay công cụ đặt ghim cập nhật địa chỉ. Không thêm nhà cung cấp geocoding/API trả phí. Địa chỉ giao nhận cụ thể tiếp tục được xác nhận riêng.
- Xác minh mở camera khi vào bước chụp, tự chuyển camera khi sang mặt sau/QR/chân dung. Khung thẻ đúng tỷ lệ 85,6:54; ảnh cắt theo đúng vùng nhìn thấy của camera. Khi tìm được bốn viền gần khung, hiệu chỉnh phối cảnh; khi thiếu viền, dùng vùng khung và để người dùng kiểm tra/chụp lại. Không khẳng định nhận diện giấy tờ tự do trong mọi điều kiện ánh sáng/góc nghiêng.
- QR dùng khung vuông và chỉ giải mã vùng trong khung. Quét lại tự mở camera; thông tin quét vẫn chưa được coi là danh tính đã xác thực. Giữ duyệt hồ sơ và đồng ý gửi ở bước cuối. Đóng wizard không còn tự mở lại do effect ở trang xác minh.
- Tổng quan cá nhân không còn các ô thiếu dữ liệu, số 0/“—” chờ xử lý hay toàn bộ biểu mẫu hồ sơ. Chi tiết và các công cụ vẫn có đường truy cập.

## Kiểm tra và giới hạn

- `next build --webpack` đạt: biên dịch, TypeScript và tạo đủ 146 trang tĩnh. ESLint các tệp thay đổi không có lỗi; còn ba cảnh báo `<img>` ở ảnh đại diện/preview ảnh và ảnh có sẵn của sản phẩm.
- 54 kiểm tra Node đạt: lịch/giờ/báo giá, URL tìm kiếm, toán cắt/căn thẻ, QR, sự đồng ý gửi, vận hành xác minh, phạm vi tài khoản và security hardening. Hai fixture cũ được chỉnh về mốc 30 phút và thời hạn tháng hợp lệ, thay vì nới chính sách backend để làm test qua.
- Playwright desktop 1440×1000 và mobile 390×844: tab/form cùng x/width, tab kết thúc đúng chỗ form bắt đầu; document không tràn ngang. Đã mở lịch, chọn và áp dụng giờ, kiểm tra tài khoản khách/thành viên, liên kết khu vực bản đồ và đổi sản phẩm đang xem.
- Đã chờ bản đồ Google khởi tạo và tải các ô nền thật trước khi chụp `mobile-results-map.png`; không chỉ kiểm tra thuộc tính URL iframe. Menu sản phẩm bên dưới đổi khu vực nhúng; không diễn giải các biểu tượng sẵn có trên Google Maps là ghim sản phẩm RELOO.
- Camera thử bằng luồng giả tại trình duyệt và API mock: tự mở, chụp trước/sau đúng tỷ lệ, giải mã QR mẫu, quét lại tự nhận, đóng giữ trạng thái đóng. Không dùng giấy tờ thật và không gửi hồ sơ lên backend thật. Kiểm tra phối cảnh hiện bằng dữ liệu ảnh tổng hợp; cần kiểm tra thêm trên thẻ thật được chủ thẻ tự thao tác trước khi phát hành.
- Mioto đã xem trực tiếp trên Samsung. Thao tác chuyển tiếp cổng USB để mở RELOO local trên Samsung bị duyệt tự động từ chối (`blocked by policy`); không coi kiểm tra mobile bằng trình duyệt desktop là đã kiểm chứng camera RELOO trên Samsung.
- Không triển khai production, thay schema, cấu hình xác thực hay đăng ký dịch vụ bên ngoài.
