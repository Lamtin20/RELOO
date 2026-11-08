# Phạm vi biên tập đã chốt

Người dùng chọn: AI nội bộ trước, không phát sinh phí API. Không bật Vibi hoặc API trả phí cho viết bài hay tạo ảnh.

| Nhóm nội dung | Điều kiện biên tập |
|---|---|
| Tài chính cá nhân | Quản lý chi tiêu, cân nhắc nhu cầu, nguyên tắc lập ngân sách; không tư vấn vay hoặc sản phẩm tài chính cá nhân hóa. |
| Các nhóm hàng RELOO | Thông tin thiết bị từ hãng; không suy ra hàng có sẵn trên RELOO hoặc Việt Nam. |
| Tin tài chính và đầu tư | Tin có nguồn, ngày và thị trường cụ thể; phân biệt công bố, dữ liệu lịch sử và dự báo. Không tín hiệu mua/bán, mục tiêu giá hay cam kết lợi nhuận. |
| Kinh nghiệm thuê–mua | Kiểm tra tình trạng, phụ kiện, thời gian, điều kiện thực tế. Không tự bịa phí hay cơ chế RELOO. |
| Lợi ích của thuê | Phân tích theo tần suất, tổng chi phí và điều kiện; không mặc định thuê luôn rẻ hơn. |
| Bảo vệ môi trường | Bằng chứng về tái sử dụng, tiêu dùng có trách nhiệm; không tự tính lượng CO₂ hoặc chứng nhận xanh. |

## Nguồn được xác minh

- Apple, Samsung, Google Pixel: nguồn hãng cho nhóm hàng; Samsung hiện có lỗi tải, không bỏ qua chặn.
- [Fed RSS](https://www.federalreserve.gov/feeds/feeds.htm): xác nhận chính thức `/feeds/press_monetary.xml`; chỉ là thông tin thị trường Hoa Kỳ, không lãi suất hay quy định áp dụng tại Việt Nam.
- [NASA RSS](https://www.nasa.gov/rss-feeds/): xác nhận `/news-release/feed/`; chỉ lấy bài liên quan Trái Đất, khí hậu, môi trường, nước và rừng.
- Đã tìm được tài liệu hướng dẫn từ SEC Investor.gov và EPA. Chưa đưa các trang hướng dẫn không có ngày vào hàng đợi tin mới: không dùng ngày tải trang thay cho ngày công bố. Chưa có nguồn tự động riêng cho ba nhóm tài chính cá nhân/kinh nghiệm thuê–mua/lợi ích thuê; cấu hình chủ đề không đồng nghĩa đã có nguồn đủ tiêu chuẩn cho từng nhóm.

## Model nội bộ

Giữ dịch vụ AI hiện tại nguyên model; thêm `news-ai` riêng chỉ trong Docker network, không publish cổng. Giới hạn 6 GiB RAM và 3 CPU. Model được xác minh tại [Ollama qwen2.5:7b](https://ollama.com/library/qwen2.5:7b); [model card chính thức](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct) ghi hỗ trợ tiếng Việt và Apache-2.0. Tải model không gọi API suy luận trả phí; vẫn sử dụng điện, CPU, RAM, ổ đĩa và băng thông của máy chủ.

Worker dùng `NEWS_AI_URL` và `NEWS_AI_MODEL`, không thay `RELOO_AI_MODEL` cho các chức năng khác. Hai lượt AI cùng model không phải kiểm chứng độc lập bởi con người. Không bật đăng chỉ vì model đã tải xong: phải có kết quả kiểm tra bản tin thực tế.

## Kết quả thử thực tế

Đã tải và chạy qwen2.5:7b, đo khoảng 5,24 GiB RAM, dịch vụ read-only/cap_drop=ALL/no-new-privileges, không mở cổng host. Bản tiếng Việt được tạo thành công. Các câu dẫn chứng gốc được tìm thấy nhưng có câu quá dài; bộ xử lý rút về tối đa 24 từ mà không thay nội dung bài, sau đó kiểm tra lại.

Lượt soát tiếp theo trả decision=PASS nhưng originalSummary=false; hệ thống vẫn giữ bài vì phải đạt tất cả tiêu chí. Đối chiếu thêm phát hiện diễn đạt thiếu chính xác phạm vi: nguồn nói mở rộng chương trình thiết bị tân trang được chứng nhận, bản nháp gọi là mở rộng chương trình tái chế. Không ghi đè kiểm tra thành PASS để chạy đủ số lượng. Model nội bộ mới đã cài, ngân sách LOCAL đã chốt, nhưng hệ thống đăng vẫn PAUSED và chưa có bài thử công khai. Chưa chứng minh được chất lượng để tự đăng 40 bài/ngày, đặc biệt nội dung tài chính.

17 kiểm thử đạt, lint đạt, bản build app/worker đạt và health 200. Cần tiếp tục cải thiện chất lượng diễn đạt/phân biệt phạm vi và thử nghiệm thêm trước khi mở chế độ công khai. Các nguồn riêng cho tài chính cá nhân/kinh nghiệm thuê–mua/lợi ích thuê vẫn cần hoàn thiện.
