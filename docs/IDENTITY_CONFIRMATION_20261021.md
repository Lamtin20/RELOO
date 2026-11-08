# Xác nhận căn cước gọn và đối chiếu trước xác nhận — 21/10/2026

Luồng: đồng ý xử lý dữ liệu → camera hai mặt / QR / chân dung → chờ đối chiếu thật → xác nhận bốn thông tin chính → gửi hồ sơ. Chính sách và thông tin đơn vị nằm trong phần mở rộng. Không hiển thị trạng thái chờ đối chiếu như lỗi không khớp.

Nguồn tham chiếu là clip Tikop người dùng cung cấp. Khung hình và giới hạn công cụ ghi trong `docs/IDENTITY_CLIP_20261021.md`; đã xem lại contact sheet cục bộ. Clip có bước chờ và xác nhận sau chân dung; QR là bước bổ sung của RELOO, không quan sát thấy trong clip.

`POST /api/kyc/preview` chỉ xử lý tạm ảnh hai mặt, cần đăng nhập, origin hợp lệ, vùng VN, đơn vị tiếp nhận chính thức, consent/version, phiên camera thuộc chủ tài khoản chưa dùng/hết hạn và SHA-256 ảnh khớp manifest. Không ghi ảnh, tạo hồ sơ, tiêu thụ phiên hoặc duyệt tài khoản. Không gửi QR tới OCR. Kết quả chỉ gồm các cờ đối chiếu, không sao chép QR vào kết quả OCR. Nộp cuối vẫn kiểm tra toàn bộ chứng cứ và OCR độc lập; preview không có quyền quyết định duyệt.

Bộ OCR không thay đổi ngưỡng hoặc thuật toán trong lần này. Cùng một helper được dùng cho preview và quyết định sau gửi để tránh hai cách gọi khác nhau. Không khớp, không đọc rõ, dịch vụ chưa sẵn sàng và cần kiểm tra hạn thẻ có thông báo khác nhau. Không tự suy ra kết quả từ việc đọc QR thành công.

Thông tin pháp lý người dùng cung cấp trước đó là bản mẫu và vẫn ở entity_draft. Nếu đơn vị chính thức chưa hoàn tất, luồng thông báo ngắn ngay trước camera và không nhận ảnh. Không dùng bản mẫu để vượt chặn. Chỉ admin lưu thông tin chính thức mới mở được tiếp nhận.

Kiểm tra: `tests/identity-preview.test.mjs` kiểm tra guard, phiên khác chủ, sửa hash, consent cũ và ba kết quả OCR; kiểm tra giao dịch auto-approve, consent và security baseline hiện hữu. Browser fixture dùng trang và component thật, mô phỏng riêng kết thúc camera và API, kiểm tra chờ → kết quả → xác nhận một lần, không gửi trước xác nhận, không tràn 320/390/430/1440. Đây không phải kiểm tra khuôn mặt thật hoặc hồ sơ được duyệt thật. Bằng chứng cục bộ ở output/rea/identity-review-20261021.

Không thay native code. Website và các app tải cùng runtime, cần kiểm tra backend và hai renderer cùng build sau triển khai. Thiết bị đang mở hoặc offline cần tải lại.
