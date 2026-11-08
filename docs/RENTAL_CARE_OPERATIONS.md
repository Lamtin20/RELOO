# Rental Care và cá nhân hóa — vận hành

Đã triển khai trong website/API và app Capacitor hiện có. Chưa migrate/deploy production. Tài liệu khảo sát, lựa chọn kiến trúc và nguồn chính thức: [RENTAL_CARE_PERSONALIZATION.md](RENTAL_CARE_PERSONALIZATION.md). Không nhầm Rental Care nhắc hạn với gói bảo hiểm/escrow Reloo Care của bản demo cũ.

## Module và điểm tích hợp

- `/account/calendar`, `/account/personalization`: cài đặt responsive vi-VN/en-US; liên kết trong tài khoản desktop/native. Có bản xem đề xuất trực tiếp từ API, không chỉ giao diện mẫu.
- `lib/rental-care`, `/api/rental-care`, `/api/rental-care/google/connect`, `/api/rental-care/google/callback`: consent, OAuth bổ sung, chọn đích, mapping, lease/retry/receipt.
- `lib/personalization`, `/api/personalization`, các component trong `components/rental-care`: tín hiệu, giới hạn, xếp hạng giải thích được, ẩn/chặn, xóa/đặt lại và phiên bản cache.
- Tích hợp trang chủ, tìm kiếm, xem sản phẩm, bắt đầu yêu cầu thuê, lưu sản phẩm và Nội Khu. Hoàn tất thuê/đánh giá được ghi từ trạng thái DB thật, không tin event hoàn tất của client.
- Android: `RelooCalendarPlugin`, `RelooCalendarEngine`, `RelooCalendarJob`. iOS: plugin/runtime trong `SceneDelegate.swift`, đăng ký nền trong `AppDelegate.swift`, plist và thông báo quyền vi/en. Không thêm app hoặc dependency native mới.
- Operations worker hiện có xử lý lịch Google mỗi 30 giây, retention mỗi giờ khi cờ tương ứng bật. Lỗi chỉ ghi mã/module, không ghi token, email hoặc nội dung lịch.

## Cấu hình và migration

| Biến server/worker | Ý nghĩa |
|---|---|
| `RELOO_RENTAL_CARE_ENABLED` | Calendar API/worker; mặc định false |
| `RELOO_PERSONALIZATION_ENABLED` | Cá nhân hóa/retention; mặc định false |
| `RELOO_CALENDAR_CLIENT_ID` | OAuth client Calendar riêng, không dùng grant Gmail |
| `RELOO_CALENDAR_CLIENT_SECRET` | Chỉ ở server; không đưa vào frontend/Git/hội thoại |
| `RELOO_PRIVATE_DATA_KEY` | Khóa AES-GCM hiện có; không đổi đè khi còn ciphertext |
| `APP_ORIGIN` | HTTPS origin được duyệt; callback chính xác `/api/rental-care/google/callback` |

Bật Calendar API và consent screen/test accounts trong Google Cloud, đăng ký đúng callback. Scopes: `openid email`, `calendar.app.created`, `calendar.calendarlist.readonly`. Scope metadata phục vụ tìm lịch RELOO/reconcile, không đọc nội dung các sự kiện cá nhân. Không xin quyền Gmail. Có Client ID không đồng nghĩa người dùng đã cấp quyền.

Thứ tự sau schema marketplace, rental history và Nội Khu, trên staging được phê duyệt:

1. `deploy/vietnam/rental-care.sql`
2. `deploy/vietnam/personalization.sql`
3. `deploy/vietnam/security-lockdown.sql`, kiểm tra grants và reload PostgREST.

Migration bổ sung bảng/function/trigger, không xóa dữ liệu nghiệp vụ cũ. Không đưa fixture test vào database ứng dụng. App và worker phải cùng phiên bản. Chưa có migration nào ở đây được áp dụng lên production.

## Google OAuth và đúng tài khoản

OAuth Calendar tách khỏi đăng nhập Google và Gmail. Có PKCE, state một lần/hạn 10 phút, mã hóa refresh token và kiểm tra tài khoản RELOO ở callback phải đúng người khởi tạo. URL chuyển tiếp không tùy ý, không có token trong deep link. Callback không tự kích hoạt: UI hiển thị email Google đích, email RELOO và yêu cầu xác nhận; khác email đã xác minh cần checkbox bổ sung. Đổi email RELOO không tự chuyển grant đang có sang email mới.

Trong app, kết nối Google mở **trình duyệt hệ thống** tới cài đặt RELOO. Người dùng có thể cần đăng nhập đúng tài khoản RELOO trong trình duyệt một lần; không giả định cookie WebView và trình duyệt được chia sẻ. Sau thiết lập, link cố định `reloo://calendar` trở về app. Luồng này tránh gắn grant của người khác qua một URL state được chuyển tiếp. Không tự tạo tài khoản Google.

Google dùng lịch RELOO riêng do app tạo. Trước khi tạo, worker tìm marker ngẫu nhiên gắn connection. Một lần create không rõ kết quả chỉ được reconcile, không tự lặp có thể tạo bản sao. Calendar đã có được kiểm tra qua API metadata; lịch ẩn vẫn được tìm, lịch đã bị xóa được phân biệt với lỗi quyền. Event ID xác định, marker riêng, revision và ETag bảo vệ update/delete. 404/410 ở thao tác tạo/cập nhật không được coi là đồng bộ thành công.

Google Calendar có thể xuất hiện trên điện thoại **khi tài khoản/lịch đó được bật đồng bộ trên điện thoại**. RELOO không hứa mọi máy đều tự hiện. Google có thể lưu dữ liệu Calendar ngoài Việt Nam; chỉ gửi nhắc hạn tối thiểu sau đồng ý Calendar. Hồ sơ hành vi ở backend RELOO, không chuyển sang Google/AI/analytics.

## Nghiệp vụ, mapping và đích đồng bộ

| Nguồn | Xác nhận/đang thuê | Đổi hạn | Kết thúc |
|---|---|---|---|
| Nội Khu | CONFIRMED, READY_FOR_HANDOVER, ACTIVE, RETURN_PENDING | `ends_at` thật sau duyệt gia hạn/thanh toán | COMPLETED → RETURNED; CANCELLED/EXPIRED → CANCELLED |
| Rental agreement | ACCEPTED, ACTIVE, DISPUTED | Hạn của thỏa thuận server | CLOSED → RETURNED; CANCELLED → CANCELLED |
| Transaction cũ | CONFIRMED, ACTIVE, RENTING, DISPUTED | Ngày server theo giờ Việt Nam | COMPLETED/RETURNED, CANCELLED |

Transaction có `order_data.agreementId` dùng agreement làm nguồn chuẩn, không tạo bản sao. Đơn pending/draft chưa tạo lịch. Sự kiện là nhắc trả 15 phút kết thúc đúng hạn trả, popup trước một ngày và một giờ tính từ thời điểm bắt đầu sự kiện. Không gửi tên sản phẩm, giá, cọc, địa chỉ/căn hộ, OTP hoặc bằng chứng cá nhân sang Calendar.

Trạng thái DISPUTED cũ chỉ tiếp tục lịch khi đã có snapshot CONFIRMED/ACTIVE; không suy diễn một tranh chấp trước xác nhận thành đơn hợp lệ và không hồi sinh lịch của đơn đã hủy/trả. Bản ghi legacy mơ hồ trước migration cần đối chiếu nguồn chuẩn, không được báo đã đồng bộ bằng suy đoán.

- Xác nhận → queue trong cùng transaction. Gia hạn chưa duyệt không thay hạn; khi server cập nhật hạn mới, cùng mapping được cập nhật.
- Hủy → xóa sự kiện RELOO liên quan. Đã trả → giữ sự kiện và tắt alarm, hoặc xóa theo cài đặt.
- Mapping duy nhất theo connection/provider/lịch/thiết bị + nguồn/đơn. Có version, lease, retry tối đa 5 lần, backoff; receipt cũ không xóa mất một phiên bản mới đang chờ.
- Snapshot cửa sổ thời gian phục hồi và ID/marker giúp tìm lại chính sự kiện RELOO sau crash, kể cả khi hạn trả đã đổi. Không sửa/xóa sự kiện cá nhân không có marker đúng.
- Đổi lịch cục bộ cần xác nhận và giữ mapping cũ. Chọn lại đúng lịch cũ tái dùng connection/remote ID, đồng thời reconcile đơn đã trả/hủy trong lúc ngừng kết nối.

Mặc định một đích Google **hoặc** thiết bị. Chọn Google sẽ tạm dừng ghi thiết bị; không tạo thêm bản sao vào một lịch Google đang được điện thoại phản chiếu. Chế độ BOTH chỉ bật sau checkbox riêng xác nhận nguy cơ hiển thị trùng; giữ Google và lịch cục bộ độc lập do người dùng chủ động chọn. Native picker loại lịch cloud/account-synced.

Mỗi thiết bị cần quyền và lịch cục bộ riêng. UUID iOS ở Keychain ThisDeviceOnly; Android tắt app backup. Cài app không có nghĩa đã cấp quyền. Không prompt trong timer/job; chỉ nút thiết lập được xin quyền. Mất quyền → REAUTH, không ghi SYNCED giả.

Đăng xuất bỏ binding tài khoản hiện tại/cancel lịch chạy nền cục bộ, **không xóa lịch Google dùng chung**. Google server sync tiếp tục khi Calendar consent còn hiệu lực. Native JobScheduler/Background App Refresh là best effort: có thể bị hoãn bởi pin, mạng, force-quit hoặc hệ điều hành. Foreground reconcile chạy khi resume và mỗi 30 giây khi active. Request nền chỉ kiểm tra access token hiện hành, không xoay refresh token WebView sau lưng một lần đổi tài khoản; hết phiên cần mở/đăng nhập app lại. Không cần vị trí nền. Google là đích ưu tiên cho cập nhật từ server khi app đóng.

Trạng thái phân biệt PENDING/PROVISIONING/ACTIVE/PAUSED/REAUTH/FAILED/REVIEW và QUEUED/SYNCING/SYNCED theo từng job. Device receipt là báo cáo từ thiết bị, không phải chứng nhận độc lập đã ghi vào OS. Calendar của thiết bị khác không mặc nhiên có mặt trên máy đang dùng.

## Consent và đề xuất

Consent, danh mục chọn thủ công, epoch và revision ở backend. Guest chỉ có khám phá theo ngữ cảnh, không tạo định danh theo dõi bền vững và không tự gộp lịch sử vào tài khoản. Client subject chỉ chống thao tác cũ sau đổi tài khoản; backend luôn suy ra người dùng từ phiên thật. Calendar, cá nhân hóa, marketing và vị trí thuê độc lập.

Tín hiệu v1 có UUID, thời điểm client/server, consent epoch, kind, asset/category/topic và cờ server-generated. Từ khóa được giảm thành chủ đề/danh mục allowlist trước khi gửi và trước khi lưu; không giữ free text nhạy cảm. Dwell chỉ đo khi đã bật cá nhân hóa, trang visible và có focus. Không đọc chat, trường mật khẩu/CCCD/thanh toán, Calendar cá nhân, Gmail, danh bạ, lịch sử trình duyệt hoặc GPS nền để gợi ý. Không session replay/keylogger.

Client không được khai COMPLETED/REVIEW. Khóa theo actor, event ID, bucket 10 phút và cap lặp/ngày chống refresh/bot. Default half-life 7 ngày, raw/profile horizon 30 ngày, trần điểm danh mục 12, tối đa 2 món/chủ đồ và 3 món/danh mục trong nhóm gợi ý. Một view không là sở thích chắc chắn. Trọng số/TTL/đa dạng ở `pp_configuration.config`; tăng `revision` cấu hình khi sửa quy tắc. Không ghi Trust Score, cọc, scoring tài chính hoặc chống gian lận.

Eligibility chạy trước ranking: tin/owner hoạt động, không khóa/vi phạm, loại trừ do người dùng chọn, danh mục/khu đang tìm và lịch thuê nếu biết. Nội Khu giữ thứ tự cùng tòa → phân khu → khu, rồi độ khớp query trước tín hiệu cá nhân. Tin tài trợ không vào nhóm đề xuất tự nhiên, có nhãn riêng ở danh sách thường. Giá/cọc chưa được xác nhận không tự bịa; đọc điều kiện cọc ở tin/báo giá.

`epoch` chặn sự kiện đã xóa; `revision` đổi preference, `signal_revision` đổi signal/block; cache key có tài khoản và các phiên bản này. Web/app cập nhật khi focus và polling 15 giây, decay làm mới theo cửa sổ giờ. Không giữ hàng đợi offline để phát lại dữ liệu cũ sau opt-out/reset.

Khôi phục/import một rental đã RETURNED không tự sinh lại sở thích. Chỉ chuyển trạng thái mới từ rental đang được theo dõi mới ghi COMPLETED; review có thời điểm cũ hơn consent/reset bị bỏ qua. Job import phải giữ nguyên timestamp nguồn, không biến dữ liệu lịch sử thành thao tác mới.

- Tắt: xóa raw interests, dừng ghi/sử dụng profile; vẫn tìm và thuê bình thường.
- Xóa lịch sử: xóa raw/derived interests, giữ lựa chọn thủ công và ẩn/chặn rõ ràng.
- Đặt lại: thêm xóa danh mục/ẩn không phải owner; owner block còn tới khi bấm Bỏ chặn thật trong UI.
- Legacy history dùng chung trình duyệt không được import. Hint local là canonical product term, scoped actor/epoch, TTL 30 ngày và xóa khi reset/logout/đổi tài khoản.
- Xóa tài khoản làm sạch dữ liệu tùy chọn và ngắt credentials Calendar. Không xóa chứng cứ/record tài chính cần giữ theo nghiệp vụ cũ.

## Chạy, kiểm tra và rollback

```powershell
npm run test:rental-care
npm run test:rental-care:web
# Terminal khác, chỉ gọi loopback test vừa tạo:
node scripts/verify-rental-care-api.mjs
npm run build
```

URL test: `http://127.0.0.1:4520/account/calendar` và `/account/personalization`. Harness tạo PGlite thật lưu file dưới `output/neighborhood-test/care-*`, dùng HMAC actor giả lập, vô hiệu hóa Supabase/provider ngoài. Không gửi tiền/mail hay gọi Google thật. `runtime.secret.json` chỉ chứa khóa test nhưng vẫn phải giữ private/gitignored, không serve cả thư mục output. Test endpoints 404 trong production.

Giữ flags off tới khi staging/migrations/key/OAuth console được duyệt. Theo dõi stale lease, FAILED/REAUTH/REVIEW, retention và connection provisioning. Muốn dừng thu thập dài hạn hãy tắt account consent trước khi tắt dịch vụ. Dừng worker không xóa alarm OS đã tạo. Rollback không drop mapping/tables hoặc restore đè database đang có đơn; giữ xử lý đơn hiện hữu và khóa giải mã.

Gateway templates hiện tắt access log; duy trì log không query/đã redact cho OAuth callback. Next development bỏ log callback này. Không log OAuth code/token/body/calendar contents.

Kết quả thực tế, ma trận 15 ca và screenshot: `output/rental-care/ACCEPTANCE.md`. Android compile không phải test quyền/OS trên điện thoại. iOS source/plist không phải Xcode/device PASS. Google fake transport không phải OAuth/tạo Calendar thật. Các kiểm chứng đó cần credentials và thiết bị riêng; không suy đoán thành công.
