# Trang tin theo chủ đề RELOO

Sáu landing page: kinh-nghiem-thue-mua, loi-ich-cua-thue, san-pham-thiet-bi, tai-chinh-ca-nhan, tai-chinh-dau-tu, song-xanh-tai-su-dung dưới /news/chu-de/. Mỗi trang có H1, mô tả, title, canonical và Open Graph riêng; schema CollectionPage/ItemList/BreadcrumbList dùng nonce CSP. Không nhồi meta keywords hoặc dùng khẳng định thứ hạng.

| Nhóm | Ý định tìm kiếm / cụm từ biên tập |
|---|---|
| Kinh nghiệm thuê–mua | hướng dẫn thuê đồ, kiểm tra đồ trước khi thuê, kinh nghiệm thuê máy ảnh |
| Lợi ích của thuê | thuê hay mua, tổng chi phí thuê đồ, khi nào nên thuê |
| Sản phẩm & thiết bị | chọn máy ảnh, đồ cắm trại, tính năng thiết bị |
| Tài chính cá nhân | quản lý chi tiêu, lập ngân sách mua sắm |
| Tin tài chính & đầu tư | tin tài chính, cập nhật thị trường, nguồn và thời điểm công bố |
| Sống xanh | tái sử dụng đồ dùng, sửa chữa, tiêu dùng bền vững |

Cụm từ phải phù hợp thực chất bài; không tự sửa hàng loạt bài nháp, không đổi slug bài cũ, không tự công khai bài để lấp chuyên mục. Các tên category đang có được ánh xạ sang taxonomy. Có tìm kiếm không dấu theo tiêu đề/mô tả/tags, phân trang 12 bài, bài nổi bật, CTA và breadcrumb về chuyên mục. Ảnh qua media WebP hiện có, không phát sinh API tạo ảnh cho việc đổi giao diện.

Chuyên mục rỗng: noindex, không vào sitemap; tìm kiếm và trang phân trang noindex/follow để hạn chế trang gần trùng. Chuyên mục có bài được đưa vào sitemap. Danh sách hiện dùng 200 bài gần nhất theo publicNews; newsBySlug tra trực tiếp DB nên bài cũ vẫn mở được. Muốn lập sitemap toàn bộ kho lớn hơn 200 bài cần mở rộng cơ chế sitemap/listing theo batch; chưa tuyên bố đã hỗ trợ kho không giới hạn.

Thiết kế điều chỉnh ngày 16/10/2026: tiêu đề và mô tả ngắn, form tìm kiếm rõ, thanh chuyên mục gạch chân. Bỏ sáu thẻ chuyên mục trùng lặp, ký hiệu trang trí và toàn bộ mũi tên trong link/nút trang tin và trang đọc bài. Không hiển thị nhiều số 0 khi chưa có bài. Empty state gọn, link về /help và /explore ở trang tổng; trang chủ đề có thể về /news, kết quả tìm kiếm có thể xóa query. Không có link tự quay về trang tổng đang rỗng. Bài nổi bật và lưới ba cột trên desktop; mobile một cột, tab cuộn ngang. Có focus keyboard. Preview có bài dùng dữ liệu nháp kèm nhãn rõ, không dùng làm trang public.

Không có bảo đảm traffic hoặc thứ hạng. Hiệu quả cần đánh giá bằng dữ liệu Search Console/analytics thực tế; không cấu hình hoặc giả số liệu khi chưa có tài khoản/property được xác minh.
