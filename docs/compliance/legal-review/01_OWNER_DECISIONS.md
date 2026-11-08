# 01 — Ý kiến chủ sản phẩm và quyết định cần review

Nguồn: chỉ dẫn của chủ sản phẩm trong phiên 23/10/2026. Đây là ghi nhận nghiệp vụ, **không phải chứng nhận pháp lý**. Machine record: `compliance/owner-decisions.json`.

| Chủ sản phẩm yêu cầu | Cách tiếp nhận | Điều kiện trước áp dụng |
|---|---|---|
| Đủ thông tin để xác minh và làm bằng chứng | Thu theo mục đích/loại giao dịch/rủi ro, không mặc định thu toàn bộ như ngân hàng | Luật sư xác định RELOO là nền tảng, bên cung cấp dịch vụ hay tổ chức có điều kiện; duyệt danh mục tối thiểu và căn cứ từng trường |
| Giữ đến khi xóa tài khoản | Dùng làm mốc vòng đời tài khoản cho nhóm dữ liệu còn cần, không làm hạn giữ mặc định cho mọi dữ liệu | Xóa sớm khi mục đích đã hoàn thành; có lịch riêng cho ảnh KYC, log, token, consent, kế toán/tranh chấp và backup |
| Nội bộ và cơ quan khi tranh chấp | Không bán dữ liệu; quyền nội bộ theo công việc; cung cấp cơ quan qua thẩm tra yêu cầu và phạm vi | Phải kê khai đúng cả bên xử lý/nhà cung cấp và bên giao dịch nhận dữ liệu cần thiết. Không nói “chỉ nội bộ” nếu thực tế auth/eKYC/payment/cloud/analytics nhận dữ liệu |
| Xóa toàn bộ cá nhân; giữ lịch sử tài sản | Tách profile/KYC/định danh khỏi sự kiện tài sản và kho bằng chứng hạn chế | Phải xác định căn cứ/hạn giữ cho dữ liệu còn lại. ID băm hoặc alias vẫn có thể là dữ liệu cá nhân nếu còn tái liên kết; không tự gọi là ẩn danh |
| Tất cả tài sản có quyền thương mại | Ghi `OWNER_ATTESTED_COMMERCIAL_USE` cùng danh sách hash hiện tại | Không tự ghi tên nhà cấp phép, quyền sửa, chuyển giao, phân phối hay thời hạn. Đính chứng cứ từng file/nhóm; logo bên thứ ba có điều kiện thương hiệu riêng |
| Công ty chưa hoàn tất, để null | Canonical CRM entity chuẩn hóa ô trống thành JSON null; input trống vẫn hiển thị rỗng | Không dùng literal “[null]” như tên công ty; không tự phát sinh mã số thuế/giấy phép. Giao dịch/thu dữ liệu nhạy cảm có điều kiện readiness hiện hữu không bị gỡ |
| Điền CRM tự đồng bộ | API business chung, no-store; refresh cùng tab/cross-tab, focus/visibility và định kỳ khi trang mở | Không đồng bộ khi client offline; không thay snapshot hợp đồng/căn cứ thu đã được chấp nhận. Bản chính sách đổi hash cần review/publication mới |
| Luật sư/cơ quan review rồi đăng | Giữ draft và người duyệt null | Luật sư xác định mục nào phải nộp/đăng ký/chấp thuận, mục nào chỉ cần doanh nghiệp phê duyệt. Không gắn nhãn cơ quan đã duyệt khi chỉ nhận biên nhận |

## Cần chủ sản phẩm chốt bằng dữ kiện

1. Ai đang thực sự vận hành hệ thống/thử nghiệm trước thành lập? Có thu dữ liệu người thật hay mới dùng synthetic? Chưa khai báo pháp nhân không xóa trách nhiệm của chủ thể hiện tại.
2. Thị trường/người dùng: Việt Nam, độ tuổi tối thiểu, có trẻ em/người nước ngoài/khách xuyên biên giới không?
3. Luồng tiền: tiền nào vào tài khoản ai; RELOO có thực sự giữ tiền người khác, cọc, số dư hoàn/rút hay chỉ hiển thị dữ liệu đối soát từ đối tác?
4. Job là đăng tin, kết nối, giới thiệu/cung ứng lao động hay trực tiếp tuyển dụng? Ai trả lương, chịu trách nhiệm ca làm và xác định quan hệ lao động?
5. Nhà/phòng: RELOO là trung gian, đại lý hay trực tiếp cho thuê/kinh doanh lưu trú/môi giới? Ai có quyền sử dụng nguồn phòng/API/ảnh?
6. World: game offline/nội bộ hay game phát hành công cộng, có chat/UGC, người chưa thành niên, tiền tệ/vật phẩm/NFT đổi tiền không?
7. Chỉ định người phụ trách dữ liệu trước launch; đại diện pháp luật tương lai không tự đồng nghĩa là người chuyên trách xử lý mọi yêu cầu.

Các câu hỏi không cần chặn việc tạo hồ sơ dự thảo, nhưng chưa trả lời thì không có kết luận giấy phép cuối cùng. Những “đề xuất” trong bộ hồ sơ này không tự trở thành chính sách công khai.
