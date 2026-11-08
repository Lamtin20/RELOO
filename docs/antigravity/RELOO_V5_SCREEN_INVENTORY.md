# DANH MỤC MÀN HÌNH VÀ THÀNH PHẦN GIAO DIỆN RELOO REAL V5.0
**Dự án:** RELOO Real — Premium Experience Rebuild  
**Mục tiêu:** Kiểm kê chi tiết 100% màn hình, tuyến đường (routes), mini-app và các thành phần giao diện  
**Trạng thái kiểm kê:** TOÀN DIỆN (107 Màn hình Route, 5 Mini-Apps, 191 API Handlers)

---

## 1. DANH MỤC 17 MÀN HÌNH ƯU TIÊN TRỌNG YẾU (PRIORITY SCREEN INVENTORY)

| STT | Tên màn hình & Phân hệ | Đường dẫn tuyến (Route) | Mục đích trải nghiệm & Trạng thái | Yêu cầu cải tiến V5.0 |
|---|---|---|---|---|
| **01** | **Trang chủ & Khám phá (Homepage & Discovery)** | `/` | Cửa ngõ thương mại tổng hợp, điều hướng 4 mini-app, danh mục gợi ý thông minh, tìm kiếm đa kênh. | Loại bỏ giao diện dashboard xơ cứng; tạo layout thương mại cao cấp, hero banner ấn tượng, thanh tìm kiếm nổi bật, danh mục trực quan. |
| **02** | **Tìm kiếm & Kết quả (Search & Results)** | `/tim-kiem`, `/explore` | Tìm kiếm từ khóa tiếng Việt có dấu, bộ lọc đa ngành hàng (Thuê/Bán/Lưu trú/Việc làm), lọc bán kính vị trí. | Tự động hoàn thành (Autocomplete), phân loại ranh giới intent khi từ khóa mơ hồ, lịch sử tìm kiếm gần đây. |
| **03** | **Chi tiết Sản phẩm & Dịch vụ (Product Details)** | `/product/[id]` | Trưng bày hình ảnh sản phẩm thật độ phân giải cao, thông số kỹ thuật, giá thuê theo ngày/tuần, tiền cọc, uy tín chủ sở hữu. | Thư viện ảnh trượt mượt mà (Carousel/Lightbox), bảng phí minh bạch, nút CTA cố định trên mobile (Sticky Bottom CTA), đánh giá minh bạch. |
| **04** | **Đăng tin & Chỉnh sửa (Product Listing & Edit)** | `/dang-tin`, `/lend`, `/dashboard/assets/new`, `/dashboard/assets/[id]/edit` | Luồng đăng sản phẩm cho thuê hoặc bán lại, nhập thông số, tải ảnh sản phẩm thực tế, thiết lập giá và điều khoản cọc. | Thiết kế biểu mẫu từng bước (Multi-step Stepper), kiểm tra định dạng ảnh, tính toán giá thuê đề xuất tự động. |
| **05** | **Thị giác AI nhận diện sản phẩm (Visual AI Product Capture)** | Tích hợp trong `/dang-tin` (MediaPipe Tasks Vision) | 1-photo listing: Chụp/Tải 1 ảnh -> Nhận diện chủng loại -> Gợi ý danh mục, hãng, thông số -> Người dùng xác thực. | Hiển thị độ tin cậy (Confidence badge), trạng thái phân tích ảnh sinh động, trường chỉnh sửa rõ ràng, không bịa đặt thông tin. |
| **06** | **Bản đồ trực tiếp & Khám phá lân cận (Live Map & Discovery)** | `/ban-do` | Bản đồ tương tác toàn màn hình (MapLibre GL), gom cụm điểm dịch vụ (Clustering), định vị lân cận, bộ lọc bán kính. | Hiệu năng 60fps trên mobile, marker phân loại màu thương hiệu, danh sách xem dạng thẻ trượt (Bottom Sheet List / Map split view). |
| **07** | **Luồng Thuê đồ & Đặt cọc (Rental Checkout & Escrow)** | `/rent/[id]`, `/checkout/[id]` | Chọn khoảng thời gian thuê (Date range picker), tính toán tổng phí thuê, tiền cọc bảo đảm, tùy chọn giao nhận. | Lịch chọn ngày thuê trực quan, bóc tách chi phí rõ ràng (tiền thuê, cọc hoàn lại, phí vận chuyển), cam kết minh bạch. |
| **08** | **Thị trường Đồ cũ (Secondhand Re-commerce)** | `/explore?transaction=SALE`, `/purchase/[id]` | Mua bán đồ đã qua sử dụng, kiểm tra tình trạng hao mòn thực tế, phụ kiện đi kèm, thỏa thuận giá. | Hiển thị chi tiết tình trạng thực tế (Like new / 95% / Có xước cấn nhẹ), quy trình đặt cọc giữ đồ có thời hạn (Reservation TTL). |
| **09** | **Đặt phòng & Homestay (Accommodation Booking)** | `/dat-phong`, `/dat-phong/chu-nha`, `/dat-phong/quan-ly` | Đặt phòng homestay, căn hộ trải nghiệm, quản lý phòng trống, chính sách nhận/trả phòng (12:00 noon checkout). | Trải nghiệm đặt phòng chuẩn nghỉ dưỡng, ảnh thực tế có bản quyền, xác nhận tức thì hoặc chờ chủ nhà duyệt trong 30 phút. |
| **10** | **Việc làm & Dịch vụ linh hoạt (Flexible Jobs & Gigs)** | `/viec-lam`, `/viec-lam/dich-vu` | Kết nối người tìm việc ca vụ / làm thêm và nhà tuyển dụng địa phương; tìm thợ sửa chữa, dịch vụ hỗ trợ. | Giao diện rõ ràng giữa "Tôi tìm việc" và "Tôi tìm người", thông tin thù lao minh bạch theo giờ/ca, không thu phí đặt cọc xin việc. |
| **11** | **Tin nhắn & Trao đổi giao dịch (Messaging & Chat)** | `/dashboard/messages` | Trò chuyện trực tiếp giữa người thuê và chủ đồ, chia sẻ vị trí giao nhận, đàm phán hợp đồng, gửi báo giá. | Giao diện trò chuyện mượt mà như app bản địa, hiển thị trạng thái đã đọc/đang gõ, đính kèm thẻ sản phẩm và vị trí an toàn. |
| **12** | **Đăng nhập, Đăng ký & KYC (Auth & Verification)** | `/auth`, `/auth/register`, `/auth/recover`, `/verify-identity`, `/dashboard/kyc/verify` | Xác thực người dùng qua số điện thoại/OTP, WebAuthn Passkeys, quét CCCD gắn chip (VietOCR / QR WASM). | Form đăng ký tinh gọn, phản hồi bảo mật mật khẩu tức thì, giao diện quét CCCD chuẩn bảo mật, xử lý dữ liệu nhạy cảm trên máy khách. |
| **13** | **Hồ sơ & Cài đặt tài khoản (Profile & Settings)** | `/account`, `/dashboard/profile`, `/account/security`, `/dashboard/profile/residency` | Quản lý thông tin cá nhân, định danh cư dân nội khu, cài đặt ngôn ngữ (Tiếng Việt / English), bảo mật 2 lớp. | Bố cục dạng thẻ chuyên nghiệp, quản lý liên kết ngân hàng nhận tiền cọc, kiểm soát thiết bị đăng nhập an toàn. |
| **14** | **Thanh toán, Đơn hàng & Hợp đồng (Transactions & Orders)** | `/giao-dich`, `/dashboard/orders`, `/dashboard/orders/[id]`, `/dashboard/agreements`, `/dashboard/wallet` | Theo dõi vòng đời đơn thuê (Chờ xác nhận -> Đã cọc -> Đang giao -> Đang thuê -> Đã hoàn trả -> Hoàn cọc), hợp đồng điện tử. | Timeline đơn hàng chi tiết từng phút, biên nhận điện tử có mã tra cứu, số dư ví cọc và lịch sử dòng tiền rõ ràng. |
| **15** | **Trung tâm Thông báo (Unified Notifications)** | `/notifications`, `/notifications/neighborhood` | Nhắc nhở hạn trả đồ, thông báo cọc đã hoàn về tài khoản, biến động giá, tin nhắn mới từ người thuê. | Phân loại tab (Giao dịch / Hệ thống / Nội khu), hỗ trợ đánh dấu đã đọc một chạm, không gửi thông báo spam. |
| **16** | **Hỗ trợ khách hàng & Khiếu nại (Support & Safety)** | `/help`, `/safety`, `/cms/privacy`, `/dashboard/audit` | Trung tâm trợ giúp, hướng dẫn giải quyết tranh chấp hư hỏng sản phẩm, chính sách bảo vệ người thuê & chủ đồ. | Câu hỏi thường gặp trực quan theo chủ đề, form tạo yêu cầu hỗ trợ đính kèm hình ảnh biên bản giao nhận. |
| **17** | **RELOO Nội Khu (Residential Community Hub)** | `/noi-khu`, `/dashboard/orders/neighborhood`, `/needs/neighborhood` | Chia sẻ, mượn đồ, giúp đỡ lẫn nhau giữa cư dân trong cùng tòa nhà/khu đô thị khép kín. | Giao diện ấm áp, thân thiện, bảo vệ sự riêng tư của cư dân, hiển thị khoảng cách di chuyển trong nội khu (đi bộ 2-5 phút). |

---

## 2. DANH MỤC CÁC MÀN HÌNH QUẢN TRỊ & HẬU CẦN (BACKOFFICE & OPERATIONS)

1. **Bảng điều khiển Quản trị viên (Admin Portal):**
   - `/admin`: Tổng quan sức khỏe hệ thống, lưu lượng truy cập, tỷ lệ hoàn tất giao dịch.
   - `/admin/listings`: Kiểm duyệt tin đăng sản phẩm, cảnh báo hàng cấm, kiểm tra bản quyền ảnh.
   - `/admin/orders` & `/admin/orders/[id]`: Giám sát giao dịch, can thiệp trọng tài tranh chấp cọc.
   - `/admin/users` & `/admin/users/[id]`: Quản lý cấp độ định danh người dùng, lịch sử vi phạm.
   - `/admin/risk`: Hệ thống radar phát hiện rủi ro, gian lận tài khoản hoặc spam đơn ảo.
   - `/admin/maps`: Trạng thái máy chủ bản đồ nội bộ (Photon/OSRM/OSM).
   - `/admin/compliance`: Bảng theo dõi tuân thủ pháp lý TMĐT và bảo vệ quyền tác giả DMCA.
2. **Trung tâm Điều hành & CRM (Control Center & Agent Office):**
   - `/crm`: Bảng điều hành tác nghiệp khách hàng, trạng thái tin tức AI.
   - `/agent-office`: Không gian làm việc của trợ lý chuyên viên hỗ trợ người dùng.
   - `/chat-control`: Giám sát chất lượng hội thoại và phản hồi tranh chấp tự động.

---

## 3. DANH MỤC THÀNH PHẦN GIAO DIỆN CHUNG (SHARED COMPONENT INVENTORY)

| Nhóm thành phần | Tệp tin mã nguồn | Vai trò & Trạng thái tái cấu trúc V5.0 |
|---|---|---|
| **Khung bố cục (Layouts)** | `MarketplaceShell.jsx`, `Header.jsx`, `BottomNav.jsx`, `Footer.jsx` | Khung ứng dụng chính, thích ứng mượt mà từ màn hình 320px đến 1920px; tích hợp thanh điều hướng nổi và Safe Area. |
| **Nhận diện thương hiệu** | `Logo.jsx`, `Mascot.jsx`, `Reloop.jsx` | Logo chữ RELOO kết hợp biểu tượng vô cực xanh sinh thái; linh vật RELOOP chuẩn raster nghệ thuật đã được phê duyệt. |
| **Thẻ sản phẩm (Cards)** | `ListingCard.jsx`, `ListingGrid.jsx` | Thẻ sản phẩm tối ưu tỉ lệ ảnh 4:3, hiển thị giá rõ ràng, nhãn chứng thực uy tín, khoảng cách địa lý, hỗ trợ lazy-loading. |
| **Tìm kiếm & Điều hướng** | `SearchBox.jsx`, `LocationChip.jsx`, `LocationPicker.jsx` | Hộp tìm kiếm có gợi ý bàn phím, chọn tỉnh thành/quận huyện Việt Nam chuẩn dữ liệu hành chính 63 tỉnh thành. |
| **Trạng thái & Phản hồi** | `EmptyState.jsx`, `Modal.jsx`, `StatusBadge.jsx`, `Skeleton` | Trạng thái tải nội dung giả lập khung xương (Skeleton), màn hình rỗng có nút gợi ý hành động, thông báo xác nhận an toàn. |
| **Bản đồ & Định vị** | `MapLibreWrapper`, `ClusterMarker`, `ExploreLocationSheet.jsx` | Lớp bản đồ tối ưu bộ nhớ, marker phân loại dịch vụ sinh động, bảng trượt danh sách sản phẩm đồng bộ vị trí con trỏ bản đồ. |
