# HỆ THỐNG THIẾT KẾ HỢP NHẤT (UNIFIED DESIGN SYSTEM) — RELOO REAL V5.0
**Dự án:** RELOO Real — Premium Experience Rebuild  
**Quy chuẩn áp dụng:** WCAG 2.1 AA/AAA, Apple HIG, Material Design 3, Tiếng Việt chuẩn mực  
**Tệp biểu đạt biến CSS:** `app/v5-foundation.css` / `app/globals.css`

---

## 1. BẢNG MÀU THƯƠNG HIỆU VÀ MÀU NGHIỆP VỤ (BRAND & SEMANTIC COLORS)

### 1.1. Màu sắc thương hiệu chính (Primary Eco Brand)
- `--reloo-primary-50`: `#ecfdf5` (Xanh ngọc siêu nhạt — Dùng cho nền thẻ nổi bật, badge thành công, hover nhẹ).
- `--reloo-primary-100`: `#d1fae5` (Xanh ngọc nhạt — Viền thẻ khuyến mãi, tag danh mục kích hoạt).
- `--reloo-primary-500`: `#10b981` (Xanh lục bảo tươi — Điểm nhấn icon, đồ thị).
- `--reloo-primary-600`: `#059669` (Màu thương hiệu chuẩn — Nút CTA chính, liên kết điều hướng).
- `--reloo-primary-700`: `#047857` (Xanh lục bảo đậm — Trạng thái active/hover của nút, chữ quan trọng cần tương phản cao).
- `--reloo-primary-900`: `#064e3b` (Xanh bóng đêm — Nền thanh tiêu đề đặc biệt).

### 1.2. Màu trung tính cao cấp (Neutral Slate & Charcoal)
- `--reloo-slate-900`: `#0f172a` (Chữ tiêu đề chính, tạo chiều sâu và độ sắc nét tối đa).
- `--reloo-slate-700`: `#334155` (Chữ nội dung thân bài, mô tả sản phẩm).
- `--reloo-slate-500`: `#64748b` (Chữ phụ, ghi chú ngày tháng, khoảng cách địa lý).
- `--reloo-slate-300`: `#cbd5e1` (Đường phân cách thứ cấp, placeholder mờ).
- `--reloo-slate-200`: `#e2e8f0` (Đường viền thẻ chuẩn 1px, tạo sự ngăn nắp, tinh tế).
- `--reloo-slate-50`: `#f8fafc` (Nền nền tảng tổng thể, giảm chói mắt trên màn hình OLED/LCD).
- `--reloo-surface-pure`: `#ffffff` (Nền trắng tinh khiết của thẻ sản phẩm, nổi bật hình ảnh thực tế).

### 1.3. Màu nghiệp vụ & Cảnh báo (Semantic System)
- **Thành công (Success / Đã hoàn tất cọc):**
  - Text: `#047857`, Background: `#ecfdf5`, Border: `#a7f3d0`
- **Cảnh báo (Warning / Chờ xác nhận / Sắp hết hạn):**
  - Text: `#b45309`, Background: `#fffbeb`, Border: `#fde68a`
- **Rủi ro / Lỗi (Danger / Tranh chấp / Đơn hủy):**
  - Text: `#b91c1c`, Background: `#fef2f2`, Border: `#fecaca`
- **Thông tin (Info / Hướng dẫn an toàn):**
  - Text: `#1d4ed8`, Background: `#eff6ff`, Border: `#bfdbfe`

---

## 2. QUY CHUẨN PHÔNG CHỮ VÀ TIẾNG VIỆT (TYPOGRAPHY)

Sử dụng phông chữ **Be Vietnam Pro** (được tinh chỉnh chuyên biệt cho bộ gõ và thanh điệu tiếng Việt, không lỗi nhảy dấu hoặc vỡ khoảng cách chữ) kết hợp font số học **Inter / SF Pro Display**:

| Cấp bậc (Hierarchy) | Kích thước (Size / Line-height) | Độ đậm (Weight) | Trường hợp sử dụng |
|---|---|---|---|
| **Display Hero** | `32px / 40px` (Mobile: `26px / 34px`) | SemiBold (600) | Tiêu đề chính trang chủ, thông điệp mở đầu dịch vụ. |
| **Heading 1 (H1)**| `24px / 32px` (Mobile: `20px / 28px`) | Bold (700) | Tên sản phẩm chi tiết, tiêu đề màn hình chính. |
| **Heading 2 (H2)**| `18px / 26px` (Mobile: `16px / 24px`) | SemiBold (600) | Tiêu đề các phân mục sản phẩm, khối dịch vụ. |
| **Heading 3 (H3)**| `15px / 22px` | Medium (500) | Tiêu đề thẻ nhỏ, tên chủ đồ, nhãn trường nhập liệu. |
| **Body Regular** | `14px / 22px` | Regular (400) | Đoạn văn bản mô tả, điều khoản thuê, nội dung tin nhắn. |
| **Body Small** | `12px / 18px` | Regular (400) | Khoảng cách km, thời gian đăng, nhãn thông số phụ. |
| **Price Tag** | `18px / 24px` | Bold (700) | Giá thuê hiển thị VND nguyên bản (`150.000 đ/ngày`). |

---

## 3. HỆ THỐNG KHOẢNG TRẮNG, BO GÓC VÀ ĐỔ BÓNG (SPACING, RADII & ELEVATION)

### 3.1. Khoảng trắng chuẩn mực (8pt Grid System)
- `--reloo-space-1`: `4px` (Khoảng cách icon và nhãn nhỏ)
- `--reloo-space-2`: `8px` (Khoảng cách giữa các chip lọc, padding trong ô input)
- `--reloo-space-3`: `12px` (Khoảng cách giữa các phần tử trong thẻ)
- `--reloo-space-4`: `16px` (Padding chuẩn của màn hình mobile, margin khối nhỏ)
- `--reloo-space-5`: `20px` (Khoảng cách giữa các thẻ sản phẩm trong lưới)
- `--reloo-space-6`: `24px` (Padding khối chức năng trên tablet/desktop)
- `--reloo-space-8`: `32px` (Khoảng cách giữa các phân đoạn nội dung lớn)
- `--reloo-space-12`: `48px` (Khoảng cách phần chân trang và khu vực khám phá)

### 3.2. Bán kính bo góc (Border Radii)
- `--reloo-radius-sm`: `6px` (Nút phụ nhỏ, ô checkbox, chip lọc con)
- `--reloo-radius-md`: `10px` (Ô nhập liệu, nút bấm tiêu chuẩn)
- `--reloo-radius-lg`: `14px` (Thẻ sản phẩm, khung chứa ảnh, khối thông tin)
- `--reloo-radius-xl`: `20px` (Hộp thoại Modal, Bottom Sheet di động)
- `--reloo-radius-pill`: `9999px` (Nút dạng viên thuốc, thanh tìm kiếm nổi)

### 3.3. Độ nổi khối & Đổ bóng (Elevation & Shadows)
- **Level 0 (Flat):** `border: 1px solid var(--reloo-slate-200); box-shadow: none;`
- **Level 1 (Card Hover / Subtle):** `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04);`
- **Level 2 (Dropdown / Floating Header):** `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04);`
- **Level 3 (Modal / Bottom Sheet / Sticky Nav):** `box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06);`

---

## 4. QUY CHUẨN ĐIỂM NGẮT PHẢN HỒI (RESPONSIVE BREAKPOINTS)

| Điểm ngắt | Độ rộng màn hình | Thiết bị đại diện | Cấu trúc lưới sản phẩm |
|---|---|---|---|
| **xs** | `320px - 389px` | iPhone SE, Galaxy A-series nhỏ | Lưới 1 cột hoặc 2 cột mini (gap 8px), padding biên 12px. |
| **sm** | `390px - 639px` | iPhone 14/15/16, Pixel 8, Galaxy S24 | Lưới 2 cột cân đối (gap 12px), thanh điều hướng đáy nổi 64px. |
| **md** | `640px - 767px` | Màn hình gập, tablet khổ đứng nhỏ | Lưới 2 - 3 cột, hiển thị thanh tìm kiếm mở rộng. |
| **lg** | `768px - 1023px` | iPad, Galaxy Tab khổ đứng | Lưới 3 cột chuẩn, hiển thị thanh công cụ lọc cố định bên trái. |
| **xl** | `1024px - 1279px`| iPad Pro ngang, Laptop mỏng nhẹ | Lưới 4 cột, menu ngang đầy đủ, bản đồ chia đôi màn hình (Split View). |
| **2xl** | `>= 1280px` | Màn hình Desktop lớn, iMac | Lưới 4 - 5 cột (tối đa chiều rộng 1280px căn giữa). |

---

## 5. THÀNH PHẦN GIAO DIỆN LÕI (CORE COMPONENTS)

### 5.1. Nút bấm (Buttons)
- **Primary Button:** Nền `#059669`, chữ trắng, bo góc 10px, chiều cao tối thiểu 44px (mobile 48px), hiệu ứng hover chuyển dần sang `#047857`, có trạng thái loading spinner tích hợp khi gửi dữ liệu.
- **Secondary Button:** Nền `#ffffff`, viền 1.5px `#059669`, chữ `#059669`.
- **Ghost / Tertiary Button:** Nền trong suốt, chữ `#334155`, hover nền `#f1f5f9`.
- **Danger Button:** Nền `#dc2626`, chữ trắng — Dùng cho hành động hủy đơn hoặc báo cáo vi phạm.

### 5.2. Thanh tìm kiếm đa kênh (Universal Search Bar)
- Tích hợp biểu tượng kính lúp thanh lịch, ô nhập liệu gợi ý mượt mà bằng tiếng Việt (`"Bạn đang cần thuê gì hôm nay?"`).
- Nút chọn phạm vi tìm kiếm nhanh: Toàn bộ / Thuê đồ / Đồ cũ / Đặt phòng / Việc làm.
- Cửa sổ gợi ý xổ xuống (Autocomplete Dropdown) hiển thị các danh mục phổ biến và lịch sử tìm kiếm gần nhất lưu trữ trên máy khách (không lưu cookie xâm phạm quyền riêng tư).

### 5.3. Thẻ niêm yết sản phẩm (Product Listing Card)
- **Khung chứa ảnh tỉ lệ 4:3:** Hình ảnh thật sắc nét, góc bo 12px, có hiệu ứng zoom nhẹ (scale 1.03) khi hover trên desktop.
- **Huy hiệu thông minh:**
  - `Bảo chứng RELOO` (Màu xanh ngọc lục bảo).
  - `Đồ có sẵn hôm nay` (Chấm xanh lá nhấp nháy nhẹ).
  - `Cách 1.2 km` (Hiển thị khoảng cách dựa trên vị trí quận/huyện đã chọn).
- **Khối giá rõ ràng:** Số tiền to đậm màu đen than (`200.000 đ`) kèm đơn vị (`/ ngày`), dòng tiền cọc ghi chú rõ bên dưới (`Cọc an tâm: 1.500.000 đ`).

### 5.4. Bản đồ và Điểm đánh dấu (Map & Markers)
- Marker phân loại dịch vụ sinh động với màu sắc thương hiệu:
  - Điểm thuê đồ: Marker xanh lá hình chiếc hộp hoặc máy ảnh.
  - Điểm đặt phòng: Marker xanh dương hình ngôi nhà.
  - Điểm nội khu: Marker vàng cam hình tòa nhà cư dân.
- Cụm điểm gom nhóm (Clustering): Vòng tròn bo mịn hiển thị số lượng sản phẩm trong khu vực, tự động bung điểm khi zoom gần.
- Bảng trượt danh sách sản phẩm lân cận (Bottom Sheet): Cho phép người dùng vừa xem bản đồ vừa lướt xem thẻ sản phẩm tương ứng mà không phải chuyển trang.

### 5.5. Trạng thái phản hồi (Feedback States)
- **Skeleton Loading:** Khung xương mô phỏng chính xác cấu trúc khối ảnh và dòng chữ với chuyển động ánh sáng quét ngang nhẹ nhàng (shimmer 1.5s).
- **Empty State:** Hình minh họa linh vật RELOOP ấm áp kèm thông điệp tích cực bằng tiếng Việt tự nhiên và nút gợi ý mở rộng bán kính tìm kiếm.
- **Error State:** Báo lỗi rõ ràng nguyên nhân (Mất mạng, Không tìm thấy kết quả, Lỗi máy chủ) kèm nút "Thử lại ngay" một chạm.
- **Success State:** Dấu tick thành công sinh động với thông điệp chúc mừng và mã tra cứu đơn hàng điện tử an toàn.
