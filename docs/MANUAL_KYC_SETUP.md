# Hồ sơ căn cước do admin duyệt

Giai đoạn hiện tại dùng `RELOO_KYC_MODE=MANUAL`. Người dùng nhập bắt buộc số căn cước 12 chữ số và ngày hết hạn còn hiệu lực, gửi ảnh mặt trước/mặt sau thẻ và chụp chân dung bằng camera trong trình duyệt. Hồ sơ được đưa thẳng vào `REVIEW`, không tạo tác vụ OCR, so khớp khuôn mặt hay gọi VNPT.

- Cả ba ảnh không có ô chọn file. Giao diện bắt đầu bằng “Xác thực CCCD”, lần lượt chụp mặt trước, mặt sau rồi chân dung. Camera dùng `getUserMedia`, không ghi âm và không quay video. MediaPipe Face Landmarker chạy tại thiết bị với mô hình/WASM phục vụ từ RELOO, yêu cầu một khuôn mặt và giữ từng tư thế nhìn thẳng, trái, phải, nhìn thẳng trước khi tự chụp. Các track được tắt khi chụp xong, đóng camera, chuyển trang hoặc ẩn trang.
- Phiên chụp gắn với tài khoản, có hạn 15 phút và chỉ dùng một lần. Đây là ghi nhận luồng camera của giao diện, không phải bằng chứng kiểm tra sống hay chứng nhận nguồn ảnh ở mức thiết bị; admin phải đối chiếu ảnh trực tiếp.
- API kiểm tra đủ ba ảnh, mã băm ảnh khớp lượt chụp, thứ tự tư thế, số căn cước, ngày hết hạn và sự đồng ý gắn phiên bản thông báo/pháp nhân. Ảnh mã hóa ở máy chủ Việt Nam, ngoài thư mục công khai. Không còn tác vụ tự xóa ảnh sau 30 ngày: hồ sơ lưu trong thời gian tài khoản tồn tại, việc xóa hồ sơ thực hiện theo yêu cầu xóa tài khoản đủ điều kiện.
- Gửi lại hồ sơ thay thế phiên chờ duyệt trước trong một giao dịch cơ sở dữ liệu; hồ sơ cũ vẫn có lịch sử. Phiên chụp chỉ được tiêu thụ khi toàn bộ hồ sơ được lưu thành công.

Hạn kiểm duyệt là 72 giờ tính từ thời điểm nhận hồ sơ, bao gồm cuối tuần. CRM sắp xếp hồ sơ theo hạn, đếm hồ sơ đang chờ/quá hạn và đánh dấu quá hạn để admin ưu tiên. Worker ghi một cảnh báo quá hạn trong nhật ký. Hết hạn duyệt không tự phê duyệt hoặc tự từ chối.

Admin cần quyền `kyc.read` và `kyc.write`, đọc được đủ ảnh mặt trước/mặt sau/chân dung, xác nhận đối chiếu, nhập họ tên và số căn cước đúng với khai báo, cùng lý do quyết định. API ảnh chỉ ghi nhận đã xem sau khi đọc và giải mã thành công. Phê duyệt giấy tờ không tự gỡ hạn chế rủi ro hoặc blacklist. Thông tin định danh được duyệt giữ ngày hết hạn thực tế của thẻ.

Hồ sơ cũ được giữ và chuyển sang chờ duyệt thủ công. Hồ sơ thiếu số căn cước/ngày hết hạn cần người dùng gửi lại bản khai đầy đủ; không tự suy đoán các trường thiếu. Các nút xác nhận OCR và tạo thử thách video bị chặn trong giai đoạn này. Khóa VNPT được giữ ở cấu hình riêng nhưng trạng thái tích hợp là tạm dừng.

Áp dụng `deploy/vietnam/manual-kyc.sql` trước khi triển khai API/giao diện. Kiểm tra: `node --test tests/manual-kyc.test.mjs`. Kiểm tra camera trên trình duyệt không gửi hồ sơ giả vào tài khoản thật.
 
Đợt cập nhật 11/10 cần thêm `interface-refinement.sql`, `identity-retention.sql`, `wallet-display.sql`, `payout-refunds.sql`, `rental-payments.sql`. Xóa tài khoản kiểm tra và khóa hồ sơ trong giao dịch SQL; chặn hợp đồng/giao dịch chưa đóng, yêu cầu chi trả, số dư chưa đối soát, VA còn thu tiền và quyền quản trị chưa bàn giao. Worker xóa file theo danh sách an toàn đã ghi, xóa tài khoản đăng nhập rồi đánh dấu hoàn tất; có thể thử lại sau lỗi mà không mở lại tài khoản. Chứng từ kế toán và lịch sử hợp đồng bắt buộc giữ được tách khỏi hồ sơ cá nhân.
> Current intake update: see [Experience and identity update](EXPERIENCE_IDENTITY_20261017.md). The four-step flow now reviews QR locally and commits it with the final acknowledged submission through `identity-consent-submit.sql`. Notice version is `RELOO_KYC_QR_REVIEW_V3`. Controller legal name, address and privacy email are read from CRM before capture/submission; incomplete details block new intake. Existing manual review, encryption and retention remain in place.

