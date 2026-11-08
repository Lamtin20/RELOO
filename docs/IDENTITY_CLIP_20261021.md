# Luồng CCCD theo clip — 21/10/2026

Nguồn: clip người dùng cung cấp, 96,68 giây, 442×960. SHA-256 và mốc quan sát lưu tại `output/rea/identity-clip-20261021/reference-evidence.json`. Công cụ REA đang cài không có bộ phân tích thao tác từ video; dùng ffprobe/ffmpeg trích khung hình cục bộ. Clip và ảnh giấy tờ tham chiếu chỉ nằm trong output bị ignore, không đưa vào asset công khai hay hồ sơ xác minh.

## Quan sát và áp dụng

- Clip: hướng dẫn dùng thẻ gốc; camera nền tối, khung chữ nhật; xem lại từng mặt với Chụp lại/Tiếp theo; hướng dẫn khuôn mặt và khung oval; rà soát thông tin trước khi xác nhận.
- RELOO: giữ bốn bước mặt trước → mặt sau → QR → chân dung. Camera nền xanh đen, khung thẻ đúng tỷ lệ, nút chụp tròn; hai nút khi xem lại. Hướng dẫn có thể mở trong lúc chụp; mở hướng dẫn dừng stream, đóng mới mở lại.
- QR không xuất hiện trong clip. Bước bổ sung dùng khung vuông, decoder jsQR hiện có, bắt buộc đọc QR hợp lệ và xác nhận dữ liệu; có Quét lại. Đọc QR chưa phải xác minh danh tính.
- Trước camera trước có hướng dẫn riêng, camera vẫn tắt tới khi chọn Tôi đã hiểu. Giữ kiểm tra chuyển động/video hiện tại. Màn rà soát có nút Thông tin không chính xác · Chụp lại để bắt đầu lại bằng session mới của luồng.
- Giữ dữ liệu thực do QR/API cung cấp; không suy ra ngày hết hạn, nơi cấp hay kết quả duyệt từ clip. Hồ sơ vẫn chờ backend kiểm duyệt. Không sao chép thông báo xác thực thành công của ứng dụng tham chiếu vào bước gửi hồ sơ.
- Đoạn email/OTP cuối clip không thay thế cơ chế đăng nhập RELOO. Không thêm nhà cung cấp hoặc thay chính sách duyệt.

## Kiểm tra

21 kiểm tra về QR, căn chỉnh ảnh, phiên chụp, consent transaction, chính sách danh tính và security baseline đạt. ESLint không có lỗi (cảnh báo img preview blob hiện có).

Browser fixture tại `output/rea/identity-clip-20261021/check-browser.cjs`: camera giả bằng Y4M chứa QR thử nghiệm, đọc thực qua jsQR; kiểm tra tự mở camera, hướng dẫn dừng/mở stream, chụp/chụp lại, mặt sau, đọc/quét lại QR, hướng dẫn chân dung và hủy không mở lại. Viewport 320/390/430/1440 không tràn ngang và nút chụp trong viewport. Đây là kiểm tra fixture, không gửi căn cước thật và không chứng minh kết quả chống giả mạo/duyệt thật.

## Đồng bộ

Không thay native code/config. Android/iOS hiện tải runtime `https://reloo.vn`; khi triển khai phải đồng bộ backend và hai web renderers, đối chiếu runtime và public catalog bằng desktop/iPhone/Android. Client đang mở hoặc offline cần tải lại.
