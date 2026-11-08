# RELOO — kết quả đo tải server hiện tại, 18/10/2026

## Kết luận sử dụng

**125 VU là mức cao nhất đạt trong các bậc ngắn đã đo. 150 VU bắt đầu không đạt p95 từng luồng; 200 VU nghẽn CPU rõ.** Không phải đã tìm được con số tối đa tuyệt đối; chưa đo từng mức 126–149 hoặc tải nhiều ngày. Mức dùng để dự trù ban đầu là **70–100 người đang thao tác tích cực**, theo workload dưới đây. Soak 100 VU chạy 302.2 giây, 13568 thao tác, 44.9 thao tác/giây, p95 chung 676 ms, lỗi 0; kết quả đạt ngưỡng đã chọn.

Một VU thao tác, chờ phản hồi rồi nghỉ 2 giây. Số này **khác** số người chỉ mở trang nhàn rỗi, số tài khoản đăng ký hoặc hàng trăm người đồng loạt tải nhiều video. Chưa chạy áp lực AI tạo ảnh/LLM, thanh toán hoặc OTP/email. Không cam kết sức tải đó khi model AI lớn cùng chiếm CPU/RAM.

## Máy và đường vận hành

- CPU hiển thị trong WSL: AMD Ryzen 5 5500U, **4 vCPU** được cấp; RAM 11.962 MiB (~11,7 GiB), swap 2 GiB. Ổ C còn khoảng 37 GiB lúc preflight; kiểm tra ổ C thật thay vì dung lượng trống ảo của VHDX.
- Build production: `svCbSTE2SzjmklKv0uPrR`. Sandbox dùng **đúng cùng image** và giới hạn backend 2 GiB. PostgreSQL max_connections 100, PostgREST postgrest/postgrest:v14.17, GoTrue supabase/gotrue:v2.196.0.
- Bài origin dùng hai renderer 1 CPU/1 GiB mỗi cái và một backend API chung, cùng PostgreSQL engine; danh tính/DB/Auth/REST/media thử tách dữ liệu thật. Bật API trace và cấu hình pool REST giống production. Không dùng Next dev/PGlite để đưa ra bảng này.
- Generator origin chia sẻ máy, giới hạn 1 CPU/512 MiB; chi phí generator được tính trong tải host. Vì vậy đây là khả năng quan sát trong cấu hình thử này, không nội suy tuyến tính thành số user Internet tối đa.

## Tăng tải hỗn hợp — bậc khoảng 60 giây

10% trang chủ, 10% khám phá, 30% tải danh sách, 30% chi tiết sản phẩm, 15% nhắn tin lưu DB, 5% đăng tin có xử lý một ảnh. Một ảnh WebP đầu vào 93.668 byte, payload khoảng 125 KB. Ban đầu 1.000 sản phẩm/201 hồ sơ giả lập; dữ liệu tăng khi đăng tin, REST giữ giới hạn 1.000 dòng trả về. Không xem API trả dữ liệu là impression marketing.

Ngưỡng: **p95 mỗi luồng ≤3.000 ms và lỗi mỗi luồng ≤1%**. p95 chung có thể che luồng ghi chậm; vì vậy mức 150 vẫn không đạt dù p95 chung dưới 3 giây.

| VU | Thao tác | Thao tác/s | p95 chung (ms) | p95 nhắn tin (ms) | p95 đăng tin (ms) | Lỗi | Kết quả |
|---:|---:|---:|---:|---:|---:|---:|---|
| 25 | 727 | 11.73 | 202 | 270 | 310 | 0 | Đạt |
| 50 | 1459 | 23.51 | 179 | 307 | 427 | 0 | Đạt |
| 100 | 2699 | 43.53 | 865 | 1226 | 1602 | 0 | Đạt |
| 125 | 2766 | 44.19 | 1974 | 2607 | 2844 | 0 | Đạt |
| 150 | 3021 | 47.55 | 2548 | 3087 | 3282 | 0 | Vượt ngưỡng |
| 200 | 3151 | 50.16 | 4382 | 5745 | 6547 | 0 | Vượt ngưỡng |

## Giữ tải 100 VU trong 5 phút

Ảnh được ghi vào thư mục thử riêng trên ổ đĩa, không dùng tmpfs giới hạn 128 MiB làm trần ghi ảnh. Thời gian gồm phản hồi và drain cuối bài. Bảng này không đo render/layout JavaScript trong browser hoặc tải toàn bộ ảnh/video.

| Luồng | Thao tác | Thao tác/s | p95 (ms) | p99 (ms) | Lỗi |
|---|---:|---:|---:|---:|---:|
| Chi tiết sản phẩm | 4070 | 13.47 | 350 | 712 | 0 |
| Danh sách sản phẩm | 4071 | 13.47 | 627 | 1041 | 0 |
| Trang chủ | 1360 | 4.5 | 379 | 697 | 0 |
| Nhắn tin lưu DB | 2034 | 6.73 | 1004 | 1525 | 0 |
| Khám phá | 1354 | 4.48 | 379 | 793 | 0 |
| Đăng tin + xử lý ảnh | 679 | 2.25 | 1244 | 1775 | 0 |

## Chat thời gian thực

Cookie thử → GoTrue xác thực → kiểm tra thành viên thread → HTTP commit → WebSocket broadcast → người nhận khớp đúng message ID. Phát tải từ laptop qua SSH/Tailscale vào sandbox. Mỗi mức gồm N/2 cặp gửi–nhận và gửi 5 đợt đồng thời; độ trễ từ bắt đầu gửi tới khi nhận. Các mức socket này được đo riêng, không gộp với VU hỗn hợp phía trên.

| User mục tiêu | Đã kết nối | Tin đã nhận/tin gửi | p95 gửi → nhận (ms) | Lỗi kết nối |
|---:|---:|---:|---:|---:|
| 10 | 10 | 25/25 | 392 | 0 |
| 50 | 50 | 125/125 | 1404 | 0 |
| 100 | 100 | 250/250 | 3395 | 0 |

100 kết nối nhận đủ 250/250 tin nhưng p95 3.395 ms vượt mục tiêu, nên không tăng lên 200 kết nối. 50 kết nối đạt ngưỡng ở bài burst này. Đây khác tải hỗn hợp với thời gian nghỉ 2 giây.

## Đường website production — chỉ đọc

Qua Cloudflare/Tunnel/Nginx/K3s, gồm trang chủ, khám phá, sản phẩm thật công khai và bootstrap. Mỗi bậc 30 giây, nghỉ 2 giây mỗi hành động; không gửi POST, không dùng tài khoản/đơn thật. Đây là kiểm tra bổ sung với tải có giới hạn, **không phải phép thử phá trần website public**.

| VU | Request | Request/s | p95 (ms) | Lỗi |
|---:|---:|---:|---:|---:|
| 1 | 14 | 0.45 | 216 | 0 |
| 5 | 70 | 2.21 | 397 | 0 |
| 10 | 140 | 4.37 | 495 | 0 |
| 20 | 280 | 8.71 | 319 | 0 |

Canary public độc lập mỗi khoảng 10 giây: 147/147 lần health 200, cao nhất 853 ms. Đây là các mẫu theo thời gian, không chứng minh mọi request khách trong khoảng đó đều thành công.

## Tài nguyên

CPU host được tính từ chênh lệch /proc/stat giữa mẫu, chuẩn hóa cả 4 vCPU; peak là peak cửa sổ lấy mẫu, không phải bắt được mọi đỉnh tức thời. RAM bên dưới là MemAvailable, đã xét page cache; số free nhỏ đơn thuần không có nghĩa hết RAM.

| Bài | Số mẫu | CPU host peak | RAM khả dụng nhỏ nhất (MiB) |
|---|---:|---:|---:|
| ramp 25 VU | 6 | 31.5% | 8126 |
| ramp 50 VU | 6 | 55% | 8037 |
| ramp 100 VU | 7 | 83.3% | 7894 |
| ramp 200 VU | 6 | 99.5% | 7791 |
| ramp 125 VU | 6 | 93.9% | 7822 |
| ramp 150 VU | 6 | 96.7% | 7753 |
| soak 100 VU | 30 | 90.1% | 7805 |

Ở 200 VU, CPU gần đầy trong khi RAM còn nhiều: tăng RAM đơn thuần chưa giải quyết được nghẽn quan sát. API ghi vẫn là một backend; tăng pod dựng trang không tự tăng khả năng xử lý chat/đăng tin. Một máy Windows/WSL vẫn là điểm lỗi chung; Kubernetes không thay thế máy vật lý dự phòng.

## Kiểm chứng dữ liệu và an toàn

- Audit cuối môi trường thử: 201 hồ sơ, 2758 sản phẩm, 1758 tin tạo qua các lần smoke/ramp/soak, 5591 tin nhắn, 1758 media records. Đây là tổng thử, bao gồm warm-up; không dùng làm traffic hay doanh thu production.
- Hồ sơ không thuộc domain .invalid: 0; grants table public cho anon/authenticated/PUBLIC: 0. Tên sản phẩm thực trong HTML thử được kiểm chứng: true.
- Ảnh WebP thật trên thư mục soak cuối bài: 679; tin probe bị cấm lọt vào DB: 0.
- Probe thiếu đăng nhập bị 401; người ngoài thread bị 403; tin không hợp lệ bị 400. Không gỡ quyền/giới hạn production để làm đẹp số.
- Không worker thử, không gửi email/push/SMS cho khách, không tiền thật. Schema được copy; không copy danh sách khách. Sau thu bằng chứng, xóa DB/container/JWT/media thử và kiểm tra production lại; xem cleanup-verification.json.

## Những điểm cần ưu tiên

1. Bootstrap đang lấy một tập lớn hồ sơ/tin, payload thử khoảng 0,6–1,2 MB: ưu tiên phân trang, giới hạn trường và lọc phía server; đo lại trước/sau bằng cùng workload.
2. Đo và tối ưu chuỗi Auth/quyền/RPC/ghi ảnh ở API chung; giữ đủ kiểm tra quyền. Cân nhắc chuyển xử lý ảnh nặng sang job phù hợp và cache dữ liệu công khai, không suy đoán mức tăng tốc khi chưa đo.
3. Watchdog hiện khởi động mọi container exited, kể cả job thử đã xong. Đã quan sát một đoạn generator tự chạy lại; đoạn đó bị loại khỏi bảng ngưỡng. Generator phiên sau giữ idle sau complete đến khi cleanup. Nên tách chính sách daemon và job chạy một lần; chưa thay watchdog production trong bài đo này.

## Bằng chứng và tái chạy

Mã: scripts/capacity-test.mjs (đường SSH thăm dò), scripts/capacity-chat-test.mjs, scripts/capacity-public-test.mjs và deploy/testing/capacity-*. Tham khảo docs/CAPACITY_TEST_METHOD_20261018.md. Raw log/JSON, resource-summary.json, authorization-probes.json, production-canary.json và cleanup-verification.json nằm dưới output/capacity (ignored, không công khai lên website).

Không gọi 125 là SLA hoặc tối đa tuyệt đối; đó là bậc cao nhất đạt trong các bậc ngắn đã đo. Khoảng bắt đầu suy giảm của workload này nằm giữa 125 và 150 VU; cần soak dài hơn, tải browser/app/ảnh thật và kịch bản AI đồng thời để lập SLA chính thức.
