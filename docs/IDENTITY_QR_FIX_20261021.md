# Sửa quét QR căn cước — 21/10/2026

Đã tái hiện bằng ảnh gốc người dùng cung cấp. Bộ đọc jsQR cũ không giải mã được ảnh toàn thẻ này. ZXing-C++ đọc được; payload có 7 trường dữ liệu và 4 trường dự phòng rỗng cuối chuỗi. Parser cũ yêu cầu đúng 7 phần nên còn từ chối payload, trong khi vòng quét nuốt lỗi và tiếp tục không báo nguyên nhân.

- Dùng `zxing-wasm@3.1.6`, reader WASM phục vụ cùng origin tại `/vision/zxing_reader-3.1.6.wasm`; không tải decoder từ CDN và không gửi ảnh sang nhà cung cấp. Giấy phép giữ tại `public/vision/zxing-wasm-LICENSE.txt`.
- Chỉ bỏ các trường rỗng dự phòng ở cuối. Trường bổ sung có dữ liệu vẫn bị từ chối rõ ràng; giữ kiểm tra số thẻ, tên, ngày sinh, giới tính, ngày cấp và trạng thái chưa xác minh. API và camera dùng chung parser.
- Quét vùng khung có thêm lề; nếu chưa thấy mã, thử toàn khung camera. Giữ độ phân giải tới 1600px, yêu cầu camera QR 1920px nếu thiết bị hỗ trợ và bật lấy nét liên tục khi có khả năng.
- Thông báo khi bộ đọc không tải được hoặc QR đọc được nhưng dữ liệu không hợp lệ. Sau 8 giây chưa đọc được, hướng dẫn khoảng cách và ánh sáng. Giữ dừng stream khi rời bước/hủy/hướng dẫn.

Kiểm tra: fixture parser không chứa thông tin thật; browser dùng ảnh gốc làm camera giả, không gửi hồ sơ. Đọc được QR, rà soát thông tin, quét lại, chuyển hướng dẫn khuôn mặt, hủy không mở lại; thử 320/390/430/1440px. Ảnh và payload thật chỉ ở output bị ignore, không vào asset website hoặc dữ liệu xác minh.

Triển khai: runtime hệ thống dùng lại thư viện hệ điều hành từ image đang chạy; cài lại dependencies theo package-lock mới cho cả builder và runner. Không sửa schema, CSP, cơ chế cookie hay native code. Đồng bộ backend và hai web renderers, kiểm tra runtime/catalog qua desktop/iPhone/Android sau triển khai.
