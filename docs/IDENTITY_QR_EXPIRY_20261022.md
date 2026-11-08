# Xác minh theo QR và ngày hết hạn khai báo — 22/10/2026

Quy tắc được người dùng chốt: bỏ OCR đối chiếu số định danh/họ tên. Bắt buộc quét QR đúng cấu trúc CCCD/Căn cước, chụp hai mặt và chân dung/video chuyển động trực tiếp. Hình minh họa quay trái/nhìn thẳng/quay phải tô sáng bước đang thực hiện; có hỗ trợ giảm chuyển động.

Khách nhập ngày hết hạn in trên thẻ ở màn xác nhận. Ngày do khách khai báo, không phải thông tin QR đọc được. Nếu thiếu ngày thì tiếp nhận để admin kiểm tra tối đa 3 ngày; ngày sai/đã hết hạn bị chặn. Tự duyệt chỉ khi có QR hợp lệ, chứng cứ đủ và ngày khai báo còn hiệu lực. Thời hạn verified identity kết thúc cuối ngày hết hạn theo múi giờ Việt Nam. Không tự suy ra hạn từ ngày sinh/ngày cấp.

Admin có ô nhập ngày hết hạn đọc trên ảnh. Backend tách lỗi chưa xác nhận kiểm tra, thiếu hạn và bộ ảnh/video thiếu thực sự. Không yêu cầu OCR hay bắt người quản trị nhập lại số/họ tên đã lưu từ QR. RPC admin kiểm quyền, khóa hồ sơ và cập nhật hạn + duyệt trong cùng giao dịch. Không tự duyệt lại hồ sơ cũ; nhánh worker OCR cũ chuyển chờ admin.

QR hợp cấu trúc không chứng minh thẻ thật hoặc người chụp là chủ thẻ. Không thực hiện đối sánh khuôn mặt, xác thực sinh trắc học hay kết nối cơ sở dữ liệu quốc gia. Hệ thống lưu biometricVerified=false, không mô tả kết quả QR là chứng nhận sinh trắc học. Khóa ảnh và phiên theo chủ tài khoản, chữ ký hash chứng cứ, QR hash, video và chống định danh trùng vẫn giữ.

SQL chỉ tạo/cập nhật hàm; không duyệt hồ sơ thật khi chạy migration. Hàm mới backend-only, áp security-lockdown sau migration. Cấu hình đơn vị tiếp nhận vẫn bắt buộc. Điều khoản V5 nêu nguồn dữ liệu, chính sách hạn và cách xử lý.

Kiểm tra PostgreSQL fixture: thiếu/hết hạn/đúng hạn, thiếu video, sai QR hash/session, không có quyền, admin bổ sung hạn và idempotence. Browser fixture dùng component thật với dữ liệu giả: nhập hạn, chặn hạn quá khứ, bỏ trống để chuyển admin, truyền hạn qua callback, loading và ba hình chỉ dẫn; chiều rộng 320/390/430/1440 không tràn. Không chụp hay duyệt tài khoản thật trong kiểm thử.

Website và app tải cùng runtime; không thay native code/config. Kiểm tra backend và hai renderer cùng build, cùng public catalog trên desktop/iPhone/Android sau phát hành.
