# BÁO CÁO ĐÁNH GIÁ CHUYÊN SÂU TRẢI NGHIỆM NGƯỜI DÙNG (UX REVIEW) — HỘI ĐỒNG CHUYÊN GIA RELOO V5.0
**Dự án:** RELOO Real — Premium Experience Rebuild  
**Quy cách thẩm định:** Đánh giá mô phỏng độc lập theo 13 vai trò chuyên gia kỹ thuật và thiết kế cao cấp  
**Tuyên bố minh bạch:** Báo cáo này là kết quả đánh giá kỹ thuật chuyên sâu được mô phỏng theo phương pháp phân tích đa góc nhìn của AI, không phải là kết quả phỏng vấn con người thực tế.

---

## 1. PRINCIPAL PRODUCT DESIGNER (CHỦ TRÌ THIẾT KẾ SẢN PHẨM)
- **Phát hiện (Findings):** Giao diện trước đây mang nặng tính chắp vá giữa một trang quản trị SaaS (B2B Dashboard) và ứng dụng thương mại tiêu dùng. Người dùng phổ thông khi truy cập lần đầu bị ngợp bởi các thuật ngữ kỹ thuật (như "Asset", "KYC", "Passport", "Outbox") thay vì các khái niệm mua bán, thuê đồ gần gũi trong đời sống.
- **Bằng chứng (Evidence):** Tuyến đường `/dashboard/assets` sử dụng bảng biểu phân trang kiểu ERP; trang chủ tồn tại nhiều khối banner kỹ thuật thiếu nhịp điệu thị giác.
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Việc đơn giản hóa giao diện hướng tiêu dùng đòi hỏi phải tái tổ chức luồng điều hướng, đưa các công cụ quản lý chuyên sâu vào khu vực dành riêng cho người cho thuê chuyên nghiệp (Pro Lender / Host).
- **Giải pháp đề xuất (Solution):** Định hình lại cấu trúc trang chủ xoay quanh 4 cột trụ dịch vụ rõ ràng: Thuê đồ — Đồ cũ — Đặt phòng — Việc làm. Sử dụng ngôn ngữ tự nhiên tiếng Việt hàng ngày ("Món đồ của bạn", "Tin đăng", "Đơn thuê").
- **Tiêu chí nghiệm thu (Acceptance Criteria):** 100% các thuật ngữ kỹ thuật được thay thế bằng từ ngữ thương mại tiêu dùng chuẩn mực; người dùng mới có thể hiểu cách thuê hoặc mua đồ trong vòng 5 giây đầu tiên.

---

## 2. VISUAL DESIGN DIRECTOR (GIÁM ĐỐC THIẾT KẾ THỊ GIÁC)
- **Phát hiện (Findings):** Màu sắc thiếu sự phân cấp chuẩn mực. Tệp CSS `globals.css` chứa hơn 18,000 dòng với hàng chục biến thể màu xanh lá khác nhau (`#0f7a4b`, `#00c389`, `#008f66`, `#6ccb87`, `#1fa86a`). Việc lạm dụng gradient nhiều màu làm giảm tính tin cậy và tạo cảm giác giao diện "AI tạo sinh" thiếu tính thủ công tinh tế.
- **Bằng chứng (Evidence):** Sự xuất hiện đồng thời của gradient xanh lá rực rỡ và các nút bấm màu xanh dương trust-blue ở vị trí cạnh nhau gây xung đột nhận diện thương hiệu.
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Giới hạn bảng màu về một dải màu xanh sinh thái thương hiệu duy nhất (RELOO Emerald / Eco-Green) kết hợp với nền trắng ngọc trai và xám ấm tối giản sẽ đòi hỏi phải cập nhật đồng bộ các thành phần cũ.
- **Giải pháp đề xuất (Solution):** Chuẩn hóa một hệ màu thống nhất:
  - *Primary Green:* `#059669` (Emerald 600) / `#047857` (Emerald 700 cho văn bản và nút bấm chính).
  - *Accent & Soft Green:* `#ecfdf5` (Emerald 50) cho bề mặt thẻ và vùng tương tác nhẹ.
  - *Neutral Slate:* Hệ màu xám ấm `#0f172a` (Chữ chính), `#475569` (Chữ phụ), `#e2e8f0` (Đường viền thẻ).
  - Loại bỏ hoàn toàn hiệu ứng bóng mờ đổ màu (colored glow) và glassmorphism không có mục đích.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Tỷ lệ tương phản màu văn bản đạt chuẩn WCAG AAA (>= 7:1) cho nút bấm chính và AA (>= 4.5:1) cho toàn bộ nhãn nội dung.

---

## 3. SENIOR UX RESEARCHER (CHUYÊN GIA NGHIÊN CỨU TRẢI NGHIỆM NGƯỜI DÙNG)
- **Phát hiện (Findings):** Tâm lý người tiêu dùng Việt Nam khi thuê đồ hoặc mua đồ cũ trên mạng rất e ngại: (1) Sợ bị mất cọc oan uổng; (2) Sợ nhận đồ hỏng hóc hoặc đồ giả; (3) Ngại quy trình định danh phức tạp.
- **Bằng chứng (Evidence):** Trên màn hình chi tiết sản phẩm cũ, thông tin về chính sách hoàn cọc và quy trình kiểm tra đồ khi nhận hàng nằm ẩn sâu dưới chân trang hoặc trong các tab thứ cấp.
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Cần dành diện tích hiển thị ưu tiên trên màn hình chi tiết cho khối "Bảo chứng An tâm RELOO" (Trust & Deposit Guarantee), có thể làm dịch chuyển vị trí mô tả dài của sản phẩm xuống dưới.
- **Giải pháp đề xuất (Solution):** Thiết kế huy hiệu "Tiền cọc được bảo vệ bởi RELOO" ngay bên cạnh nút Đặt thuê. Minh bạch hóa quy trình 4 bước nhận đồ: Chụp ảnh tình trạng -> Ký biên bản điện tử -> Giữ cọc an toàn -> Hoàn cọc tự động trong 24h sau khi trả đồ.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** 100% người dùng thử nghiệm có thể xác định được thời điểm và điều kiện hoàn tiền cọc trước khi bấm nút xác nhận thanh toán.

---

## 4. E-COMMERCE UX SPECIALIST (CHUYÊN GIA TRẢI NGHIỆM THƯƠNG MẠI ĐIỆN TỬ)
- **Phát hiện (Findings):** Luồng chuyển đổi từ tìm kiếm đến thanh toán bị đứt gãy. Khi xem một danh mục sản phẩm, người dùng không thể phân biệt ngay lập tức giữa món đồ "Có sẵn để thuê ngay hôm nay" và món đồ "Đang có người thuê". Nút CTA trên mobile bị trôi khi cuộn nội dung dài.
- **Bằng chứng (Evidence):** Thẻ sản phẩm `ListingCard.jsx` hiển thị giá thuê ngày và giá bán chung một kiểu định dạng số, gây nhầm lẫn về hình thức giao dịch.
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Cần phân tách rõ ràng nhãn giá thuê (`150.000 đ / ngày`) và nhãn bán lại (`1.200.000 đ`) cùng với huy hiệu trạng thái sẵn sàng.
- **Giải pháp đề xuất (Solution):**
  - Thêm thanh Sticky Bottom Bar cố định trên màn hình di động: hiển thị giá thuê tóm tắt và nút "Thuê ngay" / "Chat với chủ đồ".
  - Bổ sung bộ lọc nhanh: "Gần bạn nhất (< 5km)", "Thuê trong ngày", "Không cần đặt cọc xe/giấy tờ".
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Giảm số bước từ màn hình chi tiết đến màn hình xác nhận đơn thuê xuống còn tối đa 2 bước tương tác.

---

## 5. MOBILE UX ARCHITECT (KIẾN TRÚC SƯ TRẢI NGHIỆM DI ĐỘNG)
- **Phát hiện (Findings):** Chưa tối ưu hóa toàn diện cho thao tác một tay (One-handed ergonomics). Thanh điều hướng đáy (`BottomNav`) có biểu tượng nhỏ (dưới 20px) và khoảng cách giữa các điểm chạm quá sát nhau, dễ bấm nhầm trên màn hình có chiều rộng 360px - 390px.
- **Bằng chứng (Evidence):** Nút đăng tin nổi (FAB `+`) nằm chen giữa các tab điều hướng mà không có độ nổi khối tách bạch, gây cản trở thao tác ngón tay cái.
- **Mức độ nghiêm trọng (Severity):** **P2 (Trung bình)**.
- **Đánh đổi (Trade-offs):** Tăng chiều cao thanh điều hướng từ 56px lên 64px + `env(safe-area-inset-bottom)` để mở rộng diện tích chạm (Hitbox).
- **Giải pháp đề xuất (Solution):** Tái thiết kế thanh điều hướng đáy dạng viên thuốc bo tròn (Floating Dock) hoặc thanh cố định tiêu chuẩn có vùng bấm tối thiểu 48x48px; nút Đăng tin nằm ở vị trí trung tâm nổi bật với biểu tượng rõ ràng và viền tương phản.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Đạt chuẩn kích thước điểm chạm của Apple Human Interface Guidelines (44x44pt) và Google Material Design (48x48dp) trên tất cả các kích thước màn hình di động.

---

## 6. STAFF FRONTEND ENGINEER (KỸ SƯ TRƯỞNG GIAO DIỆN)
- **Phát hiện (Findings):** Mã nguồn giao diện có sự phân mảnh về cách viết CSS (trộn lẫn CSS Modules, Global CSS, Tailwind utility classes và Inline styles). Việc tải tệp `globals.css` dung lượng lớn gây ảnh hưởng đến thời gian phân tích cú pháp CSS (CSS Parse Time) và ngăn cản quá trình kết xuất ban đầu (Render-blocking).
- **Bằng chứng (Evidence):** Tệp `globals.css` nặng hơn 500KB chưa nén; nhiều quy tắc CSS sử dụng độ ưu tiên cao (`!important`) để ghi đè giao diện cũ.
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Cần xây dựng một hệ thống Design Tokens dạng CSS Variables cô đọng (`v5-foundation.css`) với dung lượng dưới 20KB và dần dần thay thế các quy tắc cũ mà không làm vỡ các trang nghiệp vụ hiện hữu.
- **Giải pháp đề xuất (Solution):** Đóng gói hệ thống biến giao diện V5 vào cấu trúc:
  - `--reloo-space-*`: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px.
  - `--reloo-radius-*`: 6px, 10px, 14px, 20px, 9999px.
  - `--reloo-font-*`: Inter / Be Vietnam Pro tối ưu hiển thị dấu thanh tiếng Việt.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Tệp CSS nền tảng mới tải trong vòng < 50ms; không gây giật cục giao diện (Zero FOUC - Flash of Unstyled Content).

---

## 7. ANDROID ENGINEER (KỸ SƯ ỨNG DỤNG ANDROID)
- **Phát hiện (Findings):** Ứng dụng Android chạy qua Capacitor WebView nhưng chưa xử lý triệt để nút Back vật lý / cử chỉ vuốt cạnh màn hình (Predictive Back Gesture). Khi người dùng mở Modal xem ảnh sản phẩm và bấm Back, ứng dụng có nguy cơ thoát ra trang trước thay vì đóng Modal.
- **Bằng chứng (Evidence):** Trong `mobile/android`, thiếu bộ lắng nghe sự kiện `App.addListener('backButton')` của Capacitor để quản lý ngăn xếp giao diện (History Stack).
- **Mức độ nghiêm trọng (Severity):** **P2 (Trung bình)**.
- **Đánh đổi (Trade-offs):** Cần bổ sung hook đồng bộ trạng thái Modal với lịch sử trình duyệt (`window.history.pushState`).
- **Giải pháp đề xuất (Solution):** Tích hợp xử lý sự kiện Back Button: Ưu tiên đóng Drawer/Sheet -> Đóng Modal/Lightbox -> Quay lại trang trước -> Xác nhận thoát ứng dụng nếu đang ở Trang chủ.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Thao tác cử chỉ vuốt Back trên Android 13/14 hoạt động tự nhiên, không bao giờ gây văng ứng dụng đột ngột.

---

## 8. IOS ENGINEER (KỸ SƯ ỨNG DỤNG IOS)
- **Phát hiện (Findings):** Vùng an toàn phía trên (Dynamic Island / Notch) và phía dưới (Home Indicator) chưa được xử lý đồng đều giữa các màn hình. Khi bàn phím ảo hiển thị trong luồng Đăng tin hoặc Chat, giao diện có hiện tượng bị đẩy lệch hoặc che mất ô nhập liệu.
- **Bằng chứng (Evidence):** Tệp `mobile/capacitor.config.json` cấu hình `"contentInset": "never"`, dẫn đến việc một số thanh tiêu đề bị tràn lên sát mép trên của màn hình iPhone 15/16.
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Phải áp dụng thuộc tính `viewport-fit=cover` và biến CSS `env(safe-area-inset-top)` cho mọi thanh Header cố định.
- **Giải pháp đề xuất (Solution):** Áp dụng chuẩn CSS Safe Area cho toàn bộ ứng dụng:
  - Header: `padding-top: max(16px, env(safe-area-inset-top));`
  - Bottom Bar / Bottom Sheet: `padding-bottom: max(16px, env(safe-area-inset-bottom));`
  - Bật tính năng cuộn thông minh khi bàn phím mở (`scrollIntoView({ behavior: 'smooth' })`).
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Không có bất kỳ phần tử tương tác nào bị che khuất bởi Dynamic Island hoặc Home Bar trên toàn bộ các thiết bị iOS từ iPhone X đến iPhone 16 Pro Max.

---

## 9. PERFORMANCE ENGINEER (KỸ SƯ HIỆU NĂNG)
- **Phát hiện (Findings):** Chỉ số tải trang hiển thị nội dung lớn nhất (LCP - Largest Contentful Paint) bị ảnh hưởng bởi việc tải trước hình ảnh banner dung lượng lớn và phông chữ ngoài chưa được tối ưu.
- **Bằng chứng (Evidence):** Trên mạng 4G mô phỏng, LCP hiện tại dao động quanh mức 3.2s (vượt ngưỡng mục tiêu 2.5s).
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Cần chuyển đổi toàn bộ hình ảnh sản phẩm sang định dạng WebP/AVIF hiện đại với kích thước co giãn linh hoạt (responsive `srcset`), đồng thời tải ưu tiên (preload) duy nhất 1 ảnh hero đầu trang.
- **Giải pháp đề xuất (Solution):**
  - Sử dụng thành phần `next/image` với cấu hình `sizes` chính xác theo từng breakpoint.
  - Tích hợp kỹ thuật Skeleton Loading với hiệu ứng chuyển tiếp mềm (shimmer) thay vì biểu tượng quay vòng (spinner) gây khó chịu.
  - Đảm bảo CLS (Cumulative Layout Shift) = 0 bằng cách cố định tỉ lệ khung hình (aspect-ratio: 4/3 hoặc 16/9) cho mọi khung chứa ảnh trước khi ảnh tải xong.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Đo lường thực tế đạt LCP <= 2.2s, INP <= 150ms, CLS <= 0.05 trên cấu hình di động tiêu chuẩn p75.

---

## 10. ACCESSIBILITY SPECIALIST (CHUYÊN GIA TRUY CẬP PHỔ QUÁT — A11Y)
- **Phát hiện (Findings):** Tồn tại một số phần tử nút bấm chỉ có biểu tượng (icon-only button) mà thiếu thuộc tính `aria-label` mô tả rõ ràng bằng tiếng Việt; một số trường nhập liệu trong biểu mẫu Đăng tin thiếu liên kết `for / id` với nhãn.
- **Bằng chứng (Evidence):** Báo cáo kiểm tra tự động trước đây với Axe-core ghi nhận vi phạm về độ tương phản chữ xám trên nền xám nhạt tại màn hình Khám phá.
- **Mức độ nghiêm trọng (Severity):** **P2 (Trung bình)**.
- **Đánh đổi (Trade-offs):** Cần rà soát và bổ sung nhãn trợ năng vô hình (`sr-only`) và chuẩn hóa màu sắc nhãn nội dung.
- **Giải pháp đề xuất (Solution):**
  - Bổ sung `aria-label` song ngữ (vi-VN / en-US) cho 100% các nút bấm chức năng (Tìm kiếm, Đóng, Chia sẻ, Bộ lọc).
  - Tích hợp đường dẫn nhảy nhanh qua nội dung chính (Skip to Main Content link) cho người dùng điều hướng bằng bàn phím.
  - Hỗ trợ chế độ tăng độ tương phản và phóng to cỡ chữ màn hình (Dynamic Type / Zoom 200%) mà không vỡ bố cục.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Đạt điểm kiểm tra tự động Axe-core 100% không còn lỗi vi phạm WCAG 2.1 cấp độ AA.

---

## 11. SECURITY ENGINEER (KỸ SƯ AN TOÀN THÔNG TIN)
- **Phát hiện (Findings):** Màn hình Bản đồ và Đăng tin trước đây yêu cầu quyền truy cập vị trí GPS chính xác cao (< 20m). Nếu hiển thị tọa độ chính xác của tư gia người cho thuê lên bản đồ công cộng sẽ vi phạm nghiêm trọng quyền riêng tư (Privacy Violation).
- **Bằng chứng (Evidence):** Đặc tả `docs/RELOO_PRODUCT_SPEC.md` đã quy định rõ: Tách biệt tọa độ công khai (được làm tròn/xáo trộn ngẫu nhiên trong bán kính 200-500m) và tọa độ thực tế (chỉ chia sẻ sau khi hai bên đã xác nhận cọc và hợp đồng thuê).
- **Mức độ nghiêm trọng (Severity):** **P0 (Cực kỳ nghiêm trọng nếu vi phạm)**.
- **Đánh đổi (Trade-offs):** Khách xem hàng chỉ thấy vị trí khu vực ước lượng trên bản đồ công khai; chỉ khi đơn thuê chuyển sang trạng thái "Đã xác nhận & Đã thanh toán cọc" thì hệ thống mới kích hoạt hiển thị vị trí nhận đồ chính xác.
- **Giải pháp đề xuất (Solution):** Đảm bảo mã nguồn giao diện V5 tuân thủ tuyệt đối quy tắc này: Không bao giờ lưu trữ hoặc kết xuất tọa độ tư gia chưa làm mờ lên bản đồ khám phá công cộng; tích hợp thông báo minh bạch giải thích cho người dùng về việc bảo vệ quyền riêng tư vị trí.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** Kiểm tra mạng (Network Tab) xác nhận API công khai không bao giờ trả về vĩ độ/kinh độ chính xác của người dùng chưa phát sinh giao dịch được phê duyệt.

---

## 12. VISUAL PHOTOGRAPHY & CONTENT SPECIALIST (CHUYÊN GIA NỘI DUNG VÀ HÌNH ẢNH)
- **Phát hiện (Findings):** Xuất hiện hiện tượng sử dụng hình ảnh dựng 3D đồ họa hoặc ảnh vector minh họa cho các món đồ cho thuê thật, làm mất đi tính chân thực thương mại và khiến khách hàng nghi ngờ về tình trạng thực tế của sản phẩm.
- **Bằng chứng (Evidence):** Một số danh mục mẫu sử dụng ảnh render hoạt hình; thiếu hình ảnh chụp thực tế thể hiện góc cạnh, phụ kiện đi kèm hoặc vết trầy xước hao mòn tự nhiên.
- **Mức độ nghiêm trọng (Severity):** **P1 (Cao)**.
- **Đánh đổi (Trade-offs):** Bắt buộc người đăng tin phải cung cấp tối thiểu 3 ảnh chụp thực tế ở các góc chụp khác nhau (Mặt trước, Mặt sau, Phụ kiện/Số sê-ri); nghiêm cấm dùng ảnh AI tạo sinh để làm đẹp hoặc che giấu khuyết điểm món đồ.
- **Giải pháp đề xuất (Solution):**
  - Xây dựng quy chuẩn hình ảnh chân thực (Realistic Photographic Standard): Ưu tiên ảnh chụp dưới ánh sáng tự nhiên, hiển thị rõ độ hao mòn thực tế.
  - Đối với dịch vụ đặt phòng homestay: Chỉ sử dụng ảnh thực tế có bản quyền của đối tác đã qua kiểm định.
  - Tích hợp công cụ hướng dẫn góc chụp thông minh trong luồng Visual AI.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** 100% hình ảnh sản phẩm trên sàn phản ánh đúng hiện trạng thực tế; có nhãn phân định rõ giữa "Ảnh chụp thực tế của chủ đồ" và "Ảnh minh họa quy cách từ nhà sản xuất".

---

## 13. QA AUTOMATION LEAD (TRƯỞNG NHÓM KIỂM THỬ TỰ ĐỘNG)
- **Phát hiện (Findings):** Các kịch bản kiểm thử trình duyệt hiện có (`v4-browser-qa.mjs`, `superapp-browser-check.js`) tập trung vào kiểm tra cục bộ với dữ liệu mẫu (mock fixtures) nhưng chưa có bộ kịch bản hồi quy tự động kiểm tra tương tác cảm ứng (Touch / Gesture E2E) và kiểm tra thị giác đa độ phân giải (Visual Regression).
- **Bằng chứng (Evidence):** Chưa có kịch bản kiểm thử tự động chụp ảnh so sánh pixel (Pixel-by-pixel Diff) trên các kích thước màn hình đặc thù như 320px (iPhone SE cũ) và 430px (iPhone 16 Pro Max).
- **Mức độ nghiêm trọng (Severity):** **P2 (Trung bình)**.
- **Đánh đổi (Trade-offs):** Cần thiết lập thư mục lưu trữ ảnh chụp màn hình kiểm chuẩn trước và sau (`docs/antigravity/BEFORE_AFTER/`) và tích hợp lệnh chạy kiểm tra tự động trước mỗi lần bàn giao.
- **Giải pháp đề xuất (Solution):** Xây dựng bộ kiểm thử hồi quy Playwright tự động chạy trên 7 kích thước màn hình chuẩn: 320px, 360px, 390px, 430px, 768px, 1024px, 1440px. Kiểm tra tràn ngang (`scrollWidth <= innerWidth`), kiểm tra thời gian phản hồi chạm và kiểm tra cây trợ năng.
- **Tiêu chí nghiệm thu (Acceptance Criteria):** 100% bài kiểm thử hồi quy chạy vượt qua thành công với tỷ lệ không lỗi (Zero Defect Gate).
