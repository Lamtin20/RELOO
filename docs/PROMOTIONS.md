# Chương trình khuyến mãi và coupon RELOO

CRM: `/crm?view=promotions`. Chủ đồ: `/dashboard/promotions`.

## Khai báo

1. Tạo chương trình ở trạng thái **Dự thảo**, nhập thời gian, dịch vụ, điều kiện và bên chịu phần giảm.
2. Thêm coupon giảm số tiền VND hoặc phần trăm (tối đa hai chữ số thập phân). Có mức giảm tối đa, giá trị đơn tối thiểu, tổng lượt, lượt mỗi khách, khách được chọn và điều kiện đơn đầu tiên. Đơn đầu tiên xét giao dịch thuê đã thanh toán hoặc hóa đơn dịch vụ đã phát hành được gắn với khách hàng.
3. Chỉ bật công khai mã khi muốn hiển thị trên trang ưu đãi. Chương trình và coupon phải cùng hoạt động, còn thời hạn và còn lượt/ngân sách.
4. Với bên tài trợ **Chủ đồ / nhà cung cấp**, mời từng người tham gia. Họ đọc điều kiện và xác nhận ở trang quản lý. Thay đổi chương trình hoặc coupon cần xác nhận lại phiên bản trước khi áp dụng vào đơn mới.
5. Với bên tài trợ **RELOO** cho tiền thuê, kế toán chọn khoản tiền thuộc RELOO đã xác minh qua ngân hàng, phân loại vốn hoặc doanh thu đúng chứng từ, rồi cấp ngân sách. Khoản vào VA của khách và tiền đã phân bổ cho khách không được sử dụng làm ngân sách này. Khai báo pháp nhân và số tiền ngân hàng hiện tại là điều kiện cấp ngân sách.

Quyền: `promotions.read`, `promotions.write`; cấp ngân sách cần thêm `accounting.write`. Sổ khuyến mãi cần `accounting.read`. Tài khoản quản trị có quyền `*`.

## Áp dụng và đối soát

- Người thuê nhập mã trong thỏa thuận đã được chấp nhận khi thanh toán qua RELOO được bật. Máy chủ lấy giá từ thỏa thuận; tiền cọc không được giảm bằng coupon tiền thuê. Mỗi đơn dùng một coupon.
- Trước khi phát QR, hệ thống giữ lượt và ngân sách trong cùng giao dịch cơ sở dữ liệu, chốt giá bằng bằng chứng có chữ ký. QR theo VA của chính người thanh toán và thu số tiền sau giảm. Sau khi phát QR, không đổi coupon hoặc giá của lệnh thu.
- Coupon chủ đồ tài trợ: chủ đồ nhận giá sau giảm đã đồng ý. Coupon RELOO tài trợ: phần bù dùng nguồn tiền công ty đã cấp, chủ đồ được ghi nhận đủ giá gốc. Giảm 100% ghi trạng thái **FREE**; không tạo giao dịch ngân hàng 0 đồng.
- Hóa đơn dự thảo của phí RELOO, quảng bá tin và kiểm tra tình trạng có trường coupon, khách hàng và loại dịch vụ. Chiết khấu được phân bổ chính xác trước thuế. Phát hành hóa đơn vẫn đi theo cấu hình và quy trình hiện có.
- Bản nháp chưa gửi nhà cung cấp có thể hủy kèm lý do, trả lại lượt. Hóa đơn đã gửi/phát hành không dùng thao tác hủy nháp.
- Lệnh thu thuê còn chờ hoặc quá hạn QR vẫn giữ lượt/ngân sách để đối soát khoản chuyển đến muộn. Không tự giải phóng và phát một giá khác trên cùng thỏa thuận.
- Dịch vụ giao hàng có thể khai báo trong phạm vi chương trình nhưng chưa được trừ vào phí đối tác; tính phí giao hàng đang tắt theo yêu cầu vận hành.

Kế toán xem **Sổ khuyến mãi** tại `/crm?view=finance`: phân loại nguồn ngân sách Nợ 3388 / Có 411 hoặc 5113; khoản bù đã xác nhận Nợ 641 / Có 3388. Các dòng này đi cùng sổ ngân hàng và chứng từ, không ghi tăng tiền ngân hàng lần nữa. Có xuất CSV. Coupon giảm giá dịch vụ được thể hiện trên hóa đơn. Người phụ trách kế toán cần chọn loại nguồn phù hợp chứng từ thực tế.

## Triển khai

Áp dụng sau các migration nền finance, cashflow, wallet-display, payout-requests, identity-retention, rental-payments và payout-out-attribution, theo thứ tự:

1. `deploy/vietnam/promotions.sql`
2. `deploy/vietnam/promotion-payments.sql`
3. `deploy/vietnam/promotion-wallet.sql`
4. `deploy/vietnam/promotion-invoices.sql`
5. `deploy/vietnam/promotion-deletion.sql`
6. `deploy/vietnam/promotion-funding-ledger.sql`
7. `deploy/vietnam/promotion-public.sql`

Chạy trong một transaction với `ON_ERROR_STOP`, sao lưu trước khi áp dụng. Có RLS và chặn gọi trực tiếp bằng khóa người dùng; thay đổi cần qua API có kiểm tra quyền và nguồn yêu cầu. Bằng chứng giá và nguồn ngân hàng được kiểm tra chữ ký trước khi ghi nhận số tiền hoặc chi trả. Các bảng phân bổ ngân sách/bù giảm giá bất biến; CRM lưu người thực hiện và lý do.

Kiểm thử: `node --test tests/promotions.test.mjs`. Không dùng dữ liệu ngân hàng thật để tạo bản thử. Chương trình thử trên production phải để dự thảo, không cấp tiền hoặc công khai mã.
