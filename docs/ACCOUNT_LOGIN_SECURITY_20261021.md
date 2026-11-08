# Cá nhân, Đăng nhập & Bảo mật — 21/10/2026

## Giao diện và dữ liệu

Hồ sơ hiển thị trực tiếp tại `/account`, chỉnh sửa ngay trong thẻ, dùng API hồ sơ hiện có và không hiển thị các dòng ngày sinh/địa chỉ trống. `/account/security` là mục Đăng nhập & Bảo mật; đường dẫn dashboard cũ dùng cùng component. Tạo/Đổi PIN và Đặt/Đổi mật khẩu lấy trạng thái thực từ backend; cờ hasPassword đọc có/không từ Auth, không tin user_metadata.

PIN 6 số dùng scrypt với salt riêng và pepper của máy chủ; không lưu PIN rõ, không trả hash/salt cho trình duyệt. Khóa 15 phút sau 5 lần sai, kiểm tra revision chống ghi đè. Đây là thiết lập PIN để tích hợp bước xác nhận hỗ trợ PIN sau này; các thao tác hợp đồng/thanh toán hiện có vẫn giữ Smart Key, không tự tạo chữ ký hay xác nhận giao dịch trong đợt triển khai này.

Đổi mật khẩu theo cùng validator lúc đăng ký. Có mật khẩu thì yêu cầu mật khẩu hiện tại. Thiết lập thông tin nhạy cảm cần xác thực gần đây, mật khẩu hiện tại hoặc OTP gắn đúng mục đích/phiên; tài khoản đã bật TOTP vẫn cần Smart Key dùng một lần. Route mật khẩu khôi phục chỉ nhận phiên recovery còn mới, tránh dùng route đó để bỏ qua bước xác nhận ở trang Bảo mật.

## Khóa truy cập thiết bị

Dùng passkey native của GoTrue **v2.196.0 đang cài** qua Supabase SDK hiện có; không thay binary Auth hay tự phát JWT. Browser serializer `@simplewebauthn/browser@14.0.0`. Cookie Auth vẫn HttpOnly; browser chỉ nhận challenge và dữ liệu WebAuthn công khai.

Bật bốn cờ Auth: PASSKEY_ENABLED, WEBAUTHN_RP_ID=reloo.vn, RP_DISPLAY_NAME=RELOO, RP_ORIGINS=https://reloo.vn. Preflight so sánh toàn bộ môi trường Auth đang chạy: chỉ thêm bốn cờ này. Không đổi secret, TTL, MFA, provider hoặc quyền quản trị. Challenge app được ký, gắn tài khoản/phiên/mục đích và hết hạn 5 phút; assertion phải có UV+UP trên authenticatorData được GoTrue kiểm chữ ký. Không coi một boolean phía client là bằng chứng sinh trắc học.

App mở trình duyệt hệ thống để dùng passkey và trở lại bằng luồng native PKCE hiện có. Thiết lập từ app gắn đúng auth_user_id, chặn trình duyệt đang dùng tài khoản khác. Tài khoản phone-only chuyển phiên đã xác minh qua luồng mã hóa, một lần rồi xóa cookie phiên trình duyệt để tránh hai nơi dùng chung refresh token. Không đọc token Auth từ JavaScript. Không thay native code/config.

Nguồn chính đã đối chiếu: https://github.com/supabase/auth/tree/v2.196.0/internal/api và source SDK trong node_modules/@supabase/auth-js/src/GoTrueClient.ts. GoTrue mặc định UV preferred; route RELOO yêu cầu UV required và kiểm bit UV trong dữ liệu assertion ký trước khi trao đổi phiên.

## OTP

Một input `autocomplete=one-time-code` với sáu ô hiển thị, hỗ trợ dán cả mã, giữ số 0 đầu; dùng cho đăng ký phone, Smart Key và xác nhận bảo mật. SMS có hỗ trợ WebOTP khi thiết bị và định dạng SMS đáp ứng; email chỉ dùng gợi ý mà hệ điều hành cung cấp, không đọc Gmail hoặc thông báo của khách. Không bảo đảm email trong ứng dụng Gmail tự điền trên mọi thiết bị.

Email OTP mẫu RELOO: mã sáu số không chèn khoảng trắng trong nội dung, hiển thị lớn, hạn 5 phút và chỉ dẫn bảo mật. OTP randomInt, chỉ lưu HMAC gắn challenge; tối đa 5 lần thử, 60 giây gửi lại, 8 yêu cầu/giờ, gắn profile + session + purpose, dùng một lần. Code không có trong JSON response, URL hoặc localStorage.

**Cấu hình thực tế còn thiếu GMAIL_REFRESH_TOKEN**. SMTP hiện cũng chưa cấu hình. Không gửi email thử tới người dùng. Backend kiểm readiness trước khi cấp OTP; UI không hiển thị gửi OTP như đã hoạt động. Chủ hệ thống hoàn tất quyền Gmail gửi trong cấu hình CRM để bật gửi mã. Mật khẩu hiện tại hoặc đăng nhập Google lại vẫn dùng để xác nhận.

## Bản nháp đơn vị tiếp nhận

Thông tin mẫu người dùng cung cấp lưu riêng trong business_settings.entity_draft, chỉ CRM có quyền đọc. Không điền vào entity công khai, không mở chặn tiếp nhận CCCD. Có nút điền mẫu và checkbox xác nhận đã sửa thành thông tin chính thức; server kiểm xác nhận, lưu entity và xóa draft trong cùng transaction. Không đưa địa chỉ mẫu vào mã nguồn/public assets.

## Kiểm tra

PGlite kiểm quyền bảng/RPC, lock PIN, revision, OTP cooldown/5 lần sai/ràng buộc phiên-mục đích/một lần và chặn công khai draft chưa xác nhận. Kiểm crypto PIN/HMAC challenge/UV flags, mẫu email escaping/leading zero. Browser fixture 320/390/1440: hồ sơ inline, lưu tên, đổi nhãn PIN/mật khẩu theo dữ liệu, OTP sáu ô, WebAuthn với thiết bị ảo. Dữ liệu và email đều giả. Kiểm runtime desktop/iPhone/Android và cùng catalog sau triển khai; kiểm thử này không thay cho việc người dùng tự đăng ký Face ID/vân tay trên thiết bị thật.
