# Kiểm thử RELOO Assurance

```powershell
npm ci
npm install --prefix output/verification --save-exact ssh2 @electric-sql/pglite@0.5.8 ganache@7.9.2
node scripts/compile-evidence-contract.mjs
node --test tests/*.test.mjs
```

Bộ giả lập Ganache chỉ nằm ở `output/verification`, không phải phụ thuộc ứng dụng hay image production. Kiểm thử EVM không kết nối RPC/ví thật hoặc tạo giao dịch có giá trị thực.

Các nhóm kiểm tra: xác thực/điện thoại; căn cước/độ tin cậy/liveness; địa chỉ và tên ngân hàng; quyền dữ liệu; nguồn cảnh báo/email; chuỗi chữ ký và EVM; VND/thuế/HMAC; journal commit/cấm sửa/idempotency; hai bên giao nhận/hoàn trả; ba vụ giả mạo xác nhận đúng người.

Kiểm thử video trong image KYC dùng clip WebM tổng hợp; xác nhận từ chối ảnh/video không có người thật. Bộ hỗ trợ video chưa phải chứng nhận kiểm tra sống nâng cao và không tự cấp đủ điều kiện duyệt.
