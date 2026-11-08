# Host workspace — phạm vi thiết kế bổ sung trước triển khai

Ngày 22/10/2026. A: quan sát trực tiếp; B: tài liệu chính thức; C: chưa xác minh; D: rule RELOO đề xuất. Đây là đặc tả ban đầu trước code, được bổ sung sau khảo sát: chủ tài khoản đã tự đăng nhập và cho phép đúng một draft. Đã quan sát 10 màn chính và 26 panel editor cùng wizard; chưa khảo sát vận hành với booking/OTA thật. Xem báo cáo cuối [BOOKING_HOST_REFERENCE_20261022.md](BOOKING_HOST_REFERENCE_20261022.md). Không nhập OTP, không gửi tin, không kết nối OTA hoặc xuất bản thật.

## Ba tuyên bố và cách xác minh

| Nhóm | Bằng chứng hiện có | Kết luận có giới hạn |
|---|---|---|
| Chung lịch | A: welcome màn 1. B: guide-1, guide-2 | iCal import/export; có độ trễ; ghi trạng thái bận/trống. Hướng dẫn còn mô tả kết nối Airbnb qua cohost, cần quyền và phối hợp Dayladau; không phải API tích hợp tự do cho RELOO |
| AI từ link | A: welcome màn 2, sau login mở form ai-create và thử domain không hỗ trợ | Có nguồn allowlist, ghi chú ưu tiên dữ liệu chủ nhà, hiển thị 3/3 lượt/ngày trong phiên. Chưa chạy AI: không có link cơ sở thật thuộc chủ tài khoản, không tạo draft thứ hai. Engine, mapping và quyền nội dung chưa xác minh |
| Dọn/mã cửa/review | A: welcome màn 3, editor check-in, cleaning empty. B: guide-5, guide-6 | Guide editor có mã cửa chủ nhập, nhiều mục, giờ mở hướng dẫn mặc định 2h trước check-in; không chứng minh tạo/đổi mã smart lock, delivery thực tế hay rule review nội bộ |

## Thiết kế RELOO và rule thực hiện trong bản local

Điều hướng workspace bổ sung: **Tổng quan → Lịch chung → Kênh & nhập lịch → Nháp từ liên kết → Vận hành**. Giữ quản lý cơ sở/phòng hiện có; entry từ `/dat-phong/quan-ly`. Desktop panel/calendar list, mobile tab cuộn, form label rõ, token RELOO, vi/en. Các trạng thái demo/unavailable hiện sát CTA.

D: lịch chung hiển thị đơn RELOO, external booking và block bảo trì cùng unit; source label riêng, tổng tiền ngoài không phải doanh thu đã được RELOO đối soát. External booking dùng cùng type lock và overlap check với hold nên không bypass tồn. Lưu nguồn, external reference/idempotency, khoảng thời gian ISO timezone VN, vệ sinh được giữ trong blocked interval. Chỉ chủ/membership đúng property. Không ghi tên/điện thoại khách trên lịch demo.

D: iCal bản đầu **nhập văn bản fixture .ics do chủ được quyền sử dụng**, không fetch URL. Chỉ VEVENT DTSTART/DTEND/UID; date-only DTEND exclusive, UTC Z hoặc TZID Asia/Ho_Chi_Minh; không đoán timezone. Từ chối RRULE, EXDATE, RECURRENCE-ID, duration-only hoặc thiếu UID; CANCELLED là tombstone. Preview trước apply. Batch import transaction; conflict giữ nguyên dữ liệu, không xóa lịch cũ khi fetch/parse lỗi; UID dedupe theo unit + source; cùng source/UID update block nhưng không đè đơn thật; absence không suy là hủy. Chưa có periodic sync/export endpoint/OTA API nên nhãn không tuyên bố kết nối. Không log calendar token URL.

D: tạo draft từ link chỉ parse nguồn Airbnb/Booking.com/Go2Joy theo allowlist HTTPS; không gọi fetch, không đọc private IP/redirect, không chạy script, không tự sao chép ảnh/giá/policy. UI ghi **chưa nối AI**; chủ tự bổ sung title/location/amenity và review. Không trả “AI đã tạo” khi chưa có provider. Không tự đăng/import vào catalog.

D: dọn vệ sinh lấy checkout làm mốc và cleaning buffer hiện có; trạng thái TODO → ACCEPTED → IN_PROGRESS → DONE; chỉ nhân sự property được cấp quyền. Bản đầu hiển thị kế hoạch từ đơn, chưa có app worker/giao việc/push thật. Mã cửa không được chứa trong public catalog, lịch hoặc audit plain text; cần mã hóa/KMS, recipient account scope, paid+confirmed, thời gian và consent, revoke/rotate khi hủy/đổi phòng, idempotent delivery. **Chưa có khóa thông minh/notification adapter → không gửi mã**. Nhắc review chỉ completed, một lần/order, không phân biệt khách hài lòng hay review tích cực, không gửi sau cancel/no-show; chưa có delivery adapter thì chỉ preview pending. Không dùng mã số từ hình Dayladau làm mã demo.

## Màn hình và nghiệp vụ cần khảo sát sau login

Đánh dấu chưa xác minh: calendar lưới/drag/resize/filter/search; multi-property/listing/unit scope; manual booking detail; iCal editor, sync status/error/history/delete; Airbnb cohost consent/status; importer link/error/progress/retry/draft/rights; wizard ảnh/tiêu đề/vị trí/amenity/capacity/giờ/check-in/policy/giá/phí/review/publish; listing editor và điều kiện duyệt; auto-book approval; cohost/revoke; cleaning assignment/worker/checklist/evidence/pay; check-in template/channel/time; review reminders opt-out/dedupe; revenue/payout/tax/cancellation/refund/penalty/support. Tài liệu hướng dẫn có ảnh được xem là B, không phải A thao tác màn quản trị.

Không copy nguyên logo/ảnh/nội dung thương mại hoặc code của Dayladau. Học toàn bộ functional behavior quan sát được và tái hiện bằng code/design RELOO; các rule chi phí/hoa hồng/penalty phải được chủ sản phẩm duyệt, không tự áp dụng sang RELOO.
