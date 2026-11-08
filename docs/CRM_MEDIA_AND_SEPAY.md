# CRM, thương hiệu và dòng tiền

CRM có các mục: Icon & logo, Tin tức & SEO, Banner & POSM, Khách hàng và Tài khoản ảo SePay. Mục Tra cứu API đã được bỏ khỏi giao diện.

Icon tab mặc định lấy từ `public/brand/reloo-symbol.png`, đúng mẫu logo người dùng gửi. Admin có quyền `settings.write` thay icon tab, icon app và logo CRM. Upload ảnh công khai được giải mã và chuyển WebP; không nhận SVG/HTML. Ảnh lưu lâu dài ở `/srv/reloo/data/public-media`, tách khỏi ảnh căn cước mã hóa. Favicon và manifest tải cấu hình đang có; trình duyệt có thể giữ icon cũ trong cache.

Tin tức hỗ trợ bản nháp, đăng công khai, hẹn giờ theo múi giờ Việt Nam và lưu trữ. Bài hẹn giờ chỉ công khai khi đến hạn. Có slug, tiêu đề/mô tả SEO, ảnh và alt, tác giả, chuyên mục, thẻ, nội dung Markdown, canonical, Open Graph, Twitter Card, Article JSON-LD, sitemap và robots. Không chèn HTML từ nội dung. SEO không bảo đảm thứ hạng hay xu hướng; nội dung thực tế do người có quyền `content.write` duyệt và đăng.

Banner có ảnh riêng theo mobile/desktop; các kích thước nằm ở `lib/content/banner-slots.js`. API yêu cầu tỷ lệ ảnh phù hợp và tối thiểu một nửa kích thước khuyến nghị. Có thời gian bắt đầu/kết thúc, mức ưu tiên và vị trí cụ thể. POSM được lưu trong CRM và mở để sử dụng; không tự treo trên website.

Khách hàng: quyền `customers.read` đọc thông tin chung; chỉ admin có quyền `customers.write` được chỉnh các trường khai báo. Email đăng nhập không chỉnh bằng API hồ sơ này để giữ đúng xác thực của nhà cung cấp. Thay điện thoại thông qua RPC dành riêng cho admin; người dùng vẫn không tự đổi được số đã đăng ký. Nhật ký giữ người thực hiện, lý do, các trường thay đổi và bản trước/sau mã hóa. Ghi nhận kiểm tra phiên bản để tránh nhật ký sai khi chỉnh đồng thời. Admin có `risk.write` chuyển nhóm blacklist/thường kèm lý do; gỡ nhóm không gỡ việc căn cước hết hạn.

Thông tin căn cước và ảnh chỉ trả cho người có `kyc.read`; quyết định duyệt cần `kyc.write`. Mỗi API ảnh kiểm tra quyền độc lập và ghi nhật ký. Trạng thái căn cước đã được admin duyệt cảnh báo khi còn tối đa 30 ngày; qua thời điểm hết hạn (hết ngày trên thẻ theo giờ Việt Nam) chặn cổng nghiệp vụ HTTP, chat socket và giao dịch cơ sở dữ liệu. Hồ sơ/cập nhật căn cước và xem dòng tiền vẫn truy cập được. Thông báo hết hạn không tự đưa người dùng vào blacklist.

## SePay v2

Tài liệu đã đối chiếu:

- https://developer.sepay.vn/vi/sepay-api/v2/tai-khoan-ao/danh-sach
- https://developer.sepay.vn/vi/sepay-api/v2/tai-khoan-ao/chi-tiet
- https://developer.sepay.vn/vi/sepay-api/v2/don-hang/tao-don-hang
- https://developer.sepay.vn/vi/sepay-api/v2/don-hang/tao-va
- https://developer.sepay.vn/vi/sepay-api/v2/giao-dich/danh-sach
- https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc

Khóa API được lưu ở cấu hình riêng server, không trong repo/client. Kiểm tra thực tế kết nối trả thành công với hai tài khoản MBBank cá nhân. Các tài khoản này chưa hỗ trợ cấp VA theo luồng đơn hàng v2 được tích hợp. Người dùng đã chọn Vietcombank hoặc VietinBank cho bước tiếp theo; chưa liên kết tài khoản hỗ trợ nên không có VA được cấp thật.

Vietcombank cần Terminal ID gốc (không phải UUID), được xác nhận thuộc ngân hàng cha. VietinBank cần tài khoản doanh nghiệp và dịch vụ thu hộ qua tài khoản định danh đã kích hoạt. CRM khai báo tài khoản ngân hàng thu tiền, Terminal ID/tiền tố khi phù hợp, khách hàng, mã khoản thu, số tiền và thời hạn; không dùng MBBank để giả cấp VA. Cấp VA mới còn yêu cầu pháp nhân thu tiền và khách đã được duyệt căn cước còn hiệu lực. Mã khoản thu được lưu trước khi gọi provider và chỉ gọi một lần; lỗi không rõ kết quả đưa vào REVIEW để đối chiếu trước khi tạo lại.

VA chỉ là tài khoản định danh khoản thu về tài khoản cha, không tự tạo ví tiền điện tử hay dịch vụ ngân hàng giữ ký quỹ. `dashboard/cashflow` hiển thị tiền vào/ra và số dư đối soát từ bằng chứng giao dịch SePay gắn chính xác VA của khách. Không lấy số dư toàn bộ tài khoản cha để làm số dư của từng khách, không dùng số liệu mô phỏng. Số tiền có thể rút chưa được xác lập cho đến khi có đối soát nghĩa vụ giao dịch/phương thức chi trả.

Webhook HTTPS giữ raw body, chữ ký HMAC-SHA256 (`timestamp.raw_body`), thời gian lệch tối đa 5 phút, idempotency và đối chiếu lại API trước khi ghi sổ. Chưa có webhook secret do khách cung cấp; cần khai báo trong CRM và thiết lập cùng secret trong SePay. Polling `SYNC_SEPAY` đọc tối đa 50 giao dịch mới mỗi lượt, có cursor sau từng giao dịch đã ghi thành công, chạy mỗi 5 phút sau khi chọn tài khoản thu tiền. Có nút Đồng bộ dòng tiền trong CRM. Cả polling và webhook dùng cùng kiểm tra, nguồn giao dịch có chữ ký, sổ cân bằng và phân bổ VA, tránh ghi trùng.

API GET dòng tiền chỉ truy vấn theo tài khoản đăng nhập, kiểm tra chữ ký bằng chứng và đối chiếu lượng bản ghi; khoản chưa khớp VA để nguyên chờ đối soát ở sổ chung. Không tự tạo khoản thu, hoàn tiền, chuyển tiền hoặc xuất hóa đơn trong kiểm tra kết nối hiện tại.

Migrations: `deploy/vietnam/crm-upgrade.sql`, `cashflow.sql`, `sepay-sync.sql`. Kiểm tra: `node --test tests/crm-upgrade.test.mjs` cùng các bộ kiểm tra finance/manual KYC hiện có.
