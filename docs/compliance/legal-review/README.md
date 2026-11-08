# RELOO — Bộ hồ sơ review pháp lý và nghiệp vụ

**Bản dự thảo 0.1 · 23/10/2026 · CHƯA KÝ / CHƯA NỘP / CHƯA CÔNG BỐ.** Đây là hồ sơ chuẩn bị làm việc với luật sư và cơ quan có thẩm quyền; không phải giấy phép, ý kiến pháp lý cuối cùng hoặc cam kết đã đáp ứng mọi thủ tục.

## Cách sử dụng

1. Chủ sản phẩm xác nhận mô hình thực tế, luồng tiền, bên bán/bên cung cấp và dịch vụ sẽ mở. Không đưa tính năng đang có code thành dịch vụ đã được phép kinh doanh.
2. Điền thông tin công ty và người chịu trách nhiệm khi có tài liệu chính thức. `null` là chưa khai báo, không phải miễn nghĩa vụ. Không để công ty chưa thành lập đứng tên bên kiểm soát dữ liệu đang thu thật; trước launch phải xác định chủ thể hiện tại chịu trách nhiệm.
3. Luật sư đánh dấu từng kết luận, căn cứ, sửa đổi/chuyển tiếp, yêu cầu hồ sơ và đầu mối tiếp nhận. Chọn phạm vi thị trường Việt Nam trước; đánh giá luật ngoài Việt Nam khi có căn cứ.
4. Hoàn thiện hồ sơ theo mẫu chính thức còn hiệu lực, thực hiện thủ tục, lưu biên nhận/kết quả, hợp đồng nhà cung cấp và quyết định nội bộ. Không đánh đồng luật sư review với cơ quan cấp phép; cũng không mặc định mọi chính sách đều cần cơ quan đóng dấu.
5. Phê duyệt phiên bản chính sách rồi mới xuất bản qua CRM. Thay đổi pháp nhân hoặc nội dung làm thay đổi hash tài liệu; việc đồng bộ thông tin không tự động phê duyệt lại chính sách và không viết lại snapshot hợp đồng đã chấp nhận.
6. QA đối chiếu phiên bản đã duyệt với dữ liệu, UI, API, quyền truy cập, xóa/giữ và luồng tiền thật. Chỉ đóng điều kiện release khi đủ bằng chứng theo đúng phạm vi.

## Tài liệu trong bộ hồ sơ

| File | Nội dung | Người quyết định |
|---|---|---|
| [01_OWNER_DECISIONS.md](01_OWNER_DECISIONS.md) | Ý kiến chủ sản phẩm, cách tiếp nhận và phần cần điều chỉnh | Chủ sản phẩm + luật sư |
| [02_SERVICE_RIGHTS_MATRIX.md](02_SERVICE_RIGHTS_MATRIX.md) | Vai trò, được triển khai có điều kiện, việc chưa được tự thực hiện, hợp đồng và rủi ro từng dịch vụ | Chủ lĩnh vực + luật sư |
| [03_DATA_RETENTION_DELETION.md](03_DATA_RETENTION_DELETION.md) | Dữ liệu tối thiểu, người nhận, giữ/xóa, khử nhận dạng, yêu cầu cơ quan | Privacy + kỹ thuật + luật sư |
| [04_PROCEDURES_AND_FILINGS.md](04_PROCEDURES_AND_FILINGS.md) | Trình tự, nhóm hồ sơ, điều kiện và đầu mối cần xác minh | Pháp nhân + luật sư |
| [05_REVIEW_TEMPLATES.md](05_REVIEW_TEMPLATES.md) | Mẫu gửi review, quyết định nội bộ, dữ liệu/nhà cung cấp/tài sản/phê duyệt | Người ký có thẩm quyền |
| [06_SOURCE_REGISTER.md](06_SOURCE_REGISTER.md) | Nguồn chính thức, mức độ đã đọc, hiệu lực/chuyển tiếp và giới hạn | Luật sư cập nhật |
| [07_IMPLEMENTATION_GAPS.md](07_IMPLEMENTATION_GAPS.md) | Hành vi source hiện có, bổ sung đã làm và khoảng trống chưa kiểm thử | Engineering/QA |

Các bảng về giấy phép là **phân loại cần xác minh theo mô hình**, không phải kết luận mọi giấy phép đều áp dụng hoặc không cần giấy phép. Không ghi thời hạn/biểu phí/mẫu đơn như quy định hiện hành nếu chưa kiểm tra thủ tục tương ứng.

## Bộ tài liệu cần chốt trước công khai giao dịch

- Quy chế nền tảng và điều khoản sử dụng; phân biệt hợp đồng dịch vụ nền tảng với hợp đồng thuê/mua/lưu trú/lao động của các bên.
- Thông báo xử lý dữ liệu, chính sách quyền riêng tư/cookie; consent theo mục đích; xử lý dữ liệu nhạy cảm, quyền dữ liệu và chuyển dữ liệu nếu có.
- Điều kiện đăng tin/xác minh/quyền sở hữu; hàng hóa, dịch vụ bị cấm/hạn chế; kiểm duyệt và xử lý báo cáo.
- Phí nền tảng, cọc/bảo đảm, thanh toán/đối soát/thuế/hóa đơn; chính sách hủy/hoàn theo từng ngành và từng gói, không tự đặt tỷ lệ chưa duyệt.
- Hợp đồng đối tác, DPA với bên xử lý, SLA được thống nhất, quy trình sự cố, khiếu nại/tranh chấp và yêu cầu cung cấp dữ liệu.
- Hồ sơ pháp nhân, đăng ký/thông báo/giấy phép theo mô hình và điều kiện kinh doanh ngành của người cung cấp.
- Biên bản thẩm định, ma trận trách nhiệm, quyết định phê duyệt và kế hoạch review lại.

**Không gửi từ bộ hồ sơ này cho bên ngoài bằng công cụ tự động.** Người dùng mới yêu cầu chuẩn bị; chưa chỉ định người nhận hoặc yêu cầu nộp hồ sơ.
