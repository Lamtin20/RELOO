# BÁO CÁO KIỂM TOÁN KHO MÃ NGUỒN VÀ MÔI TRƯỜNG PHÁT TRIỂN RELOO REAL V5.0
**Dự án:** RELOO Real — Premium Experience Rebuild  
**Phiên bản kiểm toán:** V5.0-AUDIT-BASELINE  
**Thời điểm thực hiện:** 08/11/2026 (Asia/Ho_Chi_Minh)  
**Nhánh làm việc cách ly:** `feature/reloo-v5-antigravity-rebuild`  
**Trạng thái:** HOÀN THÀNH KIỂM TOÁN CƠ SỞ (SSOT & REPO AUDIT COMPLETE)

---

## 1. TỔNG QUAN HỆ THỐNG VÀ PHẠM VI (SCOPE DEFINITION)

### 1.1. Phạm vi thực hiện (In-scope)
- **Ứng dụng Web phản hồi (Responsive Web):** Toàn bộ giao diện người dùng trên Desktop (1280px, 1440px, 1920px), Laptop, Tablet (768px, 1024px) và Mobile (320px, 360px, 390px, 430px).
- **Ứng dụng Di động (Mobile Apps):** Nền tảng ứng dụng Android (`mobile/android`) và iOS (`mobile/ios`) xây dựng trên framework lai Capacitor 8.x bao bọc Next.js runtime.
- **Hệ thống Mini-Apps:**
  1. *Thuê đồ (Rental Marketplace)* — `/explore?transaction=RENT`, `/product/[id]`, `/rent/[id]`
  2. *Đồ cũ / Mua bán (Secondhand Re-commerce)* — `/explore?transaction=SALE`, `/purchase/[id]`
  3. *Đặt phòng & Lưu trú (Stays Booking)* — `/dat-phong`, `/dat-phong/chu-nha`, `/dat-phong/quan-ly`
  4. *Việc làm linh hoạt (Flexible Jobs)* — `/viec-lam`, `/viec-lam/dich-vu`
  5. *RELOO Nội Khu (Residential Community Sharing)* — `/noi-khu`
- **Các luồng trải nghiệm lõi xuyên suốt:**
  - Định vị & Bản đồ số trực tiếp (Live Map Engine: OSM + MapLibre GL + Photon + OSRM)
  - Trí tuệ thị giác đăng tin (Visual AI Product Capture & Verification)
  - Tìm kiếm hợp nhất, bộ lọc đa chiều & phân loại ngành hàng
  - Nhắn tin tương tác thời gian thực (Realtime Chat Socket.IO)
  - Xác minh danh tính người dùng (KYC & VietOCR / WebAuthn Passkeys)
  - Thanh toán cọc & hợp đồng giao dịch điện tử minh bạch.

### 1.2. Phạm vi loại trừ nghiêm ngặt (Out-of-scope / Excluded)
- **RELOO World, Unreal Engine 5 (UE5):** Thư mục `D:\reloo_project\reloo-world` và `reloo-world 5.8`.
- **Game server, Dedicated Servers, 3D Avatar DNA, NFT Minting Engine, Smart Contracts Blockchain:** Giữ nguyên vẹn, không chỉnh sửa hoặc xóa bất kỳ tệp tin nào thuộc phạm vi này.
- **Backend Core, PostgreSQL/Supabase DB Schema, API Contracts:** Duy trì tính tương thích ngược 100%, bảo toàn dữ liệu giao dịch và xác thực người dùng.

---

## 2. NGUỒN CHÂN LÝ DUY NHẤT (SSOT AUDIT & RECONCILIATION)

### 2.1. Kết quả tìm kiếm tài liệu chuẩn
- **Yêu cầu đối chiếu:** Tìm kiếm `RELOO_Master_Specification_v1.0.md`.
- **Kết quả điều tra thực tế:**
  - Tệp `RELOO_Master_Specification_v1.0.md` **hoàn toàn không tồn tại** trong toàn bộ kho lưu trữ `D:\reloo_project`.
  - Tồn tại tệp `D:\reloo_project\RELOO_Master_Specification_v2.0.md` (611 dòng, cập nhật kiến trúc mở rộng tới mục 44: Nội Khu, Rental Care, Operations Center, iOS preparation).
  - Tồn tại tệp dự phòng `docs/RELOO_PRODUCT_SPEC.md` tại `D:\reloo_project\reloo-app\docs\RELOO_PRODUCT_SPEC.md` (cập nhật mới nhất ngày 07/11/2026: Private confirmed location, Photon scheduled freshness, Live Map Engine v1.0).
- **Quyết định tuân thủ (SSOT Protocol):**
  - Sử dụng `docs/RELOO_PRODUCT_SPEC.md` làm tài liệu tham chiếu quy cách chức năng nghiệp vụ tạm thời (Provisional Reference).
  - Kết hợp với các nguyên tắc cốt lõi của `RELOO_Master_Specification_v2.0.md` (không can thiệp World/UE5, bảo đảm Client là untrusted, Backend authoritative cho trạng thái giao dịch).
  - Không tự ý bịa đặt hoặc viết lại đặc tả nghiệp vụ khi chưa có phê duyệt từ cấp thẩm quyền.

---

## 3. THỰC THỂ CÔNG NGHỆ VÀ NGĂN XẾP PHẦN MỀM (ACTUAL TECH STACK)

| Thành phần | Công nghệ / Thư viện thực tế | Phiên bản | Ghi chú vận hành |
|---|---|---|---|
| **Web Framework** | Next.js (App Router, Webpack builder) | **16.4.2** | React 19.2.4, Node v24.14.1 |
| **Mobile Runtime** | Capacitor Core & Plugins | **8.5.3 / 8.1.2** | Bao bọc webview kết nối `https://reloo.vn` (hỗ trợ offline fallback) |
| **Android Project** | Android Studio / Gradle wrapper 8.14.3 | Android SDK 36 | `mobile/android/app` (Java/Kotlin, AndroidManifest chuẩn) |
| **iOS Project** | Xcode Project / CocoaPods | iOS 16+ target | `mobile/ios/App` (Swift, Info.plist, safe-area configuration) |
| **Bản đồ số (Live Map)**| MapLibre GL JS | **6.16.0** | Tích hợp OSM Tiles, Photon Geocoding, OSRM routing |
| **Thị giác máy tính (Visual AI)**| MediaPipe Tasks Vision + ZXing WASM | **0.10.32 / 3.1.6** | Nhận diện vật thể, quét QR Căn cước công dân trực tiếp trên máy khách |
| **Thời gian thực** | Socket.IO Client / Server | **4.8.3** | Quản lý kênh chat, tọa độ giao hàng, thông báo tức thì |
| **Cơ sở dữ liệu** | Supabase SSR / Client + Postgres | **2.110.7 / 8.22.0** | RLS Security, API Traces, Outbox notifications |
| **Giao diện & Icon** | Lucide React + Morphicons | **1.24.0 / 1.7.1** | Hệ thống icon tối ưu, biểu tượng động mượt mà |
| **Quốc tế hóa (i18n)** | Custom LocaleProvider | vi-VN / en-US | Mặc định tiếng Việt, bảo toàn giao diện tiếng Anh |

---

## 4. HIỆN TRẠNG GIAO DIỆN & VẤN ĐỀ TRẢI NGHIỆM ĐƯỢC PHÁT HIỆN

1. **Sự quá tải của tệp CSS toàn cục (`globals.css` - 18,915 dòng):**
   - Chứa nhiều lớp quy tắc chồng chéo qua các giai đoạn phát triển trước (từ V1 đến V4).
   - Xuất hiện xung đột giữa các gradient xanh lá (`--reloo-gradient-brand`, `--reloo-gradient-hero-flow`, `--reloo-gradient-home-flow`).
   - Cần tinh giản và quy hoạch lại thành hệ thống Design Tokens có cấu trúc phân tầng rõ ràng (Tokens -> Elements -> Components -> Layouts).

2. **Cơ chế tải và hiển thị hình ảnh sản phẩm:**
   - Đã có thư mục `output/v4/BEFORE_AFTER_SCREENSHOTS` lưu trữ ảnh chụp màn hình kiểm chuẩn.
   - Thư viện hình ảnh danh mục (`public/images/categories-3d`, `categories-refreshed`) có sự pha trộn giữa render 3D và đồ họa biểu tượng.
   - Chính sách hình ảnh thật (Authentic Photographic Standard) cần được áp dụng nhất quán trên các thẻ niêm yết sản phẩm thật, tránh dùng hình ảnh 3D đồ chơi giả lập sản phẩm thương mại thật.

3. **Trải nghiệm di động và độ nhạy phản hồi (Responsive & Touch UX):**
   - Thanh điều hướng đáy (`BottomNav.jsx`) có 5 nút bấm cơ bản nhưng padding trên các dòng màn hình có "tai thỏ" (Safe Area Insets) cần đồng bộ chặt chẽ với biến CSS `env(safe-area-inset-bottom)`.
   - Vùng bấm (Touch Target) của một số nút lọc trên màn hình nhỏ (320px - 360px) có kích thước dưới 44x44px.

4. **Trạng thái giao diện rỗng và báo lỗi (Empty / Error States):**
   - Đã có component `EmptyState.jsx` nhưng chưa bao phủ hết các trường hợp mất kết nối mạng (Network Error / Weak Connection) hoặc không tìm thấy kết quả tìm kiếm với từ khóa phức tạp bằng tiếng Việt có dấu.
