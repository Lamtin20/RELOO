# Đăng nhập, phiên thiết bị và xác nhận thao tác — 21/10/2026

Theo yêu cầu mới, bỏ sinh trắc học khỏi màn đăng nhập công khai và trang trả về app. Sau đăng nhập, Face ID/vân tay là lựa chọn trong Đăng nhập & Bảo mật. Luồng xác nhận giao dịch hiện có ưu tiên WebAuthn nếu người dùng đã đăng ký khóa và môi trường hỗ trợ; khi hủy/không hỗ trợ dùng PIN giao dịch 6 số. Không dùng PIN làm phương thức đăng nhập công khai. Hệ điều hành quyết định Face ID/vân tay/mã khóa thiết bị, web không đọc dữ liệu sinh trắc học. WebView không hỗ trợ WebAuthn dùng PIN; không tuyên bố đã thử cảm biến thật trên Samsung/iPhone.

## Phiên và cookie

Bỏ cấu hình Auth giới hạn 24h tổng/8h không hoạt động theo yêu cầu giữ đăng nhập. Cookie HttpOnly/Secure/SameSite=Lax chuyển sang host-only và gia hạn 365 ngày khi được server phục vụ/refresh; refresh token vẫn được xoay và kiểm tra. Đăng xuất, thu hồi, xóa cookie hoặc chính sách trình duyệt vẫn có thể kết thúc phiên. Không phục hồi token đã thu hồi. Thay đổi này cập nhật hai giá trị thời hạn ghi trong SECURITY_HARDENING_20261015, các kiểm soát khác giữ nguyên.

Cookie parent-domain cũ được thay bằng bản host-only và hết hạn đúng phạm vi Domain=reloo.vn, qua Set-Cookie độc lập để không ghi đè bản thay thế. Không chuyển token cho JavaScript. www điều hướng về tên miền chính trước PKCE. CRM dùng callback trên chính crm.reloo.vn để host-only không phá luồng đăng nhập CRM.

## Google

Tái hiện lỗi công khai với cookie giả 12 KB: gateway trả 400 Request Header Or Cookie Too Large. Nâng bounded header buffers thành 4×32 KB, tăng response proxy buffers cho Set-Cookie. Sau reload kiểm tra cùng yêu cầu 12 KB nhận 302 đến accounts.google.com; một cookie 40 KB vẫn bị chặn 400. Không đăng nhập thay người dùng hoặc dùng tài khoản Google thật trong kiểm thử.

## Xác nhận thao tác

`/api/security/confirm` cần một phiên đã đăng nhập. PIN dùng hash/salt và RPC khóa sau 5 lần sai hiện có. WebAuthn cần chữ ký được Auth kiểm tra, UV+UP, challenge gắn chủ tài khoản và session; phiên Auth tạm của bước kiểm tra không được ghi lên cookie ứng dụng và được đóng với scope local. Khóa của tài khoản khác bị từ chối.

Receipt ký HMAC có thời hạn 15 phút và vẫn bị tiêu thụ một lần bởi RPC giao dịch hiện có. PIN revision/nhóm khóa hiện tại phải khớp khi dùng receipt. Người đã bật TOTP vẫn phải giữ yêu cầu AAL2; PIN/sinh trắc học không bỏ qua MFA đã cấu hình. CRM receipt AAL2 riêng không thay đổi. Không thay schema, không grant public RPC.

## Apple: đã tích hợp, chờ cấu hình

Người dùng xác nhận chưa có cấu hình Apple Developer. API Apple và nút đăng nhập/đăng ký được nối vào PKCE/callback và app handoff hiện có; nút chỉ xuất hiện khi Auth báo provider Apple đã bật. Không hiển thị lựa chọn giả hoặc nhận Apple token chưa kiểm tra.

Để kích hoạt cần Apple Developer, App ID bật Sign in with Apple, Services ID cho web, Team ID, Key ID và khóa .p8 riêng. Khai báo web domain và Return URL `https://auth.reloo.vn/auth/v1/callback`. Đặt APPLE_CLIENT_ID bằng Services ID, APPLE_CLIENT_SECRET bằng JWT ký ES256 hợp lệ, rồi APPLE_ENABLED=true trên máy chủ. Giữ khóa ngoài repo/chat. OAuth Apple yêu cầu xoay client secret tối đa mỗi 6 tháng; tên người dùng có thể chỉ được Apple trả ở lần đồng ý đầu tiên nên RELOO vẫn có bước hoàn tất hồ sơ.

Nguồn đã đọc: https://supabase.com/docs/guides/auth/social-login/auth-apple và source Auth v2.196.0 `internal/conf/configuration.go`, `internal/models/sessions.go`, `internal/api/provider/apple.go`. Công cụ web search không hoạt động trong phiên, đã tải trực tiếp nguồn chính thức vào output bị ignore để kiểm tra.

Kiểm thử API/receipt dùng tài khoản giả cô lập; browser dùng virtual authenticator/fixture, không tạo PIN, khóa hay giao dịch thật. Khi phát hành cần backend và hai renderer cùng build và desktop/iPhone/Android cùng runtime/catalog. Không thay native code/config.
