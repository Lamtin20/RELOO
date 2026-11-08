# Khảo sát marketplace và cải tiến RELOO — 17/10/2026

## Phạm vi và bằng chứng

Dùng REA đã pin trong `tools/rea-toolchain.json`, browser thật và Samsung Android đã được chủ máy mở khóa. Bằng chứng nằm tại `output/rea/` (ignored, không đưa tài sản của đối thủ lên website RELOO).

| Nguồn | Kiểm tra thực tế | Điều học và áp dụng |
|---|---|---|
| [Mioto](https://www.mioto.vn/car/hyundai-stargazer-2025/KH37HM) | Web desktop/mobile, REA accessibility/runtime | Thời gian, giá và hành động thuê rõ; tái sử dụng chi tiết sản phẩm/luồng đặt hiện hữu, không sao chép cam kết bảo hiểm hoặc chính sách xe |
| [Chợ Tốt](https://www.chotot.com/) | Web desktop/mobile; bấm Chat trên trang sản phẩm dẫn tới yêu cầu đăng nhập | Tìm kiếm và khu vực rõ, phân biệt ý định giao dịch, giữ lựa chọn khi quay lại; không gửi chat thử tới người bán |
| [Đồ Chất](https://www.dochat.com.vn/) | Web chi tiết; app `com.dochat.app` trên Samsung: trang chủ, danh mục, chi tiết sản phẩm | Ảnh/giá nổi bật, CTA nhất quán, nhóm lọc phù hợp; không bắt khách RELOO cài app để dùng web |

Không có app Mioto/Chợ Tốt trên thiết bị nên không xác nhận luồng native của hai app này. Đồ Chất ban đầu hiện thông báo dùng dữ liệu ngoại tuyến; quan sát giao diện không chứng minh backend hoặc thanh toán hoạt động. Không truy cập API riêng, không gửi giao dịch, thanh toán hay tin nhắn thật. Không suy diễn thuật toán xếp hạng từ giao diện.

REA evidence chính: `mioto-home-desktop.json` (`ev_c559b030e97a3950d4bf00a7cc89b7407e73d1faffd778e0841bf846b89f1613`), `mioto-detail-desktop.json` (`ev_cedd38b9956f565e6cabcd5327b71e027b151ab3e15ab0cb5ff150f0e32c938d`), `chotot-contact-mobile.json` (`ev_0f8be8176f54a5fd7e678fbf9cc53f2c4e17e28d397df37184b446460c7c2019`). Các file `chotot-home-mobile.json`, `dochat-home-mobile.json`, `chotot-detail-desktop.json`, `dochat-detail-desktop.json` lưu thêm quan sát. Ảnh app đã xem: `dochat-unlocked-home/screen.png`, `dochat-native-category-settled/screen.png`, `dochat-native-product/screen.png`.

## Đã triển khai trong stack hiện có

Luồng chung: Khám phá → Tất cả/Thuê/Mua → bộ lọc khu vực và giá → chi tiết → yêu cầu thuê/mua hiện hữu → đơn hàng chung. Không tạo ứng dụng hoặc backend giao dịch riêng.

- `components/search/DiscoveryIntent.jsx`, CSS và `lib/i18n/discovery.js`: lựa chọn Thuê/Mua, thời lượng ước tính, nhãn giá, số kết quả đang hiển thị, chip lọc có thể bỏ từng mục, nội dung mới vi/en.
- `app/explore/page.js`, `ExploreFilters.jsx`: lưu bộ lọc bằng URL và giữ khi back; không tự xin GPS lúc mở; không gán địa chỉ mặc định giả; chưa chọn khu vẫn xem được sản phẩm. Xóa lọc giữ ý định giao dịch và khu vực.
- `ListingCard.jsx`, `ListingGrid.jsx`, `app/product-cards.css`: thẻ có liên kết riêng, nút lưu không lồng trong link; thiếu đánh giá nói rõ; khoảng cách từ dữ liệu khu vực được gắn nhãn ước tính, không gọi là thời gian đi bộ.
- `ProductClient.jsx`, `lib/marketplace-channels.js`, `lib/analytics/public-product.js`: giữ đúng BOTH từ backend; vào từ Mua hiển thị giá bán và yêu cầu mua, vẫn kiểm tra loại giao dịch hợp lệ. Không tự tạo đơn hoặc thay giá.
- `lib/owner-draft.js`, `ListingComposer.jsx`, CSS: nháp phiên thiết bị tách theo tài khoản, TTL 24 giờ. Chuyển nháp khách sau đăng nhập chỉ với nonce có hạn 15 phút, dùng một lần. Nháp cũ chưa gắn chủ chỉ khôi phục khi người dùng xác nhận; lỗi lưu không báo thành công giả.
- `lib/search/listing-query.js`, `lib/store.js`: tìm kiếm tiếng Việt không dấu; sửa lỗi crash khi mô tả/vị trí trống.

Thời lượng trên danh sách chỉ ước tính tiền thuê, không xác nhận lịch trống hoặc tổng thanh toán. Luồng xác nhận giá, lịch, quyền và thanh toán vẫn qua backend hiện có. Nháp không phải đồng bộ cloud. Nội dung mới có vi/en; một số nhãn/form cũ vẫn tiếng Việt, chưa tuyên bố dịch toàn ứng dụng. Không thêm migration, provider trả phí, quyền database hay thay đổi chính sách cọc.

## Kiểm thử có bằng chứng

- 11 kiểm thử tự động đạt: 5 nháp, 2 truy vấn/loại giao dịch, 4 security hardening.
- Build production local đạt; ESLint phạm vi thay đổi không có lỗi, còn hai cảnh báo raw img của avatar/preview hiện hữu.
- Browser fixture riêng tại localhost: 320/390/768/1440 px không tràn chiều ngang; Thuê/Mua và ước tính; không xin GPS tự động; lưu không điều hướng; back giữ lọc; nháp reload được nhưng tài khoản khác không thấy; BOTH/Mua đúng CTA; tìm kiếm rỗng và khôi phục nháp cũ có xác nhận.
- Script bằng chứng: `output/rea/discovery-browser.js`, `discovery-edge-browser.js`; cả hai trả `passed: true`. Dữ liệu ảnh/tin có nhãn TEST, auth mô phỏng trong môi trường test; không phải giao dịch production.
- Ảnh đã xem: `reloo-discovery-390.png`, `reloo-discovery-1440.png`, `reloo-buy-intent-mobile.png`, `reloo-discovery-english-mobile.png`, `reloo-composer-legacy-restored.png`. Có thêm ảnh 320/768 px.

Không báo build/simulator iOS hoặc native RELOO đã kiểm thử trong đợt này. Một lần chụp reference bị timeout và các lần browser đầu bị chậm/hydration không được tính PASS; các ca cuối được chạy lại thành công trong phiên sạch.

## Triển khai và rollback

Phát hành app-only bằng manifest 16 file tại `output/deployment/rea-experience-runtime.json`. Sao lưu source và database mã hóa trước triển khai; build staging trước đổi container; giữ image trước đó và tự rollback nếu bước kích hoạt lỗi. Không khôi phục database đè giao dịch khách. Kết quả kiểm tra production ghi riêng tại `output/deployment/rea-experience-verification.json` khi phát hành hoàn tất.

Đã phát hành `rea-experience-1792244854299`, build ID `8LJIMbva1h0neG1HVzeGH`. Container healthy, public health/home 200, 16/16 hash source khớp; API đơn/thông báo/ngôn ngữ trả 401 khi chưa đăng nhập. Browser production không mock đạt: 390/1440 px không tràn ngang, chuyển Mua ẩn thời lượng thuê, form đăng tin tải được. Danh sách Thuê thực tế trả 11 card, không có button lồng trong link; Mua hiện 0 kết quả, không bổ sung số liệu demo. Ảnh production: `reloo-production-mobile-rent.png`, `reloo-production-desktop-rent.png`; script `production-smoke.js`, `production-cards.js`. Ổ C sau build còn khoảng 7,5 GiB; đây là ảnh chụp trạng thái hiện tại, không đảm bảo server sẽ không mất kết nối về sau.
