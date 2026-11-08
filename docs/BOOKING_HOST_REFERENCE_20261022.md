# Khảo sát Host Dayladau và triển khai RELOO bổ sung

Kiểm tra 22/10/2026, bắt đầu khoảng 22:31 Asia/Ho_Chi_Minh. Chrome 155, web Host footer **0085**. A = UI thao tác trực tiếp; B = tài liệu chính thức; C = chưa kiểm chứng; D = thiết kế RELOO. Không tuyên bố đã xem mọi quyền, mọi trạng thái hay backend của Dayladau.

## Quyền và ranh giới phiên này

Người dùng tự đăng nhập Host trong Chrome `host-study`, sau đó cho phép tạo **đúng một listing nháp khảo sát**. Đã tạo listing `lsuz9jn65e`, tên **RELOO khảo sát — không mở bán**. Số listing sau khảo sát: 1 bản nháp, 0 xuất bản, 0 chờ duyệt. Không bấm Gửi duyệt; không thêm ảnh giả/cơ sở thương mại khác; không kết nối lịch/OTA/cohost; không chạy import AI để tạo draft thứ hai; không tạo đơn, gửi mã/tin hay thanh toán. Không thay tài khoản pháp lý/ngân hàng. Dữ liệu giá/sức chứa/địa chỉ khu vực trong draft là dữ liệu thử, không phải cơ sở thật.

Ảnh giữ lại che tên chủ tài khoản; text evidence thay tên bằng `[HOST REDACTED]`. Không lưu token/cookie/password/OTP. Hình minh họa onboarding là dữ liệu hiển thị sẵn công khai của trang, không phải đơn người dùng. REA thu bằng chứng welcome/public guides; Playwright thực hiện UI trong phiên Host được người dùng mở. Không đọc state/store riêng hay endpoint riêng để vượt validation.

## Kết luận ba nhóm tính năng

**Lịch chung (A+B):** editor có xuất iCal, nhập iCal qua tên nguồn + link .ics, và kết nối Airbnb bằng cohost. Tài liệu chính thức nói iCal có độ trễ, cần kiểm tra/đối soát lịch, và mô tả cohost như cách nhanh hơn. UI gọi cơ chế cohost là cập nhật tức thời, nhưng phiên này chưa có kết nối thật để đo độ trễ, retry hay chống trùng. Không có bằng chứng đủ để cam kết không overbook tuyệt đối. Các trường dữ liệu thực trong feed iCal cũng chưa được kiểm tra; RELOO chủ động chỉ nhập availability, không suy ra feed Dayladau luôn không chứa giá/PII.

**Tạo từ link (A):** nút tạo listing có 3 cách: bắt đầu mới, sao chép listing, hoặc từ link. Form AI nhận Airbnb/Booking.com/Go2Joy, có ghi chú ưu tiên hơn trang nguồn, chỉ dẫn dùng listing của chính chủ; phiên này hiển thị 3/3 lượt còn lại/ngày, mỗi loại phòng một lượt. Domain không hỗ trợ làm xuất hiện lỗi và khóa nút bắt đầu. Chưa kiểm tra engine, kết quả mapping/ảnh, tiến trình, retry, quota server hay rollback; không có cơ sở của chính chủ để chạy importer và không được tạo draft thứ hai.

**Vận hành (A+B):** buffer vệ sinh tự chặn khoảng sau checkout theo UI. Dọn dẹp yêu cầu cơ sở, hiện tài khoản chưa có cơ sở nên chưa quan sát giao việc/thực thi. Check-in editor nhận hướng dẫn, mã cửa chủ nhập nhiều mục, Wi-Fi và giờ mở link; tự check-in hoàn toàn đòi hướng dẫn + mã, một phần đòi hướng dẫn. Mặc định link hướng dẫn mở 2h trước check-in; có ngay sau booking hoặc 1/2/3/6/12/24/48h trước. Đây là quyền xem, chưa chứng minh push gửi đúng giờ hay API sinh/rotate khóa. Nhắc review mới thấy qua quảng bá/tài liệu; chưa xác minh scheduler, điều kiện, kênh và opt-out.

## Bao phủ 10 màn chính

Evidence [host-screens.json](../output/rea/dayladau-host/host-screens.json); ảnh `host-0.png` đến `host-9.png` trong [thư viện có chú thích](../output/rea/dayladau-host/index.html). Chuỗi thao tác là click navigation hoặc mở đúng route đã hiển thị; mỗi màn chờ render và chụp, không gọi API riêng.

| Màn | Đã quan sát (A) | Giới hạn |
|---|---|---|
| Tổng quan | Checklist tạo listing → danh tính → hướng dẫn → nối lịch; hai mục sau khóa khi chưa có listing | Không làm KYC/khai thuế |
| Listing | Lọc vai trò owner/cohost; filter published/hidden/pending/draft; search; empty trước khảo sát và 1 draft sau | Không publish hoặc kiểm thử duyệt |
| Lịch | Ngày/giờ, lọc đơn/block, khoảng ngày, chia sẻ, màu, search phòng | Không có published inventory/OTA để quan sát conflict realtime |
| Khóa phòng | Ngày/giờ đến–đi, số người, tên phòng, danh sách phòng trống | Không tạo block thật |
| Đơn | Stats, bảng đơn, filter, export/create entry, empty | Không tạo đơn hay xuất dữ liệu khách |
| Cơ sở | Search/trạng thái, empty, nút thêm cơ sở | Không tạo cơ sở ngoài phạm vi một draft |
| Dọn dẹp | Chọn cơ sở, hôm nay, báo cáo, dạng cleaner; bị gate vì 0 cơ sở | Chưa giao việc hay cập nhật status thật |
| Báo cáo | Revenue/performance/health/reviews/payment categories; khoảng ngày; lỗi quyền tại số liệu | Không coi lỗi dữ liệu là số 0; không suy KPI thực |
| Hỗ trợ | Giờ làm việc, ngoài giờ, form entry, tracking mã, empty | Không gửi ticket/cấp cứu/tin |
| Thông báo | All/unread/read, master/detail, empty | Không bấm mark all hay tạo notification |

## Wizard đã thao tác trên một draft

Ban đầu UI hiển thị 22 bước; sau lưu địa chỉ luồng hiển thị 14 bước. Đây là điều quan sát được, chưa biết chính xác nguyên nhân backend/feature flag. Không hard-code số bước thành quy tắc chung.

| Bước/nhóm | Rule quan sát và thao tác | Artifact |
|---|---|---|
| Tên | Dùng tên khảo sát đã được cho phép | Snapshot wizard + tên draft cuối |
| Loại hình | Chọn Nhà riêng trong nhiều loại; tiếp theo chọn phạm vi phòng riêng | `wizard-1`, `wizard-2` |
| Địa chỉ | Free text không đủ; phải chọn gợi ý để lấy mã tỉnh/phường; dialog xác nhận tọa độ/timezone | `wizard-3`, `wizard-current.txt`; chỉ gắn khu vực Hoàn Kiếm cho draft thử |
| Sức chứa | Khách tiêu chuẩn/tối đa, phòng/giường/tắm; số tối đa tính cả trẻ em | `wizard-4` |
| Tiện nghi | Không chọn thì chặn, cần ít nhất 1; chọn Wi-Fi chỉ trong draft thử | `wizard-batch-1/2.txt`, `wizard-5.png` |
| Giá cơ bản | Giá đêm, phụ thu khách, phí giờ >0 tại validation wizard; ghi 500000/10000/10000 là fixture | `wizard-batch-2/3.txt`, `wizard-6.png` |
| Giá từng thứ | Có bảy ngày, mặc định theo giá đã nhập; không tự coi gợi ý tăng giảm là policy | `wizard-7.png` |
| Nhận/trả/buffer | Chọn nhận 14h, trả 11h, đổi buffer thử 1h; wizard chọn 0–5h | `wizard-8.png` |
| Theo giờ | Toggle, không bật cho draft | `wizard-9.png` |
| Check-in method | Có nhiều cách tự nhận/đón/lễ tân | `wizard-10.png` |
| Đặt ngay | Toggle và giải thích | `wizard-11.png` |
| Hoa hồng | Có mức 20%/15%, kèm tuyên bố phân phối/quyền lợi; không thay mức chọn mặc định | `wizard-12.png`; không xác minh ranking/coverage |
| Ảnh | Yêu cầu ảnh, drag reorder; dừng trước gửi duyệt; mở editor đầy đủ để khảo sát tiếp | `wizard-13.png`; không upload ảnh giả |

## 26 panel editor đã mở, cùng một draft

Evidence [editor-panels.json](../output/rea/dayladau-host/editor-panels.json), `arrival-panels.txt`, `settings-panels.txt`; ảnh `editor-0..15`, `arrival-0..4`, `settings-0..4`. Mỗi panel được click, capture rồi chuyển panel; không bấm lưu/publish trong giai đoạn xem editor.

| Nhóm | Các trường/rule nhìn thấy | Áp dụng vào RELOO |
|---|---|---|
| Ảnh/video | Ít nhất 5 ảnh mới gửi duyệt; chia ảnh theo khu vực; kéo thứ tự | Chưa triển khai media wizard mới; phải WebP pipeline hiện có |
| Tên | Public title khác nickname nội bộ | Chưa có nickname booking; không lẫn dữ liệu nội bộ vào catalog |
| Loại hình | Property kind, nhiều view, phạm vi riêng/chung | Schema mở rộng cần duyệt, chưa nhận là tương đương RELOO unit |
| Mô tả | Mô tả 1000 ký tự, xung quanh 500; có gợi ý độ dài | Draft manual RELOO có giới hạn riêng; chưa copy claim conversion |
| Vị trí | Autocomplete + tọa độ + street/ward/district/city/province | Tái dùng địa chỉ RELOO, không tự nhận địa chỉ free-text đã xác minh |
| Sức chứa | Standard/max guests, room/bed/bath/living/kitchen/extra mattress/area | Capacity RELOO server đã có; phần room metadata nâng cấp còn thiếu |
| Tiện ích | Phân nhóm phòng tắm, sinh hoạt, mạng, bếp, outdoor… | Không sao chép nguyên danh mục thương mại; dùng taxonomy RELOO |
| Nổi bật | Service riêng có ảnh/mô tả/giá | Chưa tích hợp booking extras; cần snapshot giá riêng |
| Đêm | Giờ, buffer, chặn cuối đêm tới 08h, giá theo thứ, phụ thu người lớn/trẻ, phí giờ | Demo RELOO chỉ ngày; buffer có SQL, còn tariff nhiều mode chưa mở |
| Giờ | Toggle; mô tả short stay và chặn trùng đêm | Chưa đủ xác minh rounding/min/max; RELOO chưa bật |
| Trong ngày | Khung nhận/trả cùng ngày, giá hệ số 1/1.5/2 | Rule tham chiếu; chưa phê duyệt kinh doanh RELOO |
| Đêm muộn | Toggle cho khung tối → sáng | Các field khi bật chưa thay đổi/lưu để tránh mở bán nhầm |
| Combo | Một số mẫu, tạo mới, chọn nhiều, áp dụng phòng khác | Chưa áp dụng combo thật; không copy claim tăng doanh thu |
| Cận giờ | Toggle, giảm theo cửa sổ gần check-in | Mức/cửa sổ khi bật chưa được lưu hoặc test mua |
| Đặt ngay | Bật = không duyệt từng đơn; tắt = host xác nhận | Demo RELOO direct-confirm; pending-partner chưa nối |
| Phí/cọc/tháng | Một lần dọn, cọc nhận phòng, giá tháng; 0/empty khi không áp dụng | Tách khỏi phụ thu bắt buộc wizard; không tự áp phí/cọc vào RELOO |
| Đón tiếp | 5 cách, hỗ trợ theo giờ, 00h–00h được UI giải thích là cả ngày | Chỉ draft spec; access gate helper RELOO có test riêng |
| Hướng dẫn | Block text/ảnh/link, fallback; code nhiều mục; Wi-Fi sau booking; giờ release; copy phòng khác | RELOO chưa gửi mã; giữ code ngoài public/audit, gate/time/revoke cần provider thật |
| Đỗ xe | Motor/car tách riêng, phí/vị trí/khoảng cách/mô tả | Chưa có booking parking form; không nhập giá giả vào catalog |
| Nội quy | Tri-state cho các hành vi, identity requirement, quiet hours, mô tả 500 | Cần public snapshot policy; không auto chuyển các đề xuất thành lựa chọn host |
| Hủy | Flexible/Strict và ghi chú; UI có các mốc 7 ngày, 2–7 ngày, sát ngày | Chưa đo boundary chính xác; không áp policy này sang RELOO |
| Trạng thái | Draft được lưu, submit mới bắt đầu duyệt | Draft khảo sát còn draft, không bấm submit |
| Hoa hồng | 20%/15%, ví dụ net khác; quảng bá ranking | Không đổi fee RELOO; không coi ranking claim là thuật toán đã biết |
| KPI | Mục tiêu nội bộ, tổng giá tuần ×30/7 ×occupancy | Chưa là doanh thu dự báo đã đảm bảo |
| Tích hợp | iCal export/import, nhanh Airbnb cohost, website link | Local RELOO chỉ fixture import availability, không tự kết nối hay dùng account đối thủ |
| Co-host | Chỉ owner thêm/xóa; cohost quản lý giá/đơn/chat | Booking membership có scope; UI quản role chi tiết chưa triển khai |

## Nguồn công khai chính thức (B), đã kiểm tra 22/10/2026

- [Đồng bộ lịch](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/huong-dan-dong-bo-lich-phong-giua-dayladau-va-cac-kenh-ota-khac): nhập/xuất iCal, độ trễ, Airbnb cohost. Evidence `guide-1.json`.
- [Quản lý lịch](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/quan-ly-lich-phong): hàng phòng/cột ngày, panel đơn–khóa–giá, thao tác mở khóa. `guide-2.json`.
- [Buffer vệ sinh](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/cai-thoi-gian-don-dep-hop-ly-de-toi-uu-ban-phong): khoảng nghỉ theo checkout có ảnh hướng dẫn. `guide-3.json`.
- [Đăng phòng](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/huong-dan-dang-ban-phong-tu-a-z): đăng ký, tạo listing, duyệt, đồng bộ lịch. `guide-4.json`.
- [Dọn dẹp](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/tinh-nang-don-dep-tren-dayladau): trạng thái nhận việc/đang làm/hoàn thành, assignment, thống kê. `guide-5.json`; chưa quan sát giao việc thực tế.
- [Check-in tự động](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/toi-uu-quy-trinh-don-tiep-khach-voi-huong-dan-checkin-tu-dong): nội dung tự vào phòng, hình/video/key instructions. `guide-6.json`; lời khuyên gửi sau xác nhận không đồng nghĩa mọi link mở ngay, vì editor có cấu hình thời gian riêng.
- [Co-host](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/huong-dan-chu-nha-add-cohost-vao-listing): cần account đã có, owner giữ chủ quyền và gỡ quyền. `guide-7.json`.
- [Thanh toán host](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/chinh-sach-thanh-toan-doanh-thu-cho-chu-nha): mô tả chờ checkout +24h khi không tranh chấp, kỳ thứ Hai, yêu cầu ngân hàng/pháp lý. `guide-8.json`; không đo payout thực, không áp sang RELOO.
- [Host hủy đơn](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/dieu-gi-se-xay-ra-neu-ban-huy-dat-phong-cua-khach-hang), [Đặt ngay](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/bat-tinh-nang-dat-ngay-giup-tang-hien-thi), [Policy hủy](https://blog.dayladau.com/tai-lieu-tham-khao-host-dayladau/chinh-sach-hoan-huy-linh-hoat): hướng dẫn/claim, không phải bằng chứng code ranking. `guide-9..11.json`.
- [Điều khoản Host](https://blog.dayladau.com/dieu-kien-dieu-khoan): mở từ dialog đăng ký, trang ghi cập nhật 14/10/2026, 17 điều. Chỉ đọc; không bấm đồng ý. Nội dung pháp lý không tự sao chép làm hợp đồng RELOO.

## Phần đã xây thêm trong RELOO, có kiểm thử

`/dat-phong/chu-nha` nối từ workspace cũ: lịch cùng unit cho RELOO/external/block, tạo external booking có source/reference, chặn overlap phía SQL; iCal text preview/apply transaction, UID dedupe/update/tombstone, lỗi không xóa lịch cũ; nhập link allowlist không fetch/không giả AI, nháp trong phiên có rights confirmation; xem kế hoạch vận hành và đổi buffer có gate tránh làm sai đơn đã nhận.

Migration mới `20261022122000_room_booking_channels.sql`, backend-only RPC `reloo_stay_host`. Dùng cùng locks, blocks và membership hiện có, không tạo kho tồn song song. External amount là chủ ghi nhận, chưa settlement. Calendar không trả dữ liệu khách/mã cửa. Parser từ chối recurrence không hỗ trợ, timezone mơ hồ, duplicate UID, ngày invalid; bỏ summary/description/location/attendees để không nhập PII. Không có scheduled pull/export/OTA authority; mọi mutation vẫn chỉ local test, production fail closed.

`checkinGuideAccess` là rule **đề xuất RELOO** được unit-test: guide/code theo method, time gate, paid+confirmed, hết quyền sau checkout/cancel; không chứa code hay tự gửi. Không tuyên bố đã sao chép backend Dayladau. Toàn bộ UI RELOO mới dùng token/typography/locale/shell sẵn có; không dùng logo/ảnh/code Dayladau.

Chạy: `npm run stays:preview`; xem `http://127.0.0.1:4522/dat-phong/chu-nha`. Cần khởi động preview mới để fixture có migration mới. `npm run test:stays`; test browser qua `scripts/stays-host-browser-check.js`. Bằng chứng tại `output/playwright/stays-host/`, báo cáo kết quả xem `tests.txt`, `browser-results.txt`, `build.txt`. Browser mới đạt 12 checks, gồm responsive 320/390/768/1440, iCal preview/apply, source block hiện lịch, conflict bị từ chối, external hợp lệ, không giả AI, draft không publish, buffer gate và cập nhật khi không có tồn.

Bộ SQL/API/host rules + regression chọn lọc cuối đạt **34/34**, lint scope mới không có error/warning. Có test iCal transaction rollback và tenant scope, check-in release window/excluded states, security-lockdown sau migration và regression Rental Selection/Neighborhood. Đây vẫn là PGlite một connection, không chứng minh race đa tiến trình PostgreSQL production. 12 browser checks dùng API + database local thật, không giả response booking; unavailable auth service của sandbox không được coi là auth integration pass. Build production local được lưu riêng trong `build.txt`; không có deploy hoặc thay đổi runtime/native.

## Chưa thể nói đã sao chép/triển khai toàn bộ

Chưa có OTA connection thật, AI import thật/quota server, smart-lock provider, auto assignment/app nhân viên, gửi check-in/review thật, recurring iCal/reconciliation worker, tariff theo giờ/combo/last-minute, full listing/media/editor 26 panel, cohost fine-grained UI, payout/refund multi-policy và admin approval UI đầy đủ. Spec/evidence không được coi là chức năng production. RELOO vừa triển khai là phần bổ sung local cho ba nhóm quan trọng; toàn bộ portal chưa được tái dựng hoàn chỉnh.

Các màn sau gate cần inventory/cơ sở nhân sự thật hoặc sandbox riêng: cleaning assignment/statistics, private booking detail, OTA sync errors/history, import result, thông báo mã cửa, refund/payout. Không tạo cơ sở hay booking thật để lấp bằng chứng còn thiếu. Bản nháp khảo sát đã được giữ lại đúng quyền người dùng; có thể mở trong Host listings để review. Chưa gửi duyệt/xuất bản/deploy/native release.
