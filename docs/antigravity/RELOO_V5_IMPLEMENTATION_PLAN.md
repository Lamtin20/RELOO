# KẾ HOẠCH TRIỂN KHAI TỔNG THỂ (MASTER IMPLEMENTATION PLAN) — RELOO REAL V5.0
**Dự án:** RELOO Real — Premium Experience Rebuild  
**Quy trình chuẩn hóa:** 9 giai đoạn bắt buộc (Stage 0 -> Stage 8) theo chỉ thị tái thiết Antigravity  
**Chiến lược rủi ro:** Phát triển không phá hủy (Non-destructive) trên nhánh riêng biệt `feature/reloo-v5-antigravity-rebuild`

---

## 1. TIẾN ĐỘ VÀ LỘ TRÌNH 9 GIAI ĐOẠN (STAGE 0 ĐẾN STAGE 8)

| Giai đoạn | Nội dung trọng tâm | Trạng thái hiện tại | Đầu ra chính (Deliverables) |
|---|---|---|---|
| **STAGE 0: DISCOVERY** | Kiểm kê toàn diện 100% kho mã nguồn, màn hình (107 routes), 5 mini-apps, tệp thông số và tài sản thương hiệu. | **HOÀN THÀNH 100%** | `RELOO_V5_REPOSITORY_AUDIT.md`, `RELOO_V5_SCREEN_INVENTORY.md`. |
| **STAGE 1: AUDIT** | Kiểm toán trải nghiệm hiện tại, chụp ảnh kiểm chuẩn baseline đa kích thước (320px, 390px, 768px, 1440px), đánh giá 13 vai trò chuyên gia. | **HOÀN THÀNH 100%** | `RELOO_V5_UX_REVIEW.md`, thư mục `docs/antigravity/BEFORE_AFTER/`. |
| **STAGE 2: VISUAL DIRECTION** | Xây dựng 3 định hướng thị giác độc lập: (A) Premium Modern, (B) Warm Human, (C) High-Performance. So sánh và biện luận đề xuất. | **HOÀN THÀNH 100%** | `RELOO_V5_VISUAL_DIRECTIONS.md`. |
| **STAGE 3: DESIGN APPROVAL** | Trình bày bản so sánh thị giác, hệ thống Design System và kế hoạch ưu tiên để người sở hữu phê duyệt trước khi chuyển dịch diện rộng. | **ĐANG TRÌNH DUYỆT (IN PROGRESS)** | Báo cáo tiến độ tiếng Việt, chờ xác nhận lựa chọn định hướng từ chủ sở hữu. |
| **STAGE 4: FOUNDATION** | Triển khai các biến Design Tokens chuẩn hóa (`v5-foundation.css`), phông chữ Be Vietnam Pro, cấu trúc lưới đáp ứng và quy chuẩn hình ảnh thực tế. | SẴN SÀNG TRIỂN KHAI SAU PHÊ DUYỆT | `RELOO_V5_DESIGN_SYSTEM.md`, `RELOO_V5_IMAGE_POLICY.md`, `v5-foundation.css`. |
| **STAGE 5: PRIORITY USER JOURNEYS** | Xây dựng và kiểm thử các luồng trải nghiệm ưu tiên: Khám phá, Tìm kiếm, Đăng tin, Visual AI, Bản đồ số trực tiếp và luồng Giao dịch cọc. | KẾ TIẾP (SAU STAGE 4) | Mã nguồn các thành phần: `MarketHomeV5`, `SearchBoxV5`, `ListingCardV5`, `LiveMapV5`. |
| **STAGE 6: SCREEN COVERAGE** | Mở rộng ngôn ngữ thiết kế sang toàn bộ các màn hình còn lại và cả 5 mini-app (Thuê đồ, Đồ cũ, Đặt phòng, Việc làm, Nội khu). Tinh chỉnh Capacitor Android/iOS. | KẾ TIẾP | Bao phủ 100% tuyến đường giao diện người dùng; cấu hình an toàn cho Android/iOS. |
| **STAGE 7: QA AND POLISH** | Chạy kiểm thử tự động toàn diện: Visual Regression, Kiểm tra trợ năng Axe-core WCAG 2.1 AA, Đo kiểm Core Web Vitals, Sửa lỗi tràn ngang và tương phản. | KẾ TIẾP | `RELOO_V5_QA_REPORT.md`, ảnh chụp `after-*.png`. |
| **STAGE 8: RELEASE READINESS** | Lập hồ sơ bằng chứng xuất xưởng, đánh giá bảng điểm chất lượng (Rubric >= 95/100), tài liệu hướng dẫn chuyển dịch và kế hoạch hoàn nguyên (Rollback). | KẾ TIẾP | `RELOO_V5_RELEASE_READINESS.md`, sẵn sàng trình duyệt nghiệm thu. |

---

## 2. PHÂN KỲ TRIỂN KHAI CÁC LUỒNG HÀNH TRÌNH ƯU TIÊN (PRIORITY USER JOURNEYS)

### Phân kỳ 1: Nền tảng và Nhận diện Trang chủ (Core Discovery)
- **Màn hình:** Trang chủ (`/`), Khám phá (`/explore`), Tìm kiếm (`/tim-kiem`).
- **Nội dung kỹ thuật:**
  - Nhúng tệp CSS nền tảng `v5-foundation.css` gọn nhẹ vào `MarketplaceShell`.
  - Thay thế khối hero rườm rà bằng biểu ngữ thương mại cao cấp với thông điệp rõ ràng, 4 nút lối vào dịch vụ trực quan.
  - Tối ưu thẻ sản phẩm `ListingCard`: Tỉ lệ 4:3, tải ảnh mượt mà, phân định rõ giá thuê và giá cọc.
  - Sửa lỗi tương phản màu chữ và trùng lặp ID trong ô tìm kiếm.

### Phân kỳ 2: Trí tuệ thị giác & Đăng tin một chạm (Visual AI & Listing Flow)
- **Màn hình:** Đăng tin (`/dang-tin`, `/lend`, `/dashboard/assets/new`).
- **Nội dung kỹ thuật:**
  - Thiết kế luồng đăng tin trực quan: Bước 1 (Tải ảnh thực tế) -> Bước 2 (Visual AI nhận diện thông số) -> Bước 3 (Thiết lập giá thuê & cọc) -> Bước 4 (Xác nhận & Phát hành).
  - Tích hợp MediaPipe Tasks Vision và ZXing trực tiếp trên máy khách để phân tích nhanh mà không tốn chi phí API bên ngoài.
  - Đảm bảo hiển thị huy hiệu mức độ tin cậy và cho phép người dùng chỉnh sửa 100% dữ liệu.

### Phân kỳ 3: Động cơ Bản đồ trực tiếp & Lân cận (Live Map Engine)
- **Màn hình:** Bản đồ trực tiếp (`/ban-do`).
- **Nội dung kỹ thuật:**
  - Tối ưu hóa MapLibre GL 6.16: Tích hợp gạch bản đồ mã nguồn mở (OSM/Martin), gom cụm điểm thông minh (Clustering).
  - Phân tách tuyệt đối giữa tọa độ hiển thị công khai (làm mờ bán kính an toàn) và tọa độ chính xác cho việc giao nhận sau khi cọc.
  - Đồng bộ danh sách sản phẩm dạng thẻ trượt đáy (Bottom Sheet) với khung nhìn bản đồ.

### Phân kỳ 4: Luồng Giao dịch, Cọc minh bạch & Đơn hàng (Transactions & Trust)
- **Màn hình:** Thuê đồ (`/rent/[id]`), Đơn hàng (`/dashboard/orders/[id]`), Ví cọc (`/dashboard/wallet`).
- **Nội dung kỹ thuật:**
  - Bảng bóc tách chi phí rõ ràng từng khoản: Tiền thuê, Tiền cọc an tâm (Cam kết hoàn trả trong 24h), Phí vận chuyển.
  - Lịch chọn ngày thuê (Date Picker) mượt mà, ngăn chặn chọn ngày đã có người thuê.
  - Timeline theo dõi đơn hàng từng bước có cập nhật thời gian thực qua Socket.IO.

---

## 3. KẾ HOẠCH BẢO ĐẢM AN TOÀN VÀ HOÀN NGUYÊN (SAFETY & ROLLBACK PLAN)

1. **Nguyên tắc không gây phá hủy (Non-destructive Isolation):**
   - Mọi thay đổi mã nguồn được thực hiện trên nhánh Git `feature/reloo-v5-antigravity-rebuild`.
   - Nhánh `main` được bảo vệ nguyên trạng, bảo đảm hệ thống hiện tại không bị gián đoạn.
2. **Kế hoạch hoàn nguyên khẩn cấp (Instant Rollback):**
   - Nếu phát hiện bất kỳ lỗi hồi quy nghiêm trọng nào trong quá trình kiểm thử, lệnh hoàn nguyên được thực thi ngay lập tức thông qua:
     ```bash
     git checkout main
     ```
   - Các bản ghi di chuyển cơ sở dữ liệu (Supabase SQL migrations) luôn tuân thủ nguyên tắc bổ sung (Additive-only), không bao giờ xóa bảng hoặc đổi tên cột dữ liệu đang chạy.
3. **Giữ nguyên ranh giới hệ thống:**
   - Không chạm vào thư mục `reloo-world` hoặc mã nguồn Unreal Engine 5.
   - Không thay đổi các khóa bí mật môi trường hoặc cơ chế bảo mật xác thực phiên làm việc.
