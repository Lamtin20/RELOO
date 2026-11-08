# Tòa soạn tự động RELOO

## Phạm vi

Mục tiêu tối đa 40 bài/ngày theo giờ Việt Nam, cách nhau ít nhất 30 phút. Không bảo đảm đủ số lượng nếu thiếu tin mới phù hợp hoặc AI không vượt qua kiểm tra. Không có cam kết thứ hạng SEO. Nguồn ban đầu: RSS chính thức Apple Newsroom, Samsung Global Newsroom, Google Pixel. Không tạo thêm tin giả để đạt số lượng.

Nguồn phải có ngày công bố trong 72 giờ; URL HTTPS thuộc danh sách cho phép; kết nối chặn IP nội bộ, giới hạn thời gian/dung lượng/chuyển hướng. Tôn trọng robots.txt; không tải được hoặc bị cấm thì giữ lại. Bộ lọc loại tin sức khỏe, đầu tư, pháp lý và chính trị; các nguồn mới cần được quản trị viên kiểm tra trước khi thêm.

## Quy trình

1. Timer kiểm tra mỗi 5 phút; mỗi nguồn được tải tối đa một lần/15 phút.
2. Khóa lease 20 phút, chống chạy đồng thời. Chuẩn hóa URL và hash nội dung để chống trùng.
3. AI viết JSON tiếng Việt từ nội dung nguồn, kèm trích đoạn làm bằng chứng cho từng ý chính. Không sử dụng kiến thức bên ngoài để điền dữ kiện.
4. Kiểm tra cấu trúc, độ dài, trích đoạn, số liệu, liên kết lạ và nhóm thông tin cần duyệt. Lượt AI thứ hai soát nhận định/bối cảnh; đây vẫn là kiểm tra máy, không thay thế xác minh của con người.
5. Ghép ảnh minh họa thương hiệu bằng Sharp + mascot được cung cấp + font Be Vietnam Pro (OFL). Ảnh WebP 1200×630, ghi rõ minh họa; không giả ảnh sản phẩm chính thức. Không gọi model sinh ảnh.
6. Transaction PostgreSQL kiểm tra lại khóa, trạng thái, nguồn mới, trần ngày và khoảng cách; ghi media/bài đăng/nhật ký cùng một lần. Lặp lại cùng candidate trả lại bài cũ.

Không retry tự động yêu cầu AI bị ngắt hoặc lỗi không rõ kết quả. Candidate HELD/UNCERTAIN/READY từ chạy preview cần xử lý chủ động, không tự chạy lại. 60 lần thử/ngày; không ghi token/API key vào log. Không công bố toàn bộ nội dung gốc; bài công khai có liên kết nguồn, thời gian kiểm tra, thông báo AI và CTA. Nội dung nguồn lưu nội bộ có RLS/backend-only.

## Vận hành

- CRM → Tin tức → Tòa soạn tự động: theo dõi, bật/tạm dừng.
- `node scripts/news-autopilot.mjs --preview`: thu thập, viết và kiểm tra nhưng không đăng; không tạo bài công khai.
- `node scripts/news-autopilot.mjs`: chỉ chạy khi settings.enabled=true.
- `systemctl status reloo-news-autopilot.timer`; `journalctl -u reloo-news-autopilot.service`.
- SQL: `deploy/vietnam/news-autopilot.sql`, sau đó bắt buộc áp dụng `deploy/vietnam/security-lockdown.sql`.
- Khởi tạo luôn PAUSED; chỉ bật sau khi thử chất lượng model thực tế.

## AI và chi phí

Đang tích hợp Ollama `/api/chat`. Dịch vụ `news-ai` riêng dùng `NEWS_AI_URL`, `NEWS_AI_MODEL=qwen2.5:7b`, giới hạn 6 GiB RAM và 3 CPU. Dịch vụ AI cũ giữ nguyên. Không tắt kiểm tra để ép đủ 40 bài. Xem `NEWS_EDITORIAL_SCOPE.md` về sáu nhóm nội dung và phạm vi nguồn đã xác minh.

Người dùng đã chọn AI nội bộ, không phát sinh phí API. Vibi không được bật cho quy trình tin tức. Không suy ra giao thức từ endpoint tạo ảnh từng dùng. Provider VIBI trả lỗi rõ ràng thay vì gọi endpoint đoán hoặc âm thầm dùng model khác. Không sử dụng API trả phí khi chưa có chỉ dẫn mới.

## Kết quả triển khai ngày 15/10/2026

- App và worker đã build/chạy trên máy chủ, timer active. Cấu hình vẫn disabled, target=40.
- Trang /news và /api/health trả 200; API /api/crm/news-automation trả 401 khi không đăng nhập.
- Lượt preview thực tế thu được 5 candidate; 1 HELD, 4 NEW. Samsung báo SOURCE_FETCH_FAILED, Google không có tin mới phù hợp.
- Model thực tế qwen2.5:1.5b: candidate bị giữ với INVALID_EXCERPT, UNSUPPORTED_FACT, VIETNAMESE_REQUIRED. Không có bài thử công khai, không gọi API trả phí, không giả báo đã đạt chất lượng vận hành.
- Timer kiểm tra đã hoạt động nhưng không đăng khi disabled. Cần thay/nâng model và kiểm tra lại bản tin mẫu trước khi bật. Cũng cần thêm nguồn phù hợp đã xác minh nếu muốn gần mục tiêu 40 tin mới mỗi ngày.
- 11 kiểm thử đạt, lint các module mới đạt, production build đạt. App/worker vẫn read_only=true, cap_drop=ALL, no-new-privileges.
- Bản sao nguồn, DB và image rollback trước triển khai lưu root-only tại /srv/reloo/backups/news-autopilot-20261015. Ảnh mẫu: output/news/autopilot-preview.webp.

## Kiểm thử

`node --test tests/news-autopilot.test.mjs tests/security-hardening.test.mjs` kiểm tra URL, freshness, biên ngày Việt Nam, bằng chứng/số liệu, trích xuất, render WebP và transaction xuất bản/idempotency/hạn mức/quyền dữ liệu. `npm run build` kiểm tra tích hợp Next.js.
