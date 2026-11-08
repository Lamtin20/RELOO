# Nguồn Việt Nam & ảnh biên tập — 16/10/2026

## Phạm vi thực tế

Registry gồm 10 đầu nguồn: MoMo tài chính cá nhân, Zalopay tài chính, Techcombank, Vietcombank, hai mục của Môi trường & Cuộc sống, GreenViet, PanNature, Tạp chí Môi trường và Báo Chính phủ (lọc tin tài chính/ngân hàng). URL được xác minh từ chính website/robots/sitemap của nhà xuất bản. Không tuyên bố quét toàn bộ Internet Việt Nam; bổ sung nguồn mới cần kiểm tra tên miền, điều kiện truy cập và bộ đọc. BIDV/VIB/VPBank mới được nghiên cứu, chưa đăng ký nguồn bài vì chưa xác minh được đường đọc bài phù hợp. ThienNhien.net đang trả 503; WWF Việt Nam trả 403. Môi trường & Cuộc sống tải được từ máy phát triển nhưng máy chủ bị 403; trạng thái được ghi rõ, không vượt chặn.

- HTML, sitemap và RSS. Sitemap lastmod chỉ xếp thứ tự khám phá, không là ngày đăng.
- Bot tự định danh RelooNewsBot, tôn trọng robots, chỉ HTTPS host đã duyệt, DNS công khai được pin, giới hạn timeout/dung lượng/chuyển hướng. Không đăng nhập, quét cổng, dò tài khoản hay lấy dữ liệu khách hàng.
- Mỗi lượt định kỳ tối đa 2 nguồn, 3 tài liệu/nguồn; từng nguồn cách nhau tối thiểu 15 phút. Timer kiểm tra 5 phút. --collect-only --collect-all dành cho khởi tạo có giới hạn tối đa 12 nguồn.
- Ngày đăng lấy từ Article/NewsArticle JSON-LD, meta ngày đăng, vùng ngày bài đã xác minh hoặc đối tượng __NEXT_DATA__ có tiêu đề khớp bài; không lấy ngày của chuyên mục hay ngày máy quét.
- Ngày không xác định/tài liệu cũ/nội dung quảng bá tài chính chỉ lưu metadata tham khảo. Không biến thành tin mới, không tự sao chép bài gốc hay ảnh báo chí.
- Nguồn nước ngoài cũ được tắt, không xóa lịch sử. Hàng đợi hiển thị nguồn Việt Nam đã duyệt.

## Tách quét nguồn khỏi đăng trả phí

collection_enabled vận hành độc lập khi enabled=false. Quét và lập kho metadata không gọi model trả phí. CRM có trạng thái kết nối Vibi riêng, nút kiểm tra kết nối bằng GET /models (không suy luận), nút bật/tạm dừng quét và kho tài liệu có ngày công bố.

API quản trị Vibi bằng key hiện tại trả 401, không có quyền đặt quota/tạo key có hạn mức. Công cụ truy cập phiên Windows cũng không khởi tạo được trong phiên này. Đã thay cơ chế chặn cũ bằng bộ giữ chỗ tiền và quyết toán usage nội bộ; xem NEWS_METERED_BUDGET.md. Đây là bộ kiểm soát ngân sách RELOO, không giả là quota tiền cứng từ provider.

## Kết quả chạy thật

- Đã kiểm tra CONNECTED trên máy chủ, có quyền xem hai model và đã chạy viết, soát, sinh ảnh thực tế.
- Đã bật collection_enabled, enabled, paid_api_enabled, metered_budget_enabled và paid_image_enabled, ngân sách vẫn 50.000đ/ngày. Timer active. Có 15 tài liệu metadata lưu từ các nguồn Việt Nam; bài cũ/ngày không rõ chỉ tham khảo.
- Hai bản viết đầu bị giữ do model tự chép sai trích dẫn. Đã đổi sang đoạn nguồn đánh số do hệ thống cung cấp, AI chọn ID, máy chủ gắn nguyên văn chứng cứ; review vẫn bắt buộc. Bản tiếp theo vượt qua kiểm tra.
- Sửa lỗi SQL xuất bản: biến result trùng cột automation_jobs.result; đổi thành published_id. Test fixture thêm cột result để kiểm tra hồi quy. Khôi phục từ ảnh/bài đã trả phí, không tạo ảnh lại.
- Bài đầu tiên đã công khai tại https://reloo.vn/news/hoan-thien-ha-tang-xu-ly-nuoc-thai-cho-cum-cong-nghiep-viet-nam-c4e471c8. Bài nguồn Tạp chí Môi trường, ảnh gpt-image-2 minh họa WebP. Tổng ledger ngày kiểm tra 5.521đ gồm mẫu và các lượt kiểm tra/ảnh; lượt tiếp theo INTERVAL_WAIT, không gọi trả phí tiếp khi chưa đến lịch.
- Kiểm tra mobile/desktop bài thật không tràn ngang, cover 1200px tải đủ. 31 kiểm thử nguồn/ngân sách/kiểm tra bài/bảo mật/WebP đạt, lint không lỗi, app/worker production build đạt. Mục tiêu 40 bài là tối đa, không bảo đảm đủ khi ngân sách/nguồn/chất lượng không cho phép.

## Hướng ảnh mới

Ảnh sinh gpt-image-2 qua Vibi /images/generations đã được thử thật, 1536×1024, low, không retry. Prompt output/news/vietnam-editorial-photo-prompt.txt. Chủ thể là đồ dùng đời sống ở Việt Nam, ánh sáng tự nhiên, vật liệu có kết cấu, không mascot/nhựa 3D/đồng tiền bay/biểu đồ giả. Không mô phỏng chi nhánh ngân hàng, người thật hay sự kiện thật. Không hứa ảnh không thể nhận diện là AI.

Ảnh được chuyển WebP; cover ảnh toàn khung với chân trang nhận diện nhỏ và nhãn Ảnh minh họa, không chữ lớn lặp tiêu đề. Ảnh gốc output/imagegen/vietnam-editorial-photo.png; WebP và cover trong output/news/. Tạo một mẫu minh họa, không phát sinh hàng loạt ảnh trong lúc đăng tự động còn khóa. Ngân sách gốc không tăng.
