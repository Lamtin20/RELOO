# Tài khoản và đơn hàng — 17/10/2026

**Đã triển khai production.** Build `bHdWu0GNFMpi7BCYb8nbn`; app healthy. Hai API dashboard trả 401 khi chưa đăng nhập. Kiểm tra đọc từ runtime production xác nhận 44 khóa bộ đếm không có nguồn lỗi và truy vấn danh sách/join sản phẩm đọc được; không ghi lại định danh hay số liệu riêng của người dùng. Migration unread đã áp dụng, anon không có execute và public-schema client grants vẫn bằng 0.

Khu tài khoản sử dụng header/menu nhóm theo cách bố trí CRM, nhưng vẫn là tài khoản marketplace, không cấp quyền CRM. Sáu nhóm: Đơn & giao dịch; Đăng tin & tài sản; Trao đổi & nhu cầu; Thu nhập & ưu đãi; Hồ sơ & an toàn; Lịch & tùy chọn. Có tìm kiếm không dấu, Escape/outside click, liên kết thật, trạng thái hiện tại và bố cục mobile. Hộp thư chuyên dụng giữ layout chat hiện có.

Trang đơn hiển thị bốn card: thuê trên sàn, thuê nội khu, mua/bán và thỏa thuận. Mỗi card có số trạng thái đang chờ ở đầu và tổng số riêng. Không cộng các loại đơn thành một số giao dịch duy nhất vì dữ liệu có thể có mối liên hệ chưa được hợp nhất. Nút/thao tác tĩnh không có hàng đợi không gắn số giả.

`/api/dashboard/counts` xác thực account từ cookie HttpOnly, chỉ đọc theo profile phía server. Exact count ở PostgreSQL cho loại đơn và từng trạng thái, tài sản chờ xử lý, thông báo chưa đọc, nhu cầu mở, video và KYC. Hộp thư đếm tin chưa đọc qua RPC có join kiểm tra participant, không trả nội dung tin. Trả `null` khi nguồn không khả dụng, không trả 0 thay lỗi. Client chỉ hiển thị dữ liệu đúng actor, hủy request khi chuyển trang/tài khoản, có timeout, làm mới khi đổi trang/focus và mỗi 60 giây khi visible. Một số thao tác nghiệp vụ phát sự kiện cập nhật; không tuyên bố realtime tuyệt đối.

Định nghĩa pending: transactions `pending`; NK `DRAFT/PENDING_OWNER/PENDING_PAYMENT`; purchase `REQUESTED/CONFIRMED/HANDED_OVER/DISPUTED`; agreement `PROPOSED/DISPUTED`. Đây là mục đang chờ của luồng, có thể chờ bên còn lại, **không** khẳng định tất cả đều cần chính người xem thao tác. Quá hạn đơn sàn dựa trạng thái authoritative `overdue`; nội khu dùng hạn trả rõ ràng với ACTIVE/RETURN_PENDING. Không đổi chính sách hủy, cọc hoặc quyền.

`/api/dashboard/orders` tải đơn sàn theo quyền server, lọc trạng thái trước phân trang, 30 đơn mỗi trang. Không dùng danh sách cũ trong store để kết luận không có đơn. Các luồng khác giữ API nghiệp vụ hiện có; card/tab lấy tổng exact từ API counts, phần danh sách ghi rõ giới hạn tải hiện hữu (NK/purchase 100; agreements 50 mỗi vai trò). Vì vậy số tab có thể lớn hơn số dòng đang tải; không trình bày số dòng giới hạn là tổng số. Cần mở rộng API lịch sử những luồng đó để duyệt toàn bộ backlog ngoài giới hạn cũ; không coi việc này đã hoàn tất trong bản UI này.

Migration `deploy/vietnam/account-workspace-counts.sql` chỉ thêm RPC đọc unread, revoke PUBLIC/anon/authenticated, grant service_role. Sau migration áp `security-lockdown.sql`. Không gửi email/push, không chỉnh sửa hay tạo giao dịch production để thử.

Kiểm tra: 11 test workspace/experience/security đạt (gồm PGlite cho unread và quyền DB), scoped lint và build. Browser dùng auth/order/count fixture TEST rõ ràng; 5 nhóm kiểm tra menu, trạng thái, mobile 320/390/768/1440, lỗi nguồn/thử lại. Screenshot tại `output/deployment/account-*.png`; số trong ảnh không phải số production. API production kiểm tra riêng không đăng nhập phải 401; không giả MFA hoặc dùng tài khoản khách hàng để test.

Rollout: backup mã hóa, build trước khi đổi app; RPC additive. Rollback bằng image/source trước bản này, giữ nguyên dữ liệu và RPC vô hại. Các bằng chứng triển khai được ghi riêng trong output/deployment.
