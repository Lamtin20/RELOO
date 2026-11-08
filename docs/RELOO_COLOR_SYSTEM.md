# Bảng màu RELOO

Nguồn màu: `lib/design/palette.js`; token CSS: `app/reloo-palette.css`. Mọi nội dung mới dùng màu theo vai trò, không tự chọn màu pastel khác cho cùng một trạng thái.

| Vai trò | Màu | Cách dùng |
|---|---|---|
| CTA chính | `#087F5B` | Nút chính, link, trạng thái chọn |
| CTA hover | `#056445` | Tương tác trên CTA |
| Chữ chính | `#173B2D` | Tiêu đề, nội dung |
| Chữ phụ | `#536D60` | Mô tả, ghi chú |
| Nền trang | `#EDF3EF` | Tạo khoảng tách giữa các card |
| Card | `#FFFFFF` | Form, sản phẩm, hộp thoại |
| Viền | `#CCDCD1` | Đường phân cách |
| Thu nhập / thuê | `#DDF4E5` | Card xanh mint, chữ mực chính |
| Tin cậy | `#225FAD` / `#E2EDFF` | Chữ và nền card an tâm |
| Ưu đãi | `#8D5216` / `#FFE3AA` | Chữ và nền hoàn tiền |
| Video | `#513294` | Shorts; dùng chữ trắng |
| Lỗi | `#B42336` | Lỗi và thao tác nguy hiểm |

Card trắng trên nền trang có viền và bóng nhẹ; card dịch vụ dùng màu nền rõ hơn. Header bo hai góc dưới 28px trên cả desktop/mobile. Chữ thường cần contrast ≥4.5:1; màu trang trí không dùng thay nhãn bằng chữ. Màu biểu đồ/trạng thái phải có nhãn hoặc icon để không chỉ phụ thuộc màu.

Đã triển khai ngày 13/10/2026: header chỉ có Đăng nhập cho khách chưa đăng nhập; Quên mật khẩu nằm dưới trường mật khẩu. Build local/server đạt, kiểm thử tương phản đạt, lint không có lỗi; 7 tệp khớp bản triển khai, server healthy. Backup: `/srv/reloo/backups/palette-login-20261013`. Thay đổi giao diện được app WebView nhận khi tải lại, không cần thay native package. Ảnh lợi ích AI chưa tạo: công cụ image_gen không có trong phiên; brief nằm tại `docs/RENTAL_BENEFITS_IMAGE_BRIEF.md`.
