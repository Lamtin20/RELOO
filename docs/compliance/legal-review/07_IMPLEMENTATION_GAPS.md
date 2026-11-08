# 07 — Source thực tế, thay đổi và phần chưa hoàn tất

## Đã có và đã sửa trong phạm vi lượt này

- `business_settings.entity` là nguồn chung; CRM ghi qua quyền `settings.write`, kiểm tra version và xác nhận official hiện hữu. Không gỡ xác nhận hoặc readiness để cho dữ liệu giả thành chính thức.
- Validator/public projection chuẩn hóa ô chưa khai báo thành JSON `null`; form hiển thị rỗng. Không tạo pháp nhân, MST/đăng ký/email đại diện giả. Không in literal `[null]` cho người dùng.
- Footer, phần danh tính trên privacy/data-collection và tài liệu legal dùng canonical business API; refresh khi CRM save cùng tab/cross-tab, focus/visibility, định kỳ60giây lúc đang mở. Offline/thiết bị chưa mở lại không được coi đã đồng bộ tức thì. KYC/provider và API thanh toán vẫn kiểm readiness server.
- Entity version đi vào legal document/hash; thay thông tin công ty **không tự biến tài liệu pháp lý thành đã duyệt**. Hồ sơ hợp đồng/notice/số tiền đã chấp nhận giữ snapshot cũ phục vụ chứng cứ; không sửa hồi tố “all vị trí” làm mất lịch sử.
- Asset registry có owner attestation theo xác nhận của người dùng và hash hiện tại, chưa điền license/approval giả. Không coi lời xác nhận cho310file là bằng chứng có quyền cho mọi nội dung upload tương lai hoặc bên thứ ba.
- Business unit tests kiểm tra null, dữ liệu sai, canonical source/version và draft. Test browser cần kiểm tra refresh và không tự publish, không chỉ ảnh UI.

## Xóa hiện tại: không đồng nghĩa đã đạt mục tiêu xóa mọi bản sao

Source `app/api/profile/deletion/route.js` có auth/SmartKey/origin/rate limit, kiểm eligibility và RPC. SQL `identity-retention.sql` khóa account, gỡ thông tin profile, định danh/bank/KYC và tạo request để xóa ảnh/auth; giữ records tối thiểu theo thiết kế hiện hữu. Các gate khác kiểm giao dịch/số dư/admin/quyền mua.

Chưa kết luận full erase được mọi PII vì còn phải map các snapshot hợp đồng, chat, ảnh bàn giao, bank ledger, hồ sơ booking/Job, cache/search/CDN, outbox/log, subprocessor và backup. Cần integration test chứng minh per-surface scrub/quyền truy cập. Không thay bằng câu “đã xóa toàn bộ” trước khi jobs/processor hoàn tất. Luồng riêng tiếp nhận quyền dữ liệu khi không đủ eligibility đóng account phải được nghiệm thu.

## Quyết định chưa được phép tự đóng

| Mục | Lý do | Điều kiện tiếp tục |
|---|---|---|
| Thu CCCD/sinh trắc học cho mọi tài khoản | Chưa chứng minh tối thiểu/căn cứ/notice/vai trò | Map mục đích theo rủi ro, controller thực, phê duyệt nhạy cảm, test KYC |
| Giữ mọi PII đến xóa account | Có dữ liệu hết mục đích sớm, có chứng từ cần giữ theo căn cứ khác | Retention matrix có owner/căn cứ/trigger/job và legal review |
| Tự công bố “chỉ nội bộ” | Source có auth, provider/email/analytics và chia sẻ giao dịch | Recipient map/DPA/role/country đúng thực tế |
| Bật giao dịch khi entity null | Null chỉ là trạng thái chưa có thông tin | Đủ chủ thể/điều kiện/phạm vi chính sách đã duyệt; giữ gate |
| Công ty tương lai là controller hiện tại | Chưa có dữ kiện thực tế ai đang xử lý người thật | Chỉ định chủ thể và người chịu trách nhiệm hiện tại trước thu thật |
| Tất cả310asset REVIEWED | Owner attestation không nêu license và điều kiện từng nguồn | Tập hợp chứng cứ/nhóm hash, IP review |
| Giấy phép cho mọi mini app | Tên mini app không xác lập loại dịch vụ/giấy phép | Model/data/money map, luật chuyên ngành và thủ tục hiện hành |

Không áp migration/xóa dữ liệu hay xuất bản chính sách trong lượt lập hồ sơ này. Không gửi hồ sơ cho luật sư/cơ quan khi chưa có chỉ định người nhận và yêu cầu gửi. Báo cáo kỹ thuật không chứng nhận quyền kinh doanh.
