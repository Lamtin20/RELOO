# Gương mặt, ảnh nét và OCR/QR — 21/10/2026

## Thay đổi

- Xử lý khuôn mặt dùng module MediaPipe 0.10.32 tự lưu tại `/vision/mediapipe-0.10.32/vision_bundle.mjs`. Không phụ thuộc chunk Next tải muộn của bản build cũ; import lỗi được thử lại bằng URL mới mà không xóa ảnh đã chụp. Bắt đầu ghi video sau khi mô hình sẵn sàng, để thời gian tải mô hình không ăn vào giới hạn quay.
- Camera yêu cầu tới 2560px cho giấy tờ và 1920px cho chân dung nếu thiết bị hỗ trợ. Tìm viền trên bản 960px nhưng căn chỉnh/cắt từ ảnh gốc tới 2560px, lưu tối đa 2400px, không phóng ảnh nhỏ thành ảnh lớn. JPEG 96%, giảm chất lượng chỉ khi vượt giới hạn 2 MB; backend giữ tới 2400px/94%.
- OCR nội bộ có nhận diện loại thẻ, tìm hướng chữ và nhãn thông tin. Thẻ căn cước dùng nhãn số định danh cá nhân; CCCD dùng số/No và họ tên. Không truyền QR hoặc số khai báo vào OCR. Có lọc nền, đọc dòng riêng và dùng QR để đối chiếu sau khi đọc.
- Quy tắc `OCR_QR_V1`: số 12 chữ số phải khớp nguyên vẹn; họ tên khớp sau chuẩn hóa chữ hoa, dấu và khoảng trắng, không fuzzy/sửa OCR thành nội dung QR. Mỗi trường OCR phải có điểm hợp lệ tối thiểu 50/100; loại thẻ đã nhận diện và ngày hết hạn hợp lệ. Mâu thuẫn, thiếu dữ liệu, ảnh không đọc được hoặc hết hạn đi admin với deadline ban đầu tối đa 3 ngày.
- Xác nhận gửi theo thông báo V4 và chính sách 2026-10-21.1. Duyệt tại backend/RPC chỉ service_role được gọi; lưu đủ ảnh/phiên/video, transaction ghi verified_identities + L2 + audit. Không duyệt từ boolean phía trình duyệt, không tạo kết quả sinh trắc học giả, không hỏi CSDL quốc gia. Không tự xác minh các ảnh mẫu hoặc tài khoản thật trong quá trình triển khai.
- API thử đối chiếu ngay sau transaction nhận hồ sơ; worker là đường xử lý lại nếu OCR chưa sẵn sàng. Hồ sơ cũ chưa có V4 không tự chuyển sang duyệt tự động. Mismatch/manual admin giữ nguyên quyền đọc đủ ảnh và thời hạn xử lý.

## Bằng chứng và kiểm tra

Ảnh hai mẫu thật, bản thân và QR dùng trong `output/rea/identity-auto-20261021/`, không đưa vào asset công khai. OCR đọc được số và họ tên của cả hai mẫu; mẫu căn cước ghép với QR cùng thẻ cho kết quả đủ điều kiện. Không dùng ngày hết hạn của mặt sau mẫu này để kết luận mẫu khác được duyệt. Hạn thẻ không đọc chắc chắn vẫn phải về admin.

Browser fixture: camera 2560×1920, ảnh chụp preview lớn hơn 1600px, căn chỉnh đúng tỷ lệ, QR thật đọc/quét lại; chặn chunk 5356, cố tình cho module khuôn mặt lỗi 503 lần đầu, vẫn tải lại module + WASM + mô hình thành công và mở camera chân dung. Kiểm tra hủy tắt track. Đây là kiểm thử trình duyệt bằng camera giả, không thay thế test camera Safari vật lý.

PGlite: hai loại thẻ, match/mismatch/ảnh yếu/hạn hết hạn, RPC không cho authenticated gọi, capture thiếu/video sai, số thay đổi, transaction duyệt/không duyệt, giữ quyết định admin và audit idempotent. Baseline quyền, cookie và CSP được giữ. Migration phải chạy trong transaction rồi `security-lockdown.sql`.

Triển khai đồng bộ app/web, worker và dịch vụ OCR riêng. Không thay native code. Rollback image/source và routine submit cũ giữ nguyên hồ sơ/giao dịch và audit đã ghi.
