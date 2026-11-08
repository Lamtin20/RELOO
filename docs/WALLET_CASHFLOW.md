# Dòng tiền RELOO

Trang `/dashboard/cashflow` hiển thị dữ liệu riêng của người đăng nhập; `/dashboard/wallet` chuyển tới trang này. Lịch sử rút tiền truy cập qua tab hoặc `/dashboard/cashflow/withdrawals`.

- **Số dư đối soát ngân hàng:** tổng tiền vào trừ tiền ra từ các giao dịch SePay đã được kiểm tra bằng chứng và gắn đúng khách hàng. Đây là biến động tiền đã ghi nhận tại RELOO, không phải số dư toàn bộ tài khoản ngân hàng của khách hàng.
- **Cho thuê / ngân hàng / ký quỹ:** các nhóm của cùng sổ ngân hàng. Mỗi giao dịch chỉ thuộc một nhóm; tổng quan không cộng lại số dư các thẻ lần thứ hai.
- **Shopee / TikTok Shop:** khoản đã xác nhận dựa trên sổ cashback, có xử lý đảo bút toán. Khoản chờ xác nhận tách riêng. Tiền hoàn chưa chuyển về ngân hàng không được cộng vào số dư ngân hàng.
- **Khả dụng để rút:** khoản được phê duyệt chi trả, đã có nguồn ngân hàng thực, sau khi trừ khoản đang yêu cầu và đã chi. Chọn nguồn/ngân hàng để gửi yêu cầu; có thể hủy khi còn chờ duyệt. Chuyển tiền thực hiện tại ngân hàng, không tự động gọi lệnh chuyển tiền qua SePay.
- **Ký quỹ:** hiển thị trạng thái chương trình từ cấu hình nghiệp vụ. Không tự bật chương trình; lịch sử đã ghi nhận vẫn được giữ khi chương trình tắt.

Tại CRM → Đối soát & hóa đơn → Nguồn tiền khách hàng, người có quyền `accounting.write` chọn giao dịch đã đối soát, nguồn tiền và lý do. Phân loại không sửa số tiền hay chứng từ gốc; mỗi thay đổi ghi một sự kiện mới và audit người thực hiện. Phân loại ký quỹ yêu cầu chương trình đang bật.

Migration bổ sung: `deploy/vietnam/wallet-display.sql`. RPC lấy dữ liệu trong một snapshot và chỉ cho service role gọi. API không trả bằng chứng ngân hàng đã mã hóa hay thông tin khách hàng khác. Nếu dữ liệu bị thiếu hoặc bằng chứng không hợp lệ, API dừng tính số dư thay vì trả số dư không đầy đủ.

Lịch sử rút tiền có các trạng thái: Chờ duyệt, Đã duyệt, Đang chuyển, Đã chuyển, Không được duyệt, Đã hủy. Bản ghi Đã chuyển phải có khoản chi ngân hàng đúng chủ thể và đúng số tiền; một khoản chi không được dùng cho nhiều lần rút. Đã có luồng gửi yêu cầu rút, giữ khoản chờ duyệt, quản lý chi trả trong CRM và đối soát chứng từ. Chuyển tiền vẫn thực hiện tại ngân hàng; không tự động gọi lệnh chuyển tiền qua SePay. Xem [tài liệu mới](SHORTS_AND_MOBILE.md).

Kiểm tra: `node --test tests/wallet-model.test.mjs tests/wallet-schema.test.mjs tests/finance.test.mjs tests/finance-schema.test.mjs tests/sepay-customer-gate.test.mjs`. Dữ liệu mẫu kiểm tra giao diện chỉ được thay thế trong phiên trình duyệt kiểm thử, không ghi vào tài khoản thực.
