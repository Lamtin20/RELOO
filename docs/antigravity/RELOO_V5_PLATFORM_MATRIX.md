# MA TRẬN NỀN TẢNG VÀ THÍCH ỨNG THIẾT BỊ (PLATFORM MATRIX) — RELOO REAL V5.0
**Dự án:** RELOO Real — Premium Experience Rebuild  
**Xác thực framework thực tế:** Next.js 16.4.2 (Web) + Capacitor 8.5.3 (Android Gradle / iOS Xcode)  
**Quy tắc:** Kiểm thử thực tế trên từng cấu hình, không nhận định bừa khi chưa có môi trường đo kiểm.

---

## 1. MA TRẬN ĐỘ RỘNG MÀN HÌNH WEB PHẢN HỒI (WEB RESPONSIVENESS MATRIX)

| Phân loại | Độ rộng Viewport | Thiết bị đại diện điển hình | Hành vi bố cục & Tiêu chí kiểm định V5.0 | Trạng thái xác thực |
|---|---|---|---|---|
| **Mobile Compact** | **320px** | iPhone SE (Gen 1), thiết bị màn hình nhỏ đời cũ | Lưới sản phẩm 1 cột hoặc 2 cột mini, không tràn ngang (`scrollWidth <= 320`), nút bấm tối thiểu 44px. | **ĐẠT (PASS)** |
| **Mobile Standard** | **360px** | Galaxy A-series, Xiaomi Redmi, Pixel nhỏ | Lưới 2 cột cân đối, thanh tìm kiếm co giãn mượt mà, menu điều hướng đáy cố định không che nội dung. | **ĐẠT (PASS)** |
| **Mobile Flagship** | **390px** | iPhone 12/13/14/15/16 Pro | Chuẩn thiết kế mobile-first tối ưu, cử chỉ vuốt mượt mà, hỗ trợ Safe Area Dynamic Island. | **ĐẠT (PASS)** |
| **Mobile Plus/Max** | **430px** | iPhone 14/15/16 Plus & Pro Max, Galaxy S24 Ultra | Mật độ hiển thị rộng rãi, khoảng đệm lề 16px - 20px, kích thước thẻ sản phẩm nở rộng tương xứng. | **ĐẠT (PASS)** |
| **Tablet Portrait** | **768px** | iPad 10.2", iPad Mini, Galaxy Tab A8 | Lưới 3 cột, hiển thị thanh điều hướng dạng thanh trên kết hợp menu trượt phụ (Drawer). | **ĐẠT (PASS)** |
| **Tablet Landscape**| **1024px** | iPad Pro 11", Surface Pro đứng | Lưới 4 cột, bố cục chia đôi màn hình Bản đồ & Danh sách sản phẩm (Map/List Split View). | **ĐẠT (PASS)** |
| **Desktop Laptop** | **1280px** | MacBook Air 13", ThinkPad, Laptop văn phòng | Khung trang tối đa 1280px căn giữa, thanh điều hướng ngang đầy đủ các phân hệ và nút tài khoản. | **ĐẠT (PASS)** |
| **Desktop Standard**| **1440px** | Màn hình ngoài 24"-27" FHD/QHD | Trải nghiệm duyệt danh mục cao cấp, thanh lọc cố định bên trái (Sticky Facet Sidebar). | **ĐẠT (PASS)** |
| **Desktop UltraWide**| **1920px** | Màn hình 4K / Ultrawide | Khung nội dung giữ ở 1280px - 1440px căn giữa cân đối, không kéo giãn hình ảnh gây vỡ hạt. | **ĐẠT (PASS)** |

---

## 2. HIỆN TRẠNG VÀ ĐẶC TẢ NỀN TẢNG DI ĐỘNG (MOBILE NATIVE APPS)

### 2.1. Kiểm tra kho mã nguồn di động thực tế
- **Framework thực tế:** Không phải React Native hay Flutter thuần túy. Hệ thống sử dụng **Capacitor 8.5.3** đóng gói ứng dụng web Next.js (`webDir: "www"`, cấu hình nạp từ máy chủ ứng dụng `https://reloo.vn`).
- **Kho mã nguồn Android:** Nằm tại `mobile/android`:
  - `build.gradle` & `gradlew` (Gradle wrapper 8.14.3).
  - Cấu hình SDK: `compileSdkVersion 36`, `targetSdkVersion 36`, `minSdkVersion 24` (Hỗ trợ Android 7.0 đến Android 15).
  - Quyền truy cập khai báo: Camera, Fine Location, Coarse Location, Read/Write Storage.
- **Kho mã nguồn iOS:** Nằm tại `mobile/ios`:
  - Thư mục `App` (Swift AppDelegate, Podfile, Info.plist).
  - Khai báo quyền: `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`.

### 2.2. Ma trận thích ứng và ràng buộc kỹ thuật di động

| Yêu cầu kỹ thuật | Nền tảng Android (Capacitor) | Nền tảng iOS (Capacitor) | Trạng thái & Giải pháp V5.0 |
|---|---|---|---|
| **Vùng an toàn (Safe Areas)** | Xử lý thanh điều hướng ảo 3 nút và cử chỉ vuốt đáy (Gesture Pill). | Tự động thích ứng Notch và Dynamic Island bằng `env(safe-area-inset-*)`. | **ĐÃ TRIỂN KHAI** trong CSS cơ sở `v5-foundation.css`. |
| **Cử chỉ quay lại (Back Gesture)** | Lắng nghe sự kiện `backButton` của Capacitor, đóng Modal trước khi thoát. | Cử chỉ vuốt cạnh trái (Edge Swipe) do WebKit iOS xử lý mặc định. | **ĐÃ KIỂM SOÁT** qua trạng thái History Stack. |
| **Bàn phím ảo (Virtual Keyboard)** | Cấu hình `android:windowSoftInputMode="adjustResize"`. | Tự động cuộn phần tử đang focus lên trên mép bàn phím (`scrollIntoView`). | **HOẠT ĐỘNG TỰ NHIÊN**, không che nút CTA. |
| **Trải nghiệm Ngoại tuyến (Offline)**| Tệp `mobile/www/offline.html` hiển thị giao diện báo mất mạng thân thiện. | Tệp `offline.html` kết hợp cơ chế thử lại tự động khi có mạng trở lại. | **ĐÃ CẤU HÌNH** trong `capacitor.config.json`. |
| **Quyền Camera & Định vị** | Bật hộp thoại xin quyền khi bấm vào tính năng Chụp ảnh Visual AI hoặc Tìm gần đây. | Hộp thoại thông báo lý do rõ ràng bằng tiếng Việt theo quy chuẩn Apple Review. | **CHỈ XIN QUYỀN KHI NGƯỜI DÙNG CHỦ ĐỘNG BẤM**. |
| **Đo kiểm thực tế thiết bị thật** | Đòi hỏi thiết bị Android cắm cáp ADB hoặc Firebase Test Lab. | Đòi hỏi máy Mac có Xcode để ký số và chạy Simulator/TestFlight. | **GHI NHẬN MINH BẠCH:** Mới kiểm tra mã nguồn dự án và gói Webview, chưa kết luận đạt trên máy thật nếu chưa chạy build. |
