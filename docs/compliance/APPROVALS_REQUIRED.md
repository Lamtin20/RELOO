# Quyết định và điều kiện còn thiếu · 23/10/2026

Không dùng văn bản này làm phê duyệt. Các mục dưới đây là hồ sơ cần người có trách nhiệm xác nhận; phần kỹ thuật được tự động kiểm thử riêng.

| Nhóm | Hồ sơ đã chuẩn bị | Phần chưa thể tự xác nhận | Người phụ trách |
|---|---|---|---|
| Dữ liệu | `compliance/field-purposes.json`: vị trí source, field, hash | Mục đích cần thiết, cơ sở xử lý, notice, thời hạn giữ, người nhận, quyền dữ liệu theo từng trường | Chủ module + Privacy + Legal |
| Tài sản | `compliance/asset-provenance.json`: đường dẫn, SHA-256, kích thước | Nguồn/quyền sở hữu, giấy phép, phạm vi sử dụng, quyền tạo derivative | Chủ nội dung/IP |
| Pháp nhân và chính sách | Legal matrix và cơ chế policy hash/publication hiện có | Chủ thể vận hành, mô hình sàn/dịch vụ, thông tin đăng ký thực, bản chính sách được duyệt | Chủ doanh nghiệp + Legal |
| Đặt phòng/Job/World/tài chính | Rule và trạng thái launch hiện có | Nguồn cung được phép, chính sách phí/hoàn, phạm vi dịch vụ và điều kiện triển khai thực tế | Chủ nghiệp vụ + Legal |
| Dependency dev | Audit ghi rõ `braces` và nhánh dependency bị ảnh hưởng | Chưa có bản vá npm phát hành cho nguyên nhân gốc tại lần kiểm tra; không tự miễn trừ high | Security/Release |
| Staging | Compose/runbook/preflight đã có | DNS staging chưa tồn tại; môi trường chưa có cấu hình/credential deployment đã xác minh, backend riêng và sandbox provider | Chủ hạ tầng |
| Release | Guardian kiểm tra source-bound evidence, không dừng production | Required checks/protected environment trên GitHub, runtime parity web/backend/native, kiểm thử staging thật | Chủ repo + Release/QA |

Mỗi phê duyệt cần tên/vai trò người duyệt, thời điểm, phiên bản/hash, phạm vi, kết luận và hạn rà soát. Chỉ phê duyệt hạng mục mà người đó có thẩm quyền. Không gửi mật khẩu/OTP/token vào báo cáo hoặc chat. Người vận hành cấu hình secret qua kênh quản lý secret đang dùng.

Hồ sơ inventory là **candidate**, có thể có field/tài sản không dùng ở production và bỏ sót custom component hoặc dữ liệu động. Việc đã tạo đủ dòng không làm chúng thành hợp pháp hoặc cần thiết. Không điền giấy phép, pháp nhân hay dấu chấp thuận giả để vượt gate.

B? sung c?ng c? test: Ganache7.9.2 tr??c ??y n?m trong output/verification. ?? pin manifest/lock v? qu?t ri?ng; audit33advisory package records (5critical/22high/5moderate/1low) ? c?ng c? test c? l?p, kh?ng ? runtime production. npm kh?ng t? v? ???c dependency bundled c?a Ganache. Security/QA c?n quy?t ??nh n?ng/thay tool v?i assertion EVM t??ng ???ng ho?c ??nh gi? r?i ro c?ng c? c? l?p c? th?m quy?n; kh?ng t? mi?n tr? ?? PASS.

Native QA backlog CG-MOB-001:3moderate package records (@capacitor/cli/xcode/uuid), no high/critical in the observed mobile lock audit. Native/Release owner reviews compatible upstream patches before the next native release; no native code/config update or forced major downgrade was made here. This is a local tracked remediation request, not an external ticket or approved deadline.


## Owner instructions and review package ? 23/10/2026

New primary review package: docs/compliance/legal-review/README.md. Owner commercial-use attestation recorded per current asset hash, independent license evidence still pending. Company values remain null until verified CRM entry; no fictional entity or permission to collect bank-equivalent customer records. Data retention/deletion and service-role/procedure proposals are drafts for counsel, not automatically published policy. Owner/legal approvals remain pending until actual review. Historical dependency/host-access notes above are superseded by current technical audit and SSH evidence, not active advisory claims.
