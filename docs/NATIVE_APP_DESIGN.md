# Giao diện ứng dụng Reloo

App Capacitor có giao diện riêng qua `useNativeApp`, với CSS giới hạn trong `.reloo-native`. Trang web giữ giao diện hiện tại và nội dung HTML để tìm kiếm có thể lập chỉ mục.

- Trang chủ: tìm kiếm, chọn khu vực, video ngắn/hoàn tiền/thu nhập/an toàn, danh mục, tin cho thuê và hướng dẫn bốn bước. Danh sách lấy dữ liệu có sẵn, dùng ảnh lazy load và tối đa 12 thẻ ở trang chủ.
- Cá nhân: hồ sơ, đăng nhập khi cần, lối vào Thu nhập & thanh toán, trạng thái xác minh, tin/đơn/video/đã lưu, lịch sử, chủ đồ đã lưu và hỗ trợ. Các đường dẫn cần tài khoản giữ `next` để tiếp tục sau đăng nhập. Không hiển thị số dư hoặc số liệu giả.
- Điều hướng cố định: Trang chủ, Shorts, Đăng tin, Tin nhắn, Cá nhân. Nút Khám phá đã ẩn khỏi menu dưới theo yêu cầu; người dùng tìm đồ qua thanh tìm kiếm và danh mục. Shorts có icon video dọc với nút phát, và vẫn dùng trình phát toàn màn hình riêng.
- Tìm kiếm và đăng nhập: trường nhập từ 16 px, bộ lọc giá đủ rộng, trang đăng nhập gọn cho ứng dụng. Cookie nằm sát khu vực dưới, phía trên điều hướng.
- Android: thanh trạng thái/nút hệ thống nền trắng, chữ tối; khi xem shorts chuyển sang chế độ toàn màn hình.

Tham khảo: https://www.dochat.com.vn/ và ứng dụng `com.dochat.app` trên Samsung SM-N950N. Các màn hình quan sát là trang chủ, Gần bạn và Cá nhân trong trạng thái chưa đăng nhập. Không sử dụng hình ảnh/thương hiệu Đồ Chất trong app Reloo.

Kiểm tra giao diện bằng Playwright ở 320, 360, 393, 430 và 768 px, đối chiếu web 1440 px, và kiểm tra app thực trên Samsung qua ADB/WebView. Bản native tiếp tục dùng cơ chế cập nhật đã thiết lập; cập nhật APK vẫn cần xác nhận cài đặt theo quy định Android.
