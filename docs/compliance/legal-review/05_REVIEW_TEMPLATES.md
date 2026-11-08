# 05 — Mẫu hồ sơ làm việc và phê duyệt

**TẤT CẢ LÀ DỰ THẢO NỘI BỘ.** Không phải mẫu hành chính đã xác minh. Không có chữ ký, con dấu, mã hồ sơ hay người duyệt giả. Các ô `[CHƯA ĐIỀN]`/`null` phải được hoàn thiện bằng dữ kiện thật; không lấy mẫu này làm kết quả đã chấp thuận.

## M01 — Công văn/email đề nghị review tổng thể

**Người gửi/chủ thể:** `[chủ thể vận hành thực tế; công ty chưa thành lập ghi rõ trạng thái, không tự đứng tên công ty tương lai]`.

**Người nhận:** `[văn phòng luật sư/đầu mối thực tế, chưa chỉ định]`.

**Nội dung đề nghị:** thẩm định mô hình RELOO theo danh mục tại02, đề xuất phạm vi launch, phân loại trách nhiệm nền tảng/đối tác, giấy phép/điều kiện/thông báo/đăng ký cần thiết, dữ liệu nhạy cảm/định danh/giữ-xóa, nguồn tài sản, quy trình tiền/thuế/hóa đơn, bảo vệ người tiêu dùng, khiếu nại, Job/nhà ở/World và các điều kiện chưa đủ.

**Tài liệu gửi kèm:** danh sách phiên bản/hash; mô tả sản phẩm và trạng thái tính năng; ảnh luồng; sơ đồ dữ liệu/tiền; draft entity; field/asset/processor inventory; hợp đồng/policy; ma trận quyền; nguồn pháp luật đã kiểm tra và mục còn chưa xác minh; UAT report/phát hiện; câu hỏi cần trả lời.

**Đầu ra yêu cầu:** ý kiến bằng văn bản theo từng mục, căn cứ chính thức/hiệu lực/chuyển tiếp/phạm vi, điều kiện và mẫu/đầu mối/hạn cụ thể, phần cần chuyên gia hoặc cơ quan xác nhận thêm; bảng sửa tài liệu; quyền/nghĩa vụ không thể loại trừ; điều kiện launch/đình chỉ; người ký và lịch review lại. Không yêu cầu luật sư ký “đúng mọi luật” khi còn thiếu dữ kiện.

## M02 — Phiếu mô hình nghiệp vụ và luồng tiền

Service/version/hash `[ ]`; chủ thể RELOO `[ ]`; vai trò đối tác/khách `[ ]`; thị trường/tuổi `[ ]`; trạng thái feature `[preview/UAT/live/chưa mở]`; tiền vào tài khoản ai `[ ]`; chủ sở hữu tiền `[ ]`; thời điểm chốt `[ ]`; phí/cọc/thuế/hóa đơn `[ ]`; bên giữ/chuyển/hoàn `[ ]`; dispute/ủy quyền `[ ]`; provider/giấy phép/hợp đồng/phạm vi `[ ]`; ngoại lệ `[ ]`; luật sư phân loại `[chưa duyệt]`; điều kiện phải hoàn tất `[ ]`.

## M03 — Bản ghi hoạt động xử lý dữ liệu (mỗi mục đích một bản)

- ID và owner: `[ ]`; module/API/table/object/processor `[ ]`; data subject/độ tuổi `[ ]`.
- Loại/trường dữ liệu và phân loại cơ bản/nhạy cảm cần đối chiếu: `[ ]`; nguồn/cách thu/thời điểm `[ ]`.
- Mục đích cụ thể `[ ]`; vì sao cần `[ ]`; cách ít dữ liệu hơn đã cân nhắc `[ ]`; bắt buộc/tùy chọn và hệ quả nếu không cung cấp `[ ]`.
- Vai trò controller/processor/độc lập `[ ]`; căn cứ xử lý/điều khoản/consent áp dụng `[chờ pháp lý]`.
- Notice version/hash `[ ]`; bằng chứng đồng ý/rút lại `[ ]`; không gộp marketing/CV talent-pool/AI vào hợp đồng bắt buộc.
- Người nhận, subprocessor, nước xử lý/truy cập `[ ]`; dữ liệu công khai/riêng và server ACL `[ ]`.
- Thời hạn hoặc trigger giữ/xóa theo từng bản sao `[ ]`; legal hold `[ ]`; căn cứ giữ chứng từ `[ ]`; backup/cache/index/outbox `[ ]`.
- Quyền chủ thể/đầu mối/xác thực/hạn `[ ]`; dữ liệu người khác khi export `[ ]`; chuyển dữ liệu/tác động/sự cố `[ ]`.
- Reviewer/role/ngày/quyết định/hạn review `[chưa duyệt]`.

## M04 — Thông báo trước thu và ghi nhận lựa chọn (nội dung chờ duyệt)

Chủ thể đang xử lý `[tên thực, không tự điền]`; mục đích `[ ]`; dữ liệu `[ ]`; người nhận/nước `[ ]`; thời gian/trigger `[ ]`; quyền và cách liên hệ `[ ]`; cần thiết/tùy chọn `[ ]`; hậu quả thật nếu không cung cấp `[ ]`; bản thông báo/hash `[ ]`.

Tách các thao tác: chấp nhận điều khoản hợp đồng; đồng ý xử lý cho mục đích cần consent; tùy chọn analytics; marketing; dữ liệu nhạy cảm nếu áp dụng; lưu CV talent pool; AI training nếu thực sự đề xuất. Không tích sẵn và không giấu rút đồng ý. Bản ghi: subject tham chiếu tối thiểu, purposeId, noticeVersion/hash, timestamp, trạng thái, kênh/thao tác và lịch sử thay đổi. Không thêm fingerprint xâm phạm để chứng minh consent.

## M05 — Tiếp nhận/yêu cầu quyền dữ liệu

RequestId `[ ]`; loại xem/sửa/export/xóa/rút/hạn chế/phản đối `[ ]`; thời điểm `[ ]`; kênh/đầu mối `[ ]`; xác minh tương xứng `[ ]`; data scope `[ ]`; trường hợp không cần thêm CCCD `[ ]`; người xử lý `[ ]`; hạn theo luật đã xác minh `[ ]`; thông báo tiếp nhận `[ ]`.

Preview tác động `[ ]`; phần đủ điều kiện xóa `[ ]`; phần phải giữ/căn cứ/thời hạn/ai được xem `[ ]`; xác nhận người dùng/version `[ ]`; jobs/processor requestIds `[ ]`; retry `[ ]`; báo cáo hoàn tất `[ ]`; lý do từ chối/giới hạn có căn cứ và cách khiếu nại `[ ]`.

## M06 — Legal hold và báo cáo xóa

Case/request `[ ]`; dữ liệu tối thiểu cần giữ `[ ]`; căn cứ/quyết định `[ ]`; thời điểm bắt đầu `[ ]`; người lập và duyệt `[ ]`; ACL/mã hóa/kho lưu `[ ]`; reviewDue/trigger kết thúc `[ ]`; người dùng được thông báo gì theo yêu cầu áp dụng `[ ]`.

Báo cáo xóa: DB/auth/media/CDN/index/cache/outbox/processors/backup, trạng thái từng nơi và biên nhận; phần không thể thu hồi khỏi bản sao bên độc lập phải giải thích, không hứa đã xóa toàn internet. Dữ liệu khử nhận dạng đã kiểm tra nguy cơ tái liên kết thế nào `[ ]`; chứng từ giữ hạn chế không gọi là ẩn danh; tombstone/replay sau restore `[ ]`.

## M07 — Hợp đồng/DPA với bên xử lý (checklist điều khoản)

Pháp nhân/vai trò/phạm vi; chỉ dẫn và purpose; loại dữ liệu/chủ thể; địa điểm và subprocessor; bảo mật/ACL/mã hóa/log; quyền kiểm tra; hỗ trợ quyền dữ liệu; thông báo/sự cố; SLA thực; hạn giữ/xóa/trả; export/backup; chuyển nước; trách nhiệm/chi phí/bồi thường; chấm dứt và chứng cứ xóa. Hợp đồng thương mại không tự cho phép mục đích ngoài thông báo.

## M08 — Hồ sơ quyền sử dụng tài sản

Asset/path/hash hoặc nhóm hash `[ ]`; bản gốc/derivative `[ ]`; nguồn/ngày `[ ]`; tác giả/chủ quyền `[ ]`; giao việc/chuyển giao/quyền phát sinh từ AI nếu có `[ ]`; invoice/hợp đồng/license/link bản điều kiện và bản lưu `[ ]`; quyền thương mại/chỉnh sửa/phân phối/nhúng/sublicense `[ ]`; attribution/brand guideline `[ ]`; thời hạn/lãnh thổ/số seat `[ ]`; music/model/property release nếu cần `[ ]`; owner xác nhận `[ ]`; reviewer và quyết định `[ ]`.

Đã có lời xác nhận tổng của chủ sản phẩm về quyền thương mại; ghi riêng `ownerAttestation`, không dùng nó để tạo tên giấy phép hoặc cho phép logo bên thứ ba vượt hướng dẫn thương hiệu. File có cùng hash có thể dùng chung chứng cứ khi thật sự cùng chuỗi quyền; không mặc định ảnh derivative có mọi quyền mới.

## M09 — Hợp đồng đối tác/chủ đồ/cơ sở/nhà tuyển

Danh tính/vai trò; quyền tài sản/cung cấp ngành; nguồn listing/API/media; tính chính xác giá/tồn; ai giao kết/giữ tiền/xuất hóa đơn; phí/cọc/hủy/hoàn/no-show; giao nhận/thiệt hại; nhân sự/ACL; dữ liệu khách, DPA hoặc vai trò độc lập; xử lý khiếu nại/gỡ tin; audit/đình chỉ; chấm dứt/thu hồi API/data; version/snapshot; cơ quan/tranh chấp. Phụ lục riêng cho từng domain, không copy hợp đồng khách sạn sang Job.

## M10 — Xử lý yêu cầu cơ quan và xuất bằng chứng

Cơ quan/người liên hệ/kênh xác minh `[ ]`; văn bản/số hồ sơ/thẩm quyền/phạm vi/thời hạn `[ ]`; luật sư kiểm tra `[ ]`; người duyệt `[ ]`; dữ liệu tối thiểu/ngoại lệ người khác `[ ]`; phương thức mã hóa/giao nhận `[ ]`; log xuất và hash `[ ]`; giữ/xóa bản xuất `[ ]`; thông báo người dùng khi được phép/phải làm `[ ]`. Không giao toàn bộ database vì một yêu cầu chưa xác minh.

## M11 — Biên bản review/phê duyệt có version

Tài liệu/module/hash `[ ]`; tình trạng kỹ thuật `[ ]`; người review và thẩm quyền `[ ]`; nguồn pháp luật và phạm vi `[ ]`; nhận xét/sửa đổi/ngoại lệ `[ ]`; điều kiện còn thiếu `[ ]`; quyết định `PENDING / REQUEST_CHANGES / APPROVED_IN_SCOPE / REJECTED` `[ ]`; ngày/hạn review/trigger cập nhật `[ ]`; người ký `[ ]`.

**Không dùng “APPROVED_IN_SCOPE” để bỏ điều kiện chưa đạt.** Với Guardian, bản phê duyệt cấu trúc `schemaVersion/checkId/sourceHash/decision/reviewer/scope/evidence/reviewedAt/expiresAt` chỉ được tạo từ quyết định có thật; không dùng mẫu JSON tự điền tên làm bằng chứng thẩm quyền. Legal/company/policy version khác technical source phải có mapping và review đúng snapshot.

## M12 — Duyệt launch và công khai

Feature/build/runtime/source `[ ]`; kiểm thử UAT/role/tenant/giá/tồn/webhook/DSAR `[ ]`; DNS/TLS/egress/mail sink `[ ]`; policy/notice/consent đúng bản `[ ]`; pháp nhân/giấy phép/đối tác `[ ]`; tài sản `[ ]`; incident/backup/rollback `[ ]`; người trực/on-call `[ ]`; điều kiện hạn chế `[ ]`; quyết định bật dịch vụ `[chưa duyệt]`.

Luật sư review nội dung; doanh nghiệp phê duyệt chính sách/quy trình; cơ quan chỉ xác nhận/cấp phép/tiếp nhận theo thủ tục thuộc thẩm quyền. Ba việc có thể khác nhau, không gộp thành một dấu “đã duyệt pháp lý”.
