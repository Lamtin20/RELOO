# RELOO — phương pháp đo tải server, 18/10/2026

## Phạm vi và cách hiểu số người

Đo HTTP/API và chat WebSocket với dữ liệu giả lập trên chính máy đang vận hành. Một virtual user (VU) gửi một thao tác, chờ phản hồi, nghỉ 2 giây rồi tiếp tục. Đây là người đang thao tác tích cực, không phải số tài khoản đăng ký, số socket mở nhàn rỗi hay toàn bộ số tab mở. Trên 200 VU có tái sử dụng 200 danh tính thử qua các phiên; không gọi đó là 500 tài khoản khác nhau.

Workload 20 hành động: trang chủ 10%, khám phá 10%, bootstrap danh sách 30%, HTML chi tiết sản phẩm 30%, gửi tin nhắn lưu DB 15%, tạo tin sản phẩm có xử lý một ảnh 5%. Ảnh WebP đầu vào 93.668 byte; payload đăng tin khoảng 125 KB. Có 201 hồ sơ, 1.000 sản phẩm ban đầu; tin mới tiếp tục tăng trong quá trình đo. REST giữ trần trả về 1.000 dòng giống production. Không đồng nghĩa đã kiểm thử dữ liệu hàng triệu tin.

Ngưỡng nghiệm thu cho bài đo này: p95 mỗi luồng ≤3.000 ms, lỗi mỗi luồng ≤1%. p95 nghĩa là 95% phản hồi không chậm hơn số đó. Không loại lỗi/timeout để làm đẹp số. Tăng tải theo bậc và dừng khi vượt ngưỡng; sau đó chạy giữ tải. Các bậc ngắn chỉ là phép thử tìm ngưỡng, không phải bảo đảm ổn định nhiều ngày.

## Cách ly và tương đương

- Image ứng dụng đúng image production; không dùng Next dev hoặc PGlite để suy ra sức tải.
- Copy **schema**, không copy dữ liệu khách, sang `reloo_capacity_20261018` trong cùng PostgreSQL engine. Auth GoTrue và REST PostgREST riêng, JWT riêng có hạn. Các quyền public/anon/authenticated vẫn bị khóa.
- Mạng Docker nội bộ, không egress; không worker, SMTP, thanh toán, AI hay gửi thông báo tới khách thật. Ramp dùng tmpfs media riêng. Soak dùng thư mục media thử riêng trên ổ đĩa để đo ghi ảnh theo kiểu production và tránh nhầm trần tmpfs thử với dung lượng server; không mount dữ liệu khách.
- Bài đầu từ laptop qua SSH/Tailscale: một backend vừa dựng trang vừa xử lý API, REST pool 20, không trace API. Chỉ là số quan sát đường truy cập quản trị và thăm dò, **không dùng làm trần production**.
- Bài origin: Nginx chia trang sang hai renderer, mỗi renderer tối đa 1 CPU/1 GiB; API về một backend tối đa 2 GiB; cùng Auth/PostgreSQL, REST không override pool production; bật ghi `api_traces`. Hai renderer cố định mô phỏng phân luồng hiện tại; không giả rằng đã kiểm thử HPA tự lên ba pod.
- Generator origin cũng ở cùng máy, bị giới hạn 1 CPU/512 MiB, nên chi phí phát tải chia sẻ CPU với hệ thống. Theo dõi riêng để phát hiện generator bão hòa. Tải nền production không bị tắt.
- Edge nội bộ không mô phỏng đầy đủ rate-limit/IP reputation/Cloudflare; không suy ra chống DDoS hay sức tải Internet từ origin. Bài public chỉ đọc để kiểm tra riêng đường Cloudflare → tunnel → Nginx → K3s/backend, không ghi dữ liệu thật.

## Điều chưa đo

Không đo layout/JavaScript phía trình duyệt, tải toàn bộ ảnh/video, tải lên nhiều ảnh cực đại, native app, login/OTP storm, đơn thuê/thanh toán, gửi email/push, job tạo ảnh/viết tin AI hoặc thời gian chạy dài nhiều ngày. Bài HTTP chi tiết có kiểm tra nội dung sản phẩm thật trong sandbox, không coi HTTP 200 của trang rỗng là view thành công. Không phát sinh tiền thật.

Chat riêng: kết nối bằng cookie thử, kiểm tra Auth và quyền tham gia thread, gửi qua HTTP để commit rồi phát WebSocket; người nhận phải nhận đúng message ID. Đo thời gian từ gửi đến nhận, không chỉ thời gian trả API.

## Giới hạn an toàn

Trong bài origin, dừng generator nếu RAM khả dụng <1.800 MiB, ổ C trống <15 GiB hoặc origin health production thất bại ba lần liên tiếp. Kiểm tra production public mỗi 10 giây độc lập. Không tắt bảo vệ hoặc sửa cấu hình production để làm đẹp benchmark. Kết thúc lấy số tổng hợp, xóa container/database thử, thu hồi JWT/env thử bằng xóa môi trường riêng.

## Tái chạy

Chỉ quản trị viên qua SSH/Tailscale; secrets không đưa vào command log/Git. Không chạy script setup vào một PostgreSQL khác bằng cách đổi tên database tùy tiện.

1. Kiểm tra máy, dung lượng, release đang chạy và một cửa sổ đo không có deploy.
2. Chuyển `deploy/testing/capacity-setup.py` tới server và chạy bằng root; script từ chối database thử đã tồn tại. Nó tạo mạng nội bộ, bản sao schema và tài khoản giả lập. Đọc log, kiểm tra grants/schema, không coi setup lỗi là đã sẵn sàng.
3. Chuẩn bị payload hợp lệ một ảnh WebP của dự án tại `/srv/reloo/capacity-test/listing.json`. Không dùng ảnh riêng tư hoặc URL ngoài.
4. Chạy `capacity-prepare-origin.py`; chuyển `capacity-origin.mjs` tới thư mục thử cùng tên. Chạy `capacity-start-origin.py` và `capacity-monitor.py` ngay sau đó. `CAPACITY_LEVELS`/`CAPACITY_SECONDS` là cấu hình generator, mức tối đa 1.000 VU và 600 giây/bậc. Xác nhận các container healthy trước khi đo.
5. Giữa các bài đo, lưu log/monitor trước khi xóa generator. Chạy `capacity-persist-media.py` trước soak, chờ backend thử healthy và edge thử được khởi động lại. `capacity-seed-chat.py` tạo 100 thread giữa từng cặp thử. Từ laptop có quyền SSH chạy `scripts/capacity-chat-test.mjs`; mật khẩu chỉ qua env tạm hoặc credential store, không nhập vào source. `scripts/capacity-public-test.mjs` chỉ GET, tối đa 20 VU, không dùng cookie khách.
6. Thu Docker logs generator, `origin-monitor.json`, metadata và audit counts; chạy `capacity-cleanup.py`. Script kiểm tra label trước khi xóa container, chỉ drop đúng tên database thử. Kiểm tra production và K3s sau cleanup.

Kết quả thực tế và bảng kết luận nằm trong báo cáo riêng cùng ngày; không lấy mặc định 1.000 VU trong mã làm con số đã đạt.

## Watchdog hiện tại

Watchdog trên host tự khởi động lại tất cả container `exited`, kể cả job thử đã hoàn thành. Generator giữ tiến trình **nhàn rỗi** sau event `complete` để thu bằng chứng rồi cleanup; không tiếp tục gửi tải. Monitor dừng theo event đó. Đã quan sát một lần watchdog khởi động lại generator cũ sau bài refine; đoạn chạy lại không được đưa vào bảng ngưỡng. Cần phân biệt daemon cần tự phục hồi với job chạy một lần khi chỉnh chính sách watchdog sau này.
