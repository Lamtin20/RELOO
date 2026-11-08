# RELOO Nội Khu / mobile — bản nâng cấp trải nghiệm 17-10-2026

## Phạm vi và hiện trạng

Đã sửa repository `D:\reloo_project\reloo-app`, kế thừa Next.js 16, React 19, PostgreSQL/Supabase backend và app Capacitor 8 Android/iOS. Không tạo app khác, không thay framework. SSOT v2.0, tài liệu Native App Design, Neighborhood Operations và hướng dẫn Next.js cài trong workspace là căn cứ. iOS project đã tồn tại trước công việc này, bundle `vn.reloo.app`.

**Chưa deploy web, migrate production, cài đè app trên điện thoại cá nhân, archive/ký iOS hay phát hành TestFlight/App Store.** App hiện trỏ `https://reloo.vn`; APK test mới vẫn tải phiên bản web đang được triển khai tại origin đó. Giao diện mới chỉ được kiểm tra trên web test cục bộ; cần rollout web/API/migration ở staging trước khi nghiệm thu app với giao diện mới.

Baseline trước sửa: 17/17 kiểm thử nội khu đạt. Dữ liệu thao tác trong lần này thuộc fixture độc lập, có nhãn TEST; không có thanh toán, email, push hay người dùng thật.

## Mapping màn hình và bảo toàn chức năng

| Trước | Sau |
|---|---|
| `/noi-khu`, tab Tìm đồ | Chỉ tìm và thuê: khu, tìm kiếm, chip danh mục, thời gian, bộ lọc, card và sheet xác nhận |
| tab orders / `?order=…` | `/dashboard/orders/neighborhood?order=…`, có lối vào trong Đơn thuê chung |
| tab owner | `/dashboard/assets/neighborhood`, liên kết từ Tài sản của tôi và luồng đăng tin chung |
| tab residency | `/dashboard/profile/residency`; khai báo nơi ở cũng nằm trong thông tin Cá nhân |
| tab needs / `?need=…` | `/needs/neighborhood`, giữ nhu cầu, đề xuất và quy trình đặt thuê thật |
| tab notifications | `/notifications/neighborhood`, có lối vào trong thông báo chung |
| Tin nhắn | Giữ `/dashboard/messages`, không tạo hộp thư nội khu trùng lặp |
| Đánh giá / tranh chấp | Giữ bên trong chi tiết đơn và hồ sơ hỗ trợ tương ứng |

Các URL cũ redirect server-side; thông báo mới dùng đường dẫn mới. Bộ lọc đã áp dụng được lưu trong URL, không dùng dữ liệu cư trú để âm thầm đổi khu đang xem. Các công cụ riêng nội khu được tái sử dụng trong workspace con của công cụ chung; chưa hợp nhất hai loại đơn vào cùng một truy vấn DB hay tự chuyển dữ liệu đơn cũ.

## Tìm đồ và thuê nhanh

- Header gọn, ảnh 4:3, tên giới hạn dòng, giá/đơn vị, cọc, lịch kiểm tra theo ngày đã chọn, đánh giá có giao dịch và phạm vi từ dữ liệu thật. Ảnh lỗi có placeholder; không dùng đánh giá/khoảng cách/địa chỉ căn hộ giả.
- Không tự điền ngày thuê. Tìm kiếm vẫn hoạt động khi chưa có ngày; lúc nhấn Thuê, ngày còn thiếu được nhập trong cùng sheet trước khi lấy quote.
- Khi đã đăng nhập, đủ điều kiện và đã chọn lịch: **Thuê → Gửi yêu cầu thuê / Xác nhận thuê**. Nút xác nhận nêu rõ việc đồng ý điều kiện đang hiển thị; không có checkbox/nút nháp bắt buộc tạo thêm bước. Lưu nháp vẫn có trong phần chi tiết tùy chọn.
- Sheet hiển thị chủ đồ, thời gian, cách giao nhận, tiền thuê, phí, cọc, tổng hiện tại và chính sách. Địa chỉ giao nhận chi tiết tiếp tục chỉ chia sẻ sau xác nhận theo chính sách cũ; không công khai trước để làm giao diện đẹp hơn.
- `instant` và tên công khai của chủ đồ lấy từ backend qua `reloo_neighborhood_quote_context`. Đặt ngay vẫn có thể **PENDING_PAYMENT**; yêu cầu duyệt là **PENDING_OWNER**, không gọi là đã thuê/thanh toán thành công.
- Sửa lịch hoặc ưu đãi phải lấy quote mới. Version/giá/lịch, quyền, yêu cầu xác minh, hold và idempotency vẫn do backend quyết định. Nhấn lặp được khóa ngay bằng ref; server vẫn là lớp chống trùng thật. Sau commit chuyển thẳng tới đơn, không chờ tải lại mọi danh sách.
- Lựa chọn công khai được giữ trong URL để tiếp tục sau đăng nhập; xác minh/hồ sơ chưa đạt có lối tới bước bổ sung. Không bỏ qua account/KYC/residency gate. Các provider KYC/thanh toán thật chưa có trong môi trường test không được coi là đã nghiệm thu.

## Nơi đang sống và dữ liệu địa điểm

`nk_home_preferences` lưu YES / NO / LATER, khu, tòa, tòa đang chờ chuẩn hóa và lựa chọn công khai tòa. RPC `reloo_home_preference` kiểm tra actor, quan hệ khu–tòa, idempotency và quota. Khi rời/xóa nơi ở, membership liên quan bị thu hồi, không xóa bằng chứng hay sửa điểm giao nhận của đơn đang chạy. Tự khai báo mới chỉ SELECTED; nếu thay thông tin có ảnh hưởng thì cần xác minh lại. Không khôi phục xác minh chỉ vì chọn lại khu.

GPS được giải thích trước, chỉ gọi một lần theo thao tác người dùng. Adapter dùng CoreLocation foreground ở iOS, geolocation trình duyệt ở web/Android. Sai số trên 500 m được báo để thử lại/tìm thủ công. Bán kính điểm tối đa 5 km; polygon hiện chỉ có thể nhận biết ở trong ranh giới đã lưu, không hứa tìm đủ mọi polygon lân cận. Không tự nới bán kính, tự chọn khu, theo dõi nền hoặc gửi tọa độ vào hồ sơ/analytics. Từ chối GPS không chặn tìm thủ công.

Tận dụng danh mục/nguồn đã duyệt hiện có; không bổ sung dịch vụ bản đồ trả phí hay scrape cư dân. Tên tòa chưa có tạo bản ghi PENDING dưới nguồn đóng góp có kiểm duyệt, quản trị xử lý bằng công cụ địa điểm hiện có. Chưa có bảo đảm bao phủ mọi chung cư Việt Nam hoặc provider mới được cấp quyền. Không nhập số căn hộ. Việc chọn khu đã có dữ liệu và việc cư trú đã xác minh là hai trạng thái khác nhau.

## Loading, accessibility và đo lường

- `RelooLoading`: SVG/CSS vòng Reuse + Loop với vật phẩm nối hai điểm, không tạo logo/linh vật mới, không GIF hoặc phần trăm tiến trình giả. Dùng cho route loading, list loading, dashboard guard và nút xử lý; reduced motion có trạng thái tĩnh.
- Skeleton theo tỉ lệ ảnh/card. Modal HTML có focus/Escape, khóa cuộn nền chỉ khi mở và bám visual viewport khi bàn phím thay đổi. Nút chính giữ kích thước, touch target tối thiểu 44 px trong phần nâng cấp; có safe area và lỗi/thử lại.
- Nội dung mới có vi-VN/en-US; route tìm đồ/workspace chọn theo tham số ngôn ngữ hoặc Accept-Language, fallback vi-VN. Các phần hồ sơ/thanh toán chung cũ chưa được viết lại toàn bộ ngôn ngữ trong lần này.
- Collector first-party hiện có được tái sử dụng, chỉ khi consent analytics bật và không DNT/GPC. Impression chỉ sau thấy ít nhất 60% card trong 1 giây, chống đếm lặp khi render trong cùng lần vào trang. Click mở thuê và chuyển đổi **gửi yêu cầu được server xác nhận** tách riêng; không coi là conversion thanh toán. Không gửi GPS, khu sống, user/order ID, giá hoặc nội dung tìm kiếm trong event mới. Các số client funnel không dùng cho quyết định tài chính hay chống gian lận.

## Mobile và iOS

- Giữ Android/iOS project và xác thực/camera/chia sẻ/mạng/lịch hiện có; không chuyển secret vào web bundle. Deep link `reloo://neighborhood`, `reloo://rental/{id}` được kiểm tra allowlist và vẫn phải qua quyền API. Android manifest cập nhật host; iOS URL scheme hiện có giữ nguyên.
- Thêm plugin iOS foreground CoreLocation một lần, có timeout, chống yêu cầu trùng, hủy khi app vào nền; không thêm background location. Mô tả quyền có vi/en. Native Dynamic Type điều chỉnh `WKWebView.pageZoom`; cần nghiệm thu bằng Xcode/iPhone thực tế.
- Tắt WebView debugging ở cấu hình đóng gói; bỏ thời gian splash cố định để không chờ hiệu ứng. Icon/splash hiện hữu của RELOO giữ nguyên. Calendar native/Keychain hiện có được bảo toàn; không tuyên bố APNs đã cấu hình.
- Privacy manifest được đưa vào Resources, khai báo required-reason UserDefaults CA92.1 cho dữ liệu chỉ thuộc app. Đây **không phải** kết luận toàn bộ App Privacy/App Store questionnaire đã hoàn tất. Cần kiểm tra privacy report từ archive, SDK và thực tế backend trước nộp.
- Workflow `.github/workflows/ios-simulator.yml` chạy thủ công trên macOS, build simulator **không ký/không upload store**. Chưa chạy workflow trong phiên này.
- App giữ bộ lọc tìm nội khu khi vào nền và có bộ nhớ chức năng theo tài khoản, TTL 24 giờ, để khôi phục khi mở app lại. Không khôi phục đè link mở app/OAuth/onboarding; xóa khi đăng xuất/đổi tài khoản. Source native cold restart này chưa kiểm thử trên thiết bị thật.
- Universal Links chưa kích hoạt: cần Apple Team ID thật, Associated Domains trong provisioning và AASA đã phục vụ trên domain. `RELOO_IOS_TEAM_ID=… node scripts/prepare-ios-links.mjs` chỉ sinh artifact để review; không publish hoặc giả Team ID.
- `mobile/ios/RelooLinks.entitlements.example.plist` là mẫu chưa gắn vào target. Chỉ gắn sau khi App ID/provisioning và file AASA khớp; không coi custom scheme là Universal Links đã xác minh.

Nguồn chính thức đã kiểm tra HTTP 200 ngày 17-10-2026: [Apple privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files), [required API reasons](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons), [WKWebView pageZoom](https://developer.apple.com/documentation/webkit/wkwebview/pagezoom), [Capacitor iOS](https://capacitorjs.com/docs/ios). Snapshot tham chiếu tại `output/ios-upgrade/`; không coi HTTP 200 là đã compile Swift.

## Kiểm thử thực tế và giới hạn

- Baseline: 17/17. Sau sửa: 24/24 kiểm thử nội khu, safety, preference/routing/i18n và security-hardening, gồm SQL thật trong embedded PGlite. Không gọi đó là PostgreSQL production hay test provider thật.
- Browser: 8 nhóm luồng chính, 9 nhóm trạng thái và 4 nhóm edge/analytics đạt. Chọn lịch → Thuê → Gửi yêu cầu tạo đúng một đơn PENDING_OWNER, tổng test 145.000đ. Các kích thước 320/375/390/430/768/1440 và landscape đã kiểm tra overflow; ảnh desktop/mobile/sheet/loading/offline/profile được chụp và xem trực tiếp.
- Dashboard Auth shell trong browser test được intercept để vào layout; API nội khu vẫn dùng signed test session và cơ sở dữ liệu test thật. GPS là browser emulation; lỗi mạng/analytics/ảnh và dữ liệu cực trị được đánh dấu fixture/interception. Chưa kiểm tra end-to-end Supabase Auth/provider trong staging.
- Android: `assembleDebug` thành công, artifact riêng ở `output/ios-upgrade/RELOO-Android-neighborhood-test.apk`. Chưa cài/kiểm tra APK mới trên điện thoại thật; app dùng origin remote nên không tuyên bố đã hiển thị UI mới trên điện thoại.
- iOS: Capacitor sync, PBX/resource và plist parse đạt. **Chưa compile Swift, chạy simulator/iPhone, kiểm tra bàn phím/quyền thật, archive, ký hoặc phát hành**, vì môi trường Windows không có Xcode. Cần Mac/Xcode, Team/provisioning và tài khoản phát hành phù hợp; không gửi mật khẩu vào hội thoại.

## Chạy và rollout

1. `node --test tests/neighborhood.test.mjs tests/neighborhood-safety.test.mjs tests/neighborhood-experience.test.mjs tests/security-hardening.test.mjs`; scoped ESLint; `npm run build`.
2. `npm run test:neighborhood:web` tạo dữ liệu test độc lập ở localhost:4518; không dùng tài khoản/thanh toán thật.
3. Staging được phê duyệt: backup, áp `deploy/vietnam/neighborhood-experience.sql` sau các migration nội khu hiện có, rồi `security-lockdown.sql`. Nếu cần báo cáo traffic gồm Nội Khu, áp lại bản bổ sung `news-measurement.sql` theo trình tự hiện hữu. Không thay phí/cọc/policy.
4. Deploy web/API staging, cấu hình origin app staging theo quy trình dự án, `cd mobile; npm ci; npx cap sync`. Trên Mac mở project hiện có hoặc chạy workflow simulator. Nghiệm thu đủ trạng thái/native permission/calendar/auth/deep link trước archive ký.
5. Chỉ phát hành hoặc đổi cấu hình production sau khi có quyền riêng. Rollback code UI/routes theo bản trước nhưng giữ migration additive, receipts và dữ liệu người dùng; không drop dữ liệu nơi ở hoặc đơn.

Tài liệu cũ về state machine, privacy, source licensing và policy vẫn hiệu lực: `NEIGHBORHOOD_OPERATIONS.md`, `RENTAL_CARE_OPERATIONS.md`.
