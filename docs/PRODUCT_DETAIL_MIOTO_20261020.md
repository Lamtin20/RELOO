# Trang chi tiết sản phẩm theo tham chiếu Mioto — 20/10/2026

## Tham chiếu

Ảnh Mioto do người dùng gửi: ảnh tràn ngang ở đầu màn hình, thao tác nổi trên ảnh, tên và đánh giá bên dưới; thẻ lịch nhận/trả, lựa chọn giao nhận và bản đồ liền nhau; thanh giá/chọn thuê cố định ở đáy.

Đối chiếu thêm bằng chứng app Mioto đã thu thập trên Samsung: `output/rea/mioto-20261020/app-product.xml` và quy trình trong `docs/MIOTO_RENTAL_IDENTITY_ACCOUNT_20261020.md`. Đây là nguồn quan sát bố cục, không phải căn cứ thay giá hoặc chính sách kinh doanh của RELOO.

## Thay đổi

- Mobile tới 900px: ảnh 4:3 tràn ngang, không viền bo hay lề hai bên; quay lại, lưu, chia sẻ nổi trên ảnh. Vuốt ngang hoặc chọn chấm để đổi ảnh; bấm ảnh mở bản gốc trong lightbox. Ảnh bìa dùng cover; lightbox dùng contain để xem đủ ảnh gốc.
- Thông tin cơ bản nằm ngay dưới ảnh. Thẻ lịch thuê có hai cột nhận/trả, rồi lựa chọn tự đến lấy hoặc giao tận nơi theo khả năng chủ đồ đã cấu hình. Hiện khu vực lấy đồ và phí có dữ liệu thật. Không thêm nhãn hỗ trợ thuê giờ, giảm giá hay bảo hiểm giả.
- Bản đồ khu vực nằm ngay dưới lựa chọn giao nhận; bỏ phần bản đồ trùng ở nội dung thuê bên dưới. Thanh cố định giữ giá theo đơn vị tin đăng và tiền thuê dự kiến khi có đủ lịch, tránh nhầm tiền thuê nhiều ngày với giá một ngày. Cọc và giao nhận vẫn được giải thích trong thẻ và báo giá backend hiện có.
- Bấm vùng bản đồ hoặc liên kết mở bản đồ: iPhone/iPad dùng liên kết HTTPS Apple Maps, thiết bị khác dùng Google Maps. Hệ điều hành quyết định mở app đã cài hoặc trang web dự phòng. Bản đồ nhúng vẫn là Google Maps. Không thêm SDK/provider trả phí.
- Chỉ dùng khu vực công khai từ listing; không gửi tọa độ/địa chỉ riêng của chủ đồ. Thông báo trạng thái tài khoản được chuyển xuống dưới ảnh, giữ nguyên kiểm soát quyền thao tác.
- Desktop vẫn giữ gallery và bố cục nội dung/đặt thuê hai cột.

## Kiểm tra

- Playwright: 320, 390, 422, 768 và 1440px; mobile gallery x=0, width=viewport; không tràn ngang.
- Kiểm tra chấm chọn ảnh, vuốt bằng sự kiện touch thật qua CDP, mở/đóng lightbox; chọn lịch và lựa chọn giao nhận.
- Kiểm tra URL Google Maps, Apple Maps theo user agent; bấm vùng bản đồ mở cửa sổ ngoài với đúng đích Apple Maps (đích được mock trong bài kiểm tra để không phụ thuộc dịch vụ ngoài). Chưa xác nhận việc hệ điều hành mở app Maps trên iPhone/Samsung thật.
- 24 kiểm tra logic bản đồ/lịch/báo giá/tìm kiếm và 13 kiểm tra quyền riêng tư/chi tiết sản phẩm đạt. ESLint không có lỗi; còn cảnh báo ảnh đại diện chủ đồ dùng `<img>` vốn có.
- `next build --webpack` đạt, gồm TypeScript và giai đoạn tạo trang 146/146.
- Ảnh và script kiểm tra: `output/playwright/product-mobile-full-width.png`, `product-camera-mobile.png`, `product-rental-map.png`, `product-desktop-layout.png`, `check-product-reference.cjs`, `check-gallery-map-tap.cjs`.

Thay đổi hiện nằm trong workspace, chưa triển khai lên `reloo.vn` và chưa phát hành APK/IPA.
