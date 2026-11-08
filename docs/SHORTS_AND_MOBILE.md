# RELOO Shorts, yêu cầu chi trả và app thử nghiệm

## Video ngắn

`/shorts` hiển thị video dọc đã xử lý và đạt điều kiện hệ thống. Người xem vuốt từng clip, chạm thẻ sản phẩm để mở danh sách sản phẩm RELOO. Gắn liên kết ngoài đang tạm ngừng ở giao diện và API; dữ liệu liên kết cũ được giữ nhưng không hiển thị trong giỏ sản phẩm.

`/dashboard/shorts/new`: chọn/quay video → xem lại → thêm mô tả, chọn sản phẩm và Đăng. MP4/MOV/WebM, 2–180 giây, tối đa 80 MB; gắn tối đa 5 sản phẩm của người đăng còn khả dụng, hoặc đăng clip thông thường không gắn sản phẩm. Có tìm kiếm sản phẩm và tiến độ tải lên thực tế. Sau khi tải và lưu bản ghi, người đăng có thể rời trang; xử lý/kiểm tra tự động tiếp tục ở nền. Ô quyền sử dụng của Reloo được chọn sẵn, có thể bỏ chọn; khi bỏ chọn không thể đăng.

HLS v3 tạo trực tiếp từ file gốc, tránh hai lần nén: H.264 High/AAC 30fps, keyframe mỗi 2 giây, mức 360p/720p/1080p theo nguồn, không phóng to nguồn nhỏ. CRF 23/20/19, giới hạn bitrate 1,1/4,5/7,5 Mbps. HDR PQ/HLG chuyển về SDR BT.709. Giữ file gốc .source trên server, API không cho đọc file này; MP4 dự phòng liên kết cứng với mức cao nhất. Gói v3 dùng hls-v3, giữ hls v2 để phiên cũ còn phát được. Clip cũ đã mất nguồn chỉ giữ nguyên mức cao nhất hiện có; không thể phục hồi chi tiết đã nén mất. Job SHORT_PACKAGE nâng cấp gói, giữ trạng thái clip. Worker giới hạn 1,5 CPU/1,5 GB, FFmpeg 2 thread, ưu tiên thấp.

Tự duyệt: reloo_auto_publish_short khóa bản ghi, kiểm tra media READY/HLS, quyền hoạt động tài khoản (danh sách đen/rủi ro), hạn căn cước, sản phẩm đúng chủ/còn khả dụng/không bị khóa và mô tả hợp lệ. Đạt điều kiện → PUBLISHED, ghi SHORT_AUTO_PUBLISHED; chưa đạt → PENDING với lý do; lỗi media → REJECTED. Trigger xử lý cả hai thứ tự upload/create; kiểm tra lại mỗi phút khi điều kiện thay đổi. Bản nháp, đã ẩn, từ chối không tự đăng lại. Đây là các quy tắc nghiệp vụ hiện có; chưa có mô hình phân loại hình ảnh/âm thanh nhạy cảm hoặc dịch vụ xác minh bản quyền. CRM vẫn xử lý báo cáo, ẩn/từ chối nội dung.

Player dùng hls.js khi hỗ trợ MSE, HLS native/MP4 dự phòng trên thiết bị khác. Chọn chất lượng đầu theo mạng/đo băng thông và màn hình thay vì cố định 360p; có Tự động, HD/Full HD theo nguồn. Tự giảm mức khi mạng yếu hoặc thiết bị rớt khung hình. Chỉ dựng một cửa sổ nhỏ của danh sách, tối đa bốn player gần vị trí xem (mạng chậm/tiết kiệm dữ liệu: ba); tải trước khoảng 2 giây của clip kế tiếp, giữ 6–10 giây cho clip đang xem. Player ở xa bị hủy; tạm dừng khi trang ẩn hoặc mở bảng sản phẩm/báo cáo. Phân trang được tải trước, không chờ vuốt hết mới tải metadata. Bộ nhớ và lưu lượng đều có giới hạn; kết nối mất mạng hoặc thiết bị quá yếu vẫn có thể gây gián đoạn.

Manifest, ảnh và từng range đều qua kiểm tra quyền; ticket public ký HMAC có hạn 15 phút không cho đọc video riêng hoặc đã bị ẩn. Phát riêng chỉ dành cho người đăng, hoặc nhân viên có `content.read` đã xác thực CRM bằng Google Authenticator. Cache private 60 giây chỉ cho ticket video công khai; nguồn riêng không lưu cache.

Thống kê riêng tại `/dashboard/shorts`, và mục **Video của tôi & thống kê** trong trang cá nhân: xem 7/30/90 ngày, từng video, lượt xem, hiển thị video/thẻ sản phẩm, mở giỏ, nhấp sản phẩm và tỷ lệ phiên có nhấp. Lượt xem đủ 2 giây thực sự phát khi clip nằm trên màn hình. Tải trước và xem của chính tác giả không tính. Hiển thị thẻ sản phẩm là mức tiếp cận, không phải số quảng cáo trả phí. Sự kiện dùng ticket ngẫu nhiên riêng cho mỗi clip/phiên truy cập, không lưu IP/email/tài khoản người xem hoặc cookie theo dõi. Retry và vòng lặp cùng phiên được khử trùng; click tính tối đa một lần/sản phẩm/phiên. Chỉ người sở hữu xem được báo cáo của mình.

`/dashboard/shorts`: bản nháp, chờ duyệt, đã đăng, từ chối và đã ẩn. CRM → Video ngắn & sản phẩm: duyệt, từ chối hoặc ẩn nội dung bị báo cáo. Người xem có thể báo cáo và chặn người đăng. Stream video kiểm tra quyền trước mỗi lần xem/seek; bản nháp và nội dung chưa duyệt chỉ chủ sở hữu/người có quyền `content.read` xem được.

Tham khảo cơ chế video gắn sản phẩm tại các cổng chính thức [TikTok Shop Academy](https://seller-us.tiktok.com/university/home) và [Shopee Uni](https://seller.shopee.vn/edu/home). Tính năng RELOO vận hành trên RELOO; không gọi API đăng video vào TikTok/Shopee.

## Dòng tiền và yêu cầu rút

Tên hiển thị là **Dòng tiền của bạn**. Đây là theo dõi khoản đã đối soát và khoản được phê duyệt chi trả; không có chức năng nạp tiền hoặc phát hành ví điện tử.

CRM → Đối soát & hóa đơn → Yêu cầu rút tiền: phê duyệt khoản được chi trả dựa trên giao dịch ngân hàng thật, đúng khách hàng, có chữ ký xác minh và còn phần chưa phân bổ. Ký quỹ không được dùng làm nguồn rút tiền. Cashback cần có khoản đã được xác nhận và tiền thực đã được đối soát về ngân hàng.

Khách chọn nguồn, ngân hàng và số tiền; cần căn cước đã duyệt/còn hạn, ngân hàng đã khai báo khớp tên, tài khoản không bị hạn chế. PostgreSQL giữ khoản đã yêu cầu trong cùng giao dịch và khóa theo khách hàng, kiểm tra tổng nguồn tiền thực để chống yêu cầu trùng/vượt khoản được chi trả. Yêu cầu trùng khóa trả lại cùng bản ghi. Có thể hủy khi còn Chờ duyệt.

Trạng thái: Chờ duyệt → Đã duyệt → Đang chuyển → Đã chuyển. Admin có thể từ chối trước Đang chuyển. Khi duyệt/bắt đầu chuyển, hệ thống kiểm tra lại điều kiện và nguồn tiền; khi ghi Đã chuyển cần chứng từ SePay OUT đúng khách hàng/số tiền và xác nhận đã đối chiếu tài khoản nhận. Một khoản chi chỉ đối soát cho một lần rút. Xem tài khoản nhận đầy đủ cần `accounting.write` và ghi nhật ký người xem/lý do. Bản ghi cuối và lịch sử xử lý không sửa/xóa.

**Giai đoạn thử nghiệm:** hệ thống tạo/quản lý yêu cầu và đối soát. Chuyển tiền thực hiện tại ngân hàng; không có lệnh tự động chuyển tiền qua SePay. Khoản khả dụng ban đầu là 0 cho đến khi có dữ liệu thật được phê duyệt chi trả.

## App Android/iOS

Dự án Capacitor 8 tại `mobile/`, mã ứng dụng `vn.reloo.app`. App dùng HTTPS `https://reloo.vn`, có camera, quay video, chia sẻ hệ thống, nút Back, thông báo mất mạng, biểu tượng RELOO và đăng nhập Google bằng trình duyệt hệ thống.

Luồng đăng nhập native dùng mã phiên một lần, ràng buộc SHA-256 với bí mật trên app, hiệu lực 5 phút. Access/refresh token lưu mã hóa trong DB Việt Nam, không nằm trong deep link. API exchange đặt session cookie của RELOO, xóa dữ liệu phiên trung gian khi dùng. Không nhúng khóa SePay, khóa dịch vụ hoặc tài khoản khách hàng vào binary.

Android (Windows): `powershell -NoProfile -File scripts/setup-mobile-tools.ps1`, `cd mobile; npm ci; npx cap sync`, trở về gốc chạy `node scripts/prepare-mobile-assets.mjs` và `powershell -NoProfile -File scripts/build-android.ps1`. APK thử nghiệm: `output/mobile/RELOO-Android-test.apk`. Dùng APK này để thử nghiệm nội bộ; ký phát hành/App Bundle cần khóa ký riêng.

iOS: trên máy Mac chạy `cd mobile; npm ci; npx cap sync ios`, mở `mobile/ios/App/App.xcodeproj`, chọn Apple Team, build simulator hoặc iPhone. Capacitor 8 yêu cầu macOS/Xcode 26; không thể build/kiểm thử iOS bằng Xcode trên máy Windows hiện tại. [Yêu cầu môi trường chính thức](https://capacitorjs.com/docs/getting-started/environment-setup). Chưa phát hành App Store/Google Play trong giai đoạn thử nghiệm.

Migrations bổ sung: `payout-requests.sql`, `short-videos.sql`, `mobile-auth.sql`, sau đó `shorts-experience.sql`, `shorts-quality-auto.sql`. Build lại app/worker (cả hai có FFmpeg), cập nhật edge và mount public-media cho worker. Kiểm tra: `node --test tests/shorts-experience.test.mjs tests/new-features-schema.test.mjs tests/shorts-validation.test.mjs tests/wallet-model.test.mjs tests/wallet-schema.test.mjs tests/finance.test.mjs tests/finance-schema.test.mjs`.

Tài liệu streaming: [hls.js API](https://github.com/video-dev/hls.js/blob/master/docs/API.md), [FFmpeg HLS](https://ffmpeg.org/ffmpeg-formats.html#hls).

Tham khảo chính thức về định dạng TikTok: https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide/ . Tài liệu công khai không tiết lộ thuật toán ABR nội bộ của TikTok; RELOO sử dụng HLS/hls.js và FFmpeg, không tuyên bố sao chép thuật toán riêng của họ.


## Import và app Android

Luồng import Android mở bộ chọn video hệ thống, đọc video từ URI tạm vào cache riêng của ứng dụng và giữ nút gắn sản phẩm RELOO. Bước xem lại toàn màn hình có cắt đoạn, tắt tiếng và chọn ảnh bìa; sau đó chuyển sang mô tả, gắn sản phẩm và đăng. CCCD/chân dung dùng camera gốc Android dự phòng trên thiết bị WebView không khởi động camera, không có nút chọn ảnh thư viện.

`/shorts` mobile là vùng toàn màn hình theo chiều dọc, dùng scroll snap, một player phát và tối đa sáu thẻ gần vị trí xem. ABR chọn chất lượng theo mạng; clip kế tiếp được làm ấm có giới hạn, clip xa giải phóng. Nút chọn chất lượng thủ công không hiển thị trong trình phát.
