# Kiểm soát chi phí tin tức trong ứng dụng

Ngân sách được chốt: 50.000đ/ngày, theo Asia/Ho_Chi_Minh. Không tăng ngân sách để ép đủ 40 bài.

1. Kiểm tra bảng giá Vibi trước mỗi phiên viết: chỉ hai model đã xác minh, nhóm và đơn giá không vượt bộ giá đã kiểm tra. Giá khác/thiếu trường thì dừng trước suy luận.
2. Request text tối đa 28.000 byte JSON, max_tokens=2400. Ảnh chỉ 1536×1024, low, không ảnh tham chiếu hoặc công cụ tính phí phụ.
3. Trước request, PostgreSQL khóa giao dịch và giữ chỗ 16.000đ/text hoặc 10.000đ/ảnh. Tổng đã quyết toán + chưa quyết toán + mẫu thử ngoài lịch không được vượt ngân sách. Giới hạn lượt API chỉ là lớp bổ sung.
4. Chụp usage theo model từ endpoint usage được xác minh trước và sau request. Chỉ quyết toán khi số lượt tăng trong cùng ngày và chi phí không giảm. Nếu có hoạt động khác cùng key/model trong khoảng này, toàn bộ chênh lệch được tính vào ngân sách một cách bảo thủ.
5. Dùng hệ số **40.000đ/USD để tính ngân sách**, không phải tỷ giá thị trường/thanh toán. Làm tròn lên và cộng đệm; phần giữ chỗ chưa dùng được trả lại sau khi đối chiếu. Giá/payload/reservation đã để dư so với mẫu thực tế. Đây là giới hạn do RELOO thực thi, không phải quota cứng do Vibi cấp; khoản phí tùy tiện ngoài bảng giá hoặc hoạt động khác ngoài hệ thống không thuộc quyền kiểm soát RELOO.
6. Lỗi mạng, phí không rõ hoặc phí vượt dự phòng: giữ chỗ, lưu kết quả nếu đã nhận, tắt lịch trả phí, không gọi lại mù. Quét nguồn vẫn hoạt động. Bản viết và ảnh đã trả phí được lưu để tránh tạo lại; hàng đợi chờ ngân sách có thể tiếp tục ở ngày sau nếu nguồn không đổi và còn mới.

Key quản trị Vibi không bắt buộc cho bộ đo này. Mặc dù API quản trị bằng key suy luận trả 401, kết nối suy luận vẫn hợp lệ. Cấu hình provider quota riêng vẫn có thể bổ sung như lớp bảo vệ thứ hai, nhưng không còn dùng việc thiếu quyền quản trị làm điều kiện chặn toàn bộ hệ thống khi bộ đo nội bộ đã được kiểm tra.

Ảnh thử ngày 16/10/2026: usage Vibi xác nhận 1 request gpt-image-2, 0,01152 USD; tính 461đ vào ngân sách ngày theo hệ số bảo thủ. Không đưa chi phí lập trình bằng các model khác vào ngân sách tin tức.

Migrations: news-vietnam-sources.sql và news-metered-budget.sql; apply security-lockdown.sql sau đó. RLS/backend-only giữ nguyên cho nguồn, kết quả AI, đối chiếu phí và điều chỉnh ngân sách. CRM chỉ trả tổng đã tính/giữ chỗ/còn lại, không trả key hoặc dữ liệu bí mật.
