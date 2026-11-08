# Đăng nhập và phân quyền CRM

CRM: `https://crm.reloo.vn/crm`. Đường dẫn `/crm` trên website chính chuyển sang tên miền CRM.

## Luồng đăng nhập

1. Đăng nhập bằng phương thức đã được bật cho tài khoản RELOO. Hiện máy chủ dùng Google; ô email/mật khẩu chỉ xuất hiện nếu cấu hình Auth bật phương thức này. Có tài khoản website chưa đồng nghĩa được vào CRM; quản trị phải cấp vai trò và cho phép truy cập.
2. Mọi tài khoản CRM, gồm quản trị và admin, phải xác nhận mã TOTP 6 số từ Google Authenticator. Lần đầu chọn **Tạo mã thiết lập**, quét QR bằng ứng dụng trên điện thoại, lưu tài khoản trong ứng dụng rồi nhập mã.
3. Chỉ sau khi mã được Supabase Auth xác nhận, máy chủ cấp phiên CRM và tải phân hệ đã được phân quyền. Mã sai, tài khoản không có quyền, phiên AAL1 hoặc phiên thiếu xác nhận CRM không truy cập được API quản lý.

Phiên CRM có thời hạn 8 giờ, cookie `HttpOnly`, `Secure` trên production, `SameSite=Strict`, chỉ dùng tại máy chủ đã đăng nhập. Phiên được ràng buộc với người dùng, phiên Auth và yếu tố TOTP đã xác minh. Đăng nhập lại làm thay đổi phiên Auth thì phải xác thực lại. **Thoát CRM** thu hồi phiên CRM trên máy chủ; tài khoản website vẫn có thể sử dụng bình thường.

Khi thay đổi vai trò/quyền hoặc ngừng tài khoản nhân viên, các phiên CRM hiện có bị thu hồi. Máy chủ kiểm tra lại quyền và phiên ở mỗi yêu cầu; giao diện kiểm tra lại mỗi phút và quay về đăng nhập khi hết phiên.

## Vai trò

- **Quản trị (`owner`)**, **Admin (`admin`)**: toàn quyền CRM. Chỉ hai vai trò này được thay đổi phân quyền.
- **Nhân viên (`staff`)**: quyền từng phân hệ, có ô **Xem** và **Tạo/chỉnh sửa**. Quyền chỉnh sửa bao gồm quyền xem phân hệ tương ứng. Không cấp `*` hoặc `roles.write` cho nhân viên.
- Tài khoản chưa được thêm vào danh sách, chưa có phân hệ hoặc đã ngừng truy cập không được vào CRM. Vai trò website như người thuê/chủ đồ không tự cấp quyền CRM.

Màn **Phân quyền** có mẫu CSKH, duyệt căn cước, nội dung và kế toán; quản trị có thể thay đổi từng ô quyền theo công việc. Không tự thay đổi quyền của chính mình. Các thay đổi ghi người thực hiện, quyền trước/sau và lý do vào nhật ký.

Ảnh CCCD và các chức năng nhạy cảm tiếp tục yêu cầu quyền riêng (`kyc.read`, `kyc.write`, `accounting.read/write`, ...), ngoài yêu cầu Google Authenticator. Menu bị ẩn không thay cho kiểm tra quyền ở API.

## Vận hành và khôi phục

Không ghi mã OTP, khóa thiết lập TOTP hoặc QR vào nhật ký, file cấu hình frontend hay hệ thống đo lường. Khóa TOTP được Supabase Auth quản lý; trang chỉ hiển thị QR/khóa trong bước thiết lập cho chính tài khoản đang đăng nhập.

Nếu mất ứng dụng xác thực, cần xác minh người sở hữu với quản trị vận hành trước khi dùng quyền quản trị Supabase Auth để khôi phục yếu tố. Không dùng `service_role`, sửa `aal`, sửa cookie hoặc tắt MFA như một cách đăng nhập. Trường hợp mất toàn bộ tài khoản quản trị cần xử lý qua kênh vận hành máy chủ đã được ủy quyền và ghi lại căn cứ khôi phục.

Áp dụng `deploy/vietnam/crm-security.sql` sau các migration CRM hiện có, trong transaction và sau khi sao lưu. Migration giới hạn vai trò hợp lệ, loại bỏ quyền toàn bộ không đúng ở nhân viên, tạo bảng phiên MFA riêng có RLS, và cập nhật thủ tục phân quyền. GoTrue `v2.196.0` dùng `GOTRUE_MFA_TOTP_ENROLL_ENABLED=true` và `GOTRUE_MFA_TOTP_VERIFY_ENABLED=true`.

Kiểm thử: `node --test tests/crm-security.test.mjs`. Kiểm tra tích hợp dùng tài khoản thử riêng, không thiết lập hoặc thay đổi Google Authenticator của quản trị thật.

Tài liệu API: [Supabase TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp).
