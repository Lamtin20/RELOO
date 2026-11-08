# Vibi cho tin tức và ảnh

Người dùng đã cho phép API trả phí để bổ sung thông tin mới và thiết kế hình ảnh, và chốt tổng ngân sách **50.000đ/ngày** cho lấy nguồn, viết/soát bài và ảnh. Đã lưu daily_budget_vnd=50000, provider=VIBI trên máy chủ. Không bảo đảm đủ 40 bài/ngày trong ngân sách này. Chế độ chạy định kỳ trả phí vẫn tắt vì chưa có hạn mức tiền được thực thi tại provider; không coi giới hạn lượt gọi là giới hạn tiền. Key hiện tại dùng chung và có quota unlimited, nên không bật một vòng tự động có thể vượt ngân sách người dùng đã chốt.

## Xác minh thực tế

- [Hướng dẫn client chính thức của Vibi](https://vibi.top/docs-setup/en/docs/clients) xác nhận catalog `/v1/models`, Chat Completions `/v1/chat/completions` và cảnh báo tên model không chứng minh khả năng search/image/tool.
- Catalog xác thực trả claude-sonnet-4-6 và gpt-image-2. `/api/pricing` xác nhận model text hỗ trợ Chat Completions, model ảnh hỗ trợ image-generation. Không đồng nhất hai khả năng này.
- Đã gọi claude-sonnet-4-6 qua POST Chat Completions: HTTP 200, content OK, finish_reason stop, usage JSON. Chưa xác nhận tìm kiếm web tích hợp; không giả API text là công cụ realtime.
- Image edit multipart `/v1/images/edits`, model gpt-image-2, ảnh tham chiếu và phản hồi base64 đã được xác nhận bằng các lần tạo banner trong workspace.
- `/docs-setup/api/usage` được phát hiện từ mã client chính thức, POST apiKey/startDate/endDate trả quota/usage. Key đang dùng chung với hoạt động khác, nên tổng ngày không thể coi là chi phí riêng của tin tức. Không lưu nội dung này vào log công khai.

## Tích hợp

`lib/news-autopilot/vibi.js` quản lý giao thức, không retry; `paid.js` gọi text/ảnh sau khi giữ chỗ trong DB. Bằng chứng nguồn và kiểm tra biên tập giữ nguyên. Chỉ gửi đoạn nguồn công khai và asset mascot cần thiết; không gửi dữ liệu khách hàng. Ảnh sinh được chuyển WebP, ghép chữ Việt bằng Sharp và ghi minh họa.

Secret lưu trong integration_settings provider VIBI_NEWS, secrets_encrypted bằng cơ chế AES-GCM hiện có. Biến dự phòng VIBI_BASE_URL/VIBI_API_KEY/VIBI_TEXT_MODEL/VIBI_IMAGE_MODEL. Không trả key qua API CRM.

Migration news-paid-api.sql mặc định paid_api_enabled=false, daily_api_call_limit=0, daily_budget_vnd=null. Phải chốt ngân sách và thiết lập giới hạn thực tế trước khi bật. daily_budget_vnd là ngân sách được chấp thuận, **không phải cơ chế chặn tiền cứng**: giá provider và key dùng chung không cho bảo đảm hạn mức chính xác. DB chặn cứng số lượt gọi, tính cả RESERVED/UNCERTAIN để không gọi lại sau timeout. Để bảo đảm trần tiền, dùng key riêng có quota tại provider và xác minh giá/đơn vị billing; không đoán tỷ giá hoặc chuyển đổi quota.

Lấy thông tin mới tiếp tục bằng RSS/trang gốc HTTPS từ nguồn chính thức, có ngày công bố và phạm vi thị trường; paid text không thay thế nguồn gốc. API tìm kiếm web bổ sung chỉ bật khi endpoint, giao thức và quyền của provider đã được xác nhận.

## Kết quả chạy thử

- 1 probe text, 1 lượt viết và 1 lượt review thực tế bằng claude-sonnet-4-6. Bài Google về sửa chữa/tái sử dụng vượt qua validateGenerated và review: PASS, unsupportedClaims=[], vietnameseClear=true, originalSummary=true.
- 1 ảnh tham chiếu thực tế bằng gpt-image-2 qua CLI skill imagegen và Vibi Image Edit. Không gọi lại khi thành công; ảnh gốc output/imagegen/news-repair-pilot.png, WebP output/news/vibi-repair-scene.webp, cover output/news/vibi-pilot-cover.webp. Prompt cuối output/news/vibi-editorial-image-prompt.txt. Không dùng model văn bản làm ảnh.
- Đã nhìn trực tiếp ảnh và bản xem mobile; ảnh giữ những đặc điểm nhận dạng mascot, là minh họa về sửa chữa, không ảnh sản phẩm chính thức. Chữ được ghép ngoài AI; có H1/H2/H3, nguồn và CTA. HTML preview output/news/vibi-pilot-preview.html, chưa công khai.
- Đã cài app/worker/migration và lưu encrypted credential trên server; health 200. paid_api_enabled=false, daily_api_call_limit=0, daily_budget_vnd=null; không chạy định kỳ khi chưa chốt ngân sách. Không cần người dùng dán key vào hội thoại.
- 20 kiểm thử đạt, lint đạt, production build đạt. Đã thêm prompt diễn đạt thuật ngữ bằng tiếng Việt để giảm từ Anh không cần thiết trong các bài tiếp theo. Không tuyên bố mọi bài tương lai đều đúng chỉ từ một bài thử đạt.
