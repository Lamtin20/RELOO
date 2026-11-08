# Giao diện và thanh toán — 11/10/2026

Thanh cookie ở đáy viewport, bố cục ngang desktop và gọn trên mobile; không che thanh điều hướng mobile. Chatbot nổi đã được gỡ. Khu quản lý mở “Thu nhập & thanh toán” trước, biểu tượng ví và nút “Rút tiền”. Tiêu đề tab, icon và công tắc phí giao hàng/thanh toán VA được khai báo tại CRM → Thương hiệu. Tiêu đề mặc định: Reloo - Cộng đồng thuê & cho thuê đồ dùng, thiết bị.

Phí giao hàng tắt mặc định, không có liên kết ở trang chủ/header/footer. Khi cần, công tắc cho phép API báo phí; giao dịch sử dụng trường địa chỉ tỉnh/thành, phường/xã, đường và số nhà. Địa chỉ tin đăng và hồ sơ giữ cả cấu trúc và chuỗi tương thích dữ liệu cũ.

Thanh toán VA chưa bật trên hệ thống thật. Phải hoàn thành pháp nhân, điều kiện thu hộ, ngân hàng hỗ trợ VA, duyệt căn cước và gắn VA thật cho người thuê. Hai tài khoản MBBank cá nhân hiện có không đủ để cấp VA Vietcombank/VietinBank. Ký quỹ vẫn có cổng điều kiện riêng và chưa được bật. VA theo đơn phải khớp số tiền đúng thỏa thuận.

Lệnh QR gắn thỏa thuận đã được cả hai bên chấp thuận, tài khoản người trả, VA và số tiền do máy chủ lấy từ thỏa thuận. Máy chủ không nhận số tiền hay tài khoản đích tùy ý từ trình duyệt. SePay tạo hình QR; webhook chỉ được phân bổ sau khi đã xác minh độc lập giao dịch ngân hàng và chữ ký nguồn. Mã tham chiếu đầy đủ, đúng VA, ngân hàng, số tiền và thời hạn mới tự ghi nhận. Chuyển thiếu/dư/sai hoặc trùng mã được để đối soát; không tự cộng cho chủ đồ. Phân bổ tiền thuê vào nghĩa vụ phải trả chủ đồ (3388), tiền cọc vào 344 khi chương trình đủ điều kiện. Sổ phân bổ là chuyển nghĩa vụ từ khoản chờ đối soát, không ghi tăng tài khoản ngân hàng lần hai. Hạng mục tiền cọc hiện chưa phát lệnh thu vì ký quỹ chưa sẵn sàng.

Rút tiền có nguồn tiền thuê, tiền cọc, hoàn giao dịch và hoàn tiền đối tác. Khoản cọc/hoàn phải được kế toán phân loại, đối soát và phê duyệt chi trả; chặn khi còn nghĩa vụ chưa hoàn tất. Tổng khả dụng giới hạn bởi nguồn thật đã xác minh, tín dụng chi trả, tiền ngân hàng còn lại và tiền cọc chưa giải phóng. Lệnh chi trả giữ chỗ nguyên tử, một khóa yêu cầu chỉ dùng một lần. Chưa có tự động chuyển tiền ra ngân hàng.

Kiểm tra: tests/refinement.test.mjs, manual-kyc, new-features-schema, wallet-model, wallet-schema; kiểm tra DOM cookie ở desktop/mobile/auth, luồng camera trong tab QA riêng và không gửi hồ sơ thử vào tài khoản người dùng thật.

Áp dụng thêm `payout-out-attribution.sql`: tiền ra không có VA được gắn với yêu cầu đang chuyển bằng mã RELOO-RUT đầy đủ, số tiền, ngân hàng nguồn và thời điểm. Tác vụ chỉ chạy sau khi chữ ký/bằng chứng nguồn đã được xác minh. Việc gắn tiền ra chưa đánh dấu đã trả: kế toán vẫn phải kiểm tra người thụ hưởng rồi xác nhận chứng từ thực để chuyển sang PAID. Giao dịch sai số tiền, mã, ngân hàng hoặc lặp chứng từ bị giữ lại để đối soát.
