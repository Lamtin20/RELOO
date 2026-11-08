# Vận hành hồ sơ, xác minh và đối soát RELOO

## Khai báo trong CRM

`/crm?view=settings` là nơi khai báo pháp nhân, đầu mối hỗ trợ/bảo vệ dữ liệu và khóa dịch vụ. Khóa chỉ nhận qua kết nối HTTPS, mã hóa trong cơ sở dữ liệu Việt Nam, không được trả lại trong API đọc. Phiên bản cấu hình và người thay đổi được ghi vào nhật ký.

Thông tin pháp nhân cập nhật footer và các tài liệu mới. Tài liệu đã giao kết, bản chấp nhận và chứng từ giữ phiên bản/snapshot tại thời điểm phát sinh. Khai báo thông tin không thay thế đăng ký doanh nghiệp, nền tảng hoặc hóa đơn với cơ quan quản lý.

## Giai đoạn hiện tại: ghi nhận hồ sơ, admin duyệt

Theo yêu cầu mới, luồng đang dùng `RELOO_KYC_MODE=MANUAL`: số căn cước và ngày hết hạn do người dùng nhập, hai ảnh thẻ và chân dung chụp trực tiếp bằng camera. Admin kiểm duyệt tối đa 72 giờ; CRM đánh dấu hạn và quá hạn. Không xử lý OCR, nhận diện khuôn mặt tự động hoặc gửi hồ sơ mới sang VNPT. Xem `docs/MANUAL_KYC_SETUP.md` để vận hành và kiểm tra. Hồ sơ và bằng chứng cũ được giữ theo thời hạn lưu, không dùng kết quả tự động cũ để tự duyệt.

## VNPT và luồng Web trước đây (đang tạm dừng)

Web desktop, Safari iOS và Chrome Android dùng chụp hai mặt, quay bằng máy ảnh trước, OCR/đối chiếu qua máy chủ. SDK native iOS/Android được cấu hình riêng khi có dự án ứng dụng và gói VNPT được cấp. Trang tải hiện chỉ tạo `config.zip` chứa cấu hình màu/logo; đó không phải toàn bộ SDK.

- Chỉ gửi ảnh sang VNPT với sự đồng ý `VNPT_WEB_V1`. Hồ sơ cũ không tự được chuyển sang nhà cung cấp.
- Tỷ lệ khớp lấy trực tiếp từ `compare.prob`, phải có `MATCH` và **trên 80%**. Không đổi khoảng cách SFace thành xác suất.
- OCR phải đọc đủ số/thông tin, phù hợp khai báo, vượt kiểm tra giấy tờ và độ tin cậy. Không dùng trường thiếu/lỗi hoặc response HTTP 200 đơn thuần để duyệt.
- Video dùng thử thách mới có hạn 5 phút, dùng một lần; giải mã/kiểm tra ở máy chủ, kiểm tra một khuôn mặt, thứ tự chuyển hướng, đối chiếu và dấu hiệu trình diễn giả.
- MediaPipe/MiniFASNet/SFace là lớp hỗ trợ tại RELOO, không phải chứng nhận eKYC. Lớp này không tự cấp phê duyệt chỉ từ “quay được”. Tự duyệt cần kết quả kiểm tra sống nâng cao VNPT được xác thực ở máy chủ; chưa có bằng chứng này thì cần người xét duyệt.
- Hồ sơ được đọc/xem xét theo quyền; việc xem được ghi nhật ký. Có video thì người xét duyệt cần xem đủ hai mặt, chân dung và video.
- Ảnh/video/OCR thô lưu mã hóa bên ngoài public và hết hạn 30 ngày. Thông tin định danh đã xác nhận chỉ giữ cho mục đích tài khoản/nghĩa vụ hợp pháp, không dùng làm kho tìm kiếm khuôn mặt người khác.

Kiểm tra lại ngày 10/10/2026: upload ảnh trả **200 / IDG-00000000**, còn API OCR kết hợp và OCR mặt trước trả **401 / IDG-00000401**. Portal đang hiển thị **eKYC Free Trial, 0 request khả dụng**; token còn hạn đến `2026-10-11T06:29:53Z`. Cần VNPT cấp thêm lượt/quyền xử lý API hoặc kích hoạt gói phù hợp. Chưa đăng ký hay thanh toán gói trả phí. Lỗi lưu kèm bước `UPLOAD`, `OCR`, `FACE_COMPARE`, `CARD_LIVENESS` hoặc `FACE_LIVENESS` trong CRM để không nhầm lỗi quyền/gói dịch vụ với chất lượng giấy tờ. OCR dự phòng đã thử trên hồ sơ nhưng chưa đọc đủ trường; không dùng kết quả này để tự duyệt. Kiểm tra sống nâng cao vẫn cần quyền/hợp đồng VNPT tương ứng.

## An toàn và email

Tra cứu rủi ro thực hiện nền. Khách hàng chỉ nhận cảnh báo có thông tin khớp cùng liên kết đối chiếu; chi tiết nguồn lỗi/HTTP và luồng admin giữ trong CRM. Kết quả không tìm thấy tại hai thẻ iCallme/Scam.vn cho đúng số được dùng theo `CLD_NOT_FOUND_V1`; không tự xóa blacklist hoặc cảnh báo dương tính.

Email được tra cứu với sự đồng ý cho email đã xác nhận của chính người dùng. Lưu tên sự cố, thời điểm và loại dữ liệu từ báo cáo Chống Lừa Đảo/HIBP; không lấy mật khẩu hoặc nội dung rò rỉ. Lộ email không tạo kết luận lừa đảo/blacklist. Nguồn chưa đọc được hoặc thiếu thẻ không được đổi thành “không lộ”.

CheckScam vẫn chặn truy cập HTTP 403 từ server. Không có kết quả tự động được tạo từ response này; cần quyền/API nhà cung cấp hoặc đối chiếu thủ công.

## Sổ đối soát và SePay

`/crm?view=finance` hiển thị nguồn đã đối chiếu, bút toán và dự thảo hóa đơn. SePay chưa được cấp API token/webhook secret trong phiên này, nên chưa có phép thử giao dịch ngân hàng thật.

- Webhook production xác thực `X-SePay-Signature`, `X-SePay-Timestamp`: HMAC-SHA256 trên `timestamp.rawBody`, giới hạn lệch 5 phút. Endpoint: `/api/payments/sepay/webhook`.
- Tiếp nhận/idempotency và tạo job cùng giao dịch cơ sở dữ liệu. Event cùng ID mà body khác đưa ra lỗi; không ghi đè.
- Worker đối chiếu API v2 production bằng UUID hoặc mã tham chiếu chính xác trong tài khoản ngân hàng đã cấu hình. Kiểm tra chiều tiền, tiền VND nguyên, tài khoản, VA, nội dung và mã tham chiếu trước ghi sổ.
- Nợ/Có và tổng nguồn bắt buộc khớp tại commit. Tiền VND tính bằng số nguyên, không dùng float cho phép tính tiền/thuế.
- Khoản thu chưa phân loại: Nợ 1121/Có 3388. Khoản chi chưa phân loại: Nợ 1388/Có 1121. Đây không phải tự ghi nhận doanh thu RELOO hoặc số dư khả dụng của người dùng.
- Bút toán/nguồn đã ghi không sửa/xóa bằng API; điều chỉnh phải có nguồn và bút toán riêng. Chưa có số dư đầu kỳ được kiểm tra thì tổng biến động không phải số dư ngân hàng đầy đủ.
- Hóa đơn hiện có lưu dự thảo và adapter SePay. Phát hành thực tế cần chủ thể bán, đăng ký HĐĐT/nhà cung cấp, nguồn doanh thu đúng người bán, người xét duyệt riêng và đối chiếu response cuối. Response tracking/pending không phải đã được cơ quan thuế xác nhận.
- Không xuất hóa đơn RELOO cho toàn bộ tiền người thuê trả chủ tài sản, không tự coi tiền của khách là doanh thu nền tảng.
- VA nhận diện tiền vào tài khoản chính. VA không tự là hợp đồng ký quỹ, không được sinh “tài khoản ảo” bằng cách ghép chuỗi rồi coi là tài khoản ngân hàng thật.

Tài liệu chính thức: [API v2](https://developer.sepay.vn/vi/sepay-api/v2/gioi-thieu), [webhook](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc), [VA](https://developer.sepay.vn/vi/sepay-api/v2/don-hang/tao-va), [hóa đơn](https://developer.sepay.vn/vi/einvoice-api/v1/tong-quan).

## Lịch sử và EVM

Hai bên đề xuất/xác nhận điều kiện, bàn giao và hoàn trả qua thỏa thuận. Mỗi bước lưu payload riêng mã hóa, mã băm có salt, chữ ký Ed25519 máy chủ và liên kết bản trước. Không được coi chữ ký hệ thống là chữ ký số có chứng thư của khách hàng.

EVM chỉ đưa stream key ngẫu nhiên, thứ tự và digest lên chuỗi. Không đưa tên, điện thoại, CCCD, ngân hàng, nội dung thuê hoặc ảnh lên mạng EVM. `EvidenceAnchor.sol` giới hạn ví ghi, cấm ghi đè và kiểm tra thứ tự/head. Chỉ ghi trạng thái CONFIRMED sau receipt/log/contract được đối chiếu và đủ số xác nhận.

RPC/ví/hợp đồng/hạn mức phí chưa được cung cấp. Chưa có bản ghi trên EVM thật; máy ảo dùng riêng cho kiểm thử. Sau khi khai báo, chỉ neo tuần tự và trong hạn mức phí từng bản ghi; không gửi lại giao dịch đã broadcast khi kết quả đang chờ.

Sai toàn vẹn kho dữ liệu tạo cảnh báo hệ thống, không gán tội cho người có dữ liệu. Ba vụ giả mạo xác nhận đúng người với bằng chứng mới hạn chế tài khoản/blacklist và mở hồ sơ xem xét. Không ban các tài khoản chỉ vì IP chung.

## CRM và thư viện tham khảo

Native CRM bổ sung công việc/lịch hẹn, cơ hội hợp tác, khai báo, tài liệu, đối soát, toàn vẹn. Twenty dùng làm tham khảo tính năng; chưa triển khai một máy chủ Twenty. Không chép mã AGPL/enterprise vào ứng dụng riêng. Kết nối Twenty nếu cần phải tới dịch vụ được tự host ở Việt Nam và được khai báo riêng.

`public-apis` được tải làm danh mục tham khảo; snapshot 2.037 API, có MIT notice và commit nguồn. CRM hỗ trợ tìm kiếm/danh mục/HTTPS/xác thực. Danh mục không tự chứng minh một API còn hoạt động, miễn phí, có giấy phép xử lý dữ liệu cá nhân hoặc được phép sử dụng cho RELOO.
