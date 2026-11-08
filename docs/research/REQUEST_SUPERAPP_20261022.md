RELOO — MASTER PROMPT XÂY DỰNG SUPER APP
Phiên bản đề xuất 1.0 • 22/10/2026 • Dành cho AI coding agent trong VS Code.

Cách dùng: mở đúng repository RELOO Real, gửi toàn bộ tài liệu này cho AI. Đây là yêu cầu xây dựng và kiểm chứng theo giai đoạn, không phải tuyên bố hệ thống đã có các tính năng bên dưới. Không áp dụng vào repository RELOO World/Unreal Engine. Không có prompt nào tự bảo đảm miễn vi phạm pháp luật hoặc tránh mọi hình thức xử phạt.
BẮT ĐẦU PROMPT
Bạn là kiến trúc sư sản phẩm, UX/UI designer, full-stack engineer và QA phụ trách phát triển RELOO Real. Hãy làm việc trực tiếp trên repository hiện có, nghiên cứu, viết đặc tả, triển khai, chạy thử và sửa lỗi đến khi hoàn thành phạm vi từng giai đoạn. Không chỉ dựng màn hình mẫu rồi báo hoàn tất.
1. Tầm nhìn và giới hạn
Biến RELOO thành nền tảng “Thuê những gì bạn cần — Tìm những gì bạn muốn”, gồm trang chủ tổng hợp và bốn mini app:
Mini app	Nhu cầu	Tham chiếu trải nghiệm
Đặt phòng & Chỗ ở	Phòng theo giờ, qua đêm, theo ngày; nhánh thuê nhà dài hạn riêng	Go2Joy cho đặt phòng ngắn hạn
Việc làm linh hoạt	Tìm người làm, tìm việc theo ca/giờ, Part-time, Full-time	Small Jobs
Thuê đồ dùng	Tìm và thuê đồ cá nhân, gia đình, công việc, sự kiện	Mioto về tìm kiếm, lịch thuê, niềm tin và giao nhận
Đồ cũ	Đăng bán, tìm mua, trò chuyện, trả giá	Chợ Tốt về mô hình rao vặt


Học quy ước quen thuộc và nguyên lý giảm thao tác. Dùng thương hiệu RELOO, không sao chép logo, ảnh, nội dung, mã nguồn hoặc toàn bộ nhận diện đối thủ. Không suy diễn chính sách RELOO từ chính sách của nền tảng tham chiếu. Không đưa bảo hiểm thuê xe của Mioto sang đồ dùng nếu chưa có hợp đồng bảo hiểm tương ứng.

Không tự mở rộng sang NFT, game, ví lưu trữ tiền, cho vay hoặc dịch vụ tài chính khác. Thiết kế hỗ trợ mở rộng nhưng không triển khai microservices/microfrontends chỉ vì tên gọi “super app”. Ưu tiên kiến trúc module phù hợp repository và đội vận hành.
2. Khảo sát trước khi sửa
1. Đọc AGENTS.md, README, kiến trúc, migration, biến môi trường mẫu, test, CI/CD và rule hiện có. Tìm RELOO_Master_Specification_v1.0.md; nếu có thì đọc phần RELOO Real và lập bảng xung đột. Không bịa nội dung nếu không có file.
2. Kiểm kê tính năng theo trạng thái: đã chạy thật / mới có UI / mock / chưa có / lỗi. Chỉ rõ file, route, API và bằng chứng.
3. Xác định stack, auth, database, storage, payment, thông báo, hosting, mobile framework và quyền truy cập hạ tầng. Không yêu cầu thay stack trước khi có lý do cụ thể.
4. Nghiên cứu nguồn chính thức Go2Joy, Small Jobs, Mioto, Chợ Tốt. Ghi URL, ngày truy cập, phiên bản app nếu quan sát được, ảnh chụp và luồng đã kiểm tra. Ghi riêng “quan sát trực tiếp”, “đọc chính sách”, “đề xuất RELOO”, “chưa xác minh”.
5. Khi được cung cấp thiết bị Samsung và công cụ điều khiển hợp lệ, khảo sát app đã cài trong phạm vi cho phép. Không tự mua hàng, đặt phòng mất phí, gửi hồ sơ thật hoặc liên hệ đối tác để khảo sát. Không vượt đăng nhập hay lấy dữ liệu ngoài quyền truy cập.
6. Không có công cụ/thiết bị thì tiếp tục từ nguồn công khai, ghi khoảng trống và dựng đề xuất có nhãn; không nhận đã khám phá tất cả màn hình.
Tạo docs/research/REFERENCE_MATRIX.md: nền tảng → màn hình/luồng → bằng chứng → vấn đề giải quyết → cách RELOO vận dụng → khác biệt → điều chưa biết.
3. Bộ rule và tài liệu phải duy trì
Tạo hoặc hợp nhất vào hệ thống tài liệu sẵn có; tránh hai nguồn quy tắc trái nhau:
- docs/RELOO_PRODUCT_SPEC.md: phạm vi, vai trò, sitemap, hành trình, nghiệp vụ.
- docs/RELOO_DESIGN_SYSTEM.md: token, component, nội dung và responsive.
- docs/RELOO_BUSINESS_RULES.md: rule có ID và phiên bản.
- docs/RELOO_STATE_MACHINES.md: trạng thái, chuyển trạng thái, tác nhân, điều kiện và ngoại lệ.
- docs/RELOO_DATA_API.md: mô hình dữ liệu, API, authorization và integration.
- docs/RELOO_COMPLIANCE_REGISTER.md: đối chiếu pháp lý và phần chưa được xác minh.
- docs/RELOO_TEST_MATRIX.md: hành trình và test gắn với rule.
- docs/RELOO_STAGING_RUNBOOK.md: triển khai, test, khôi phục và xử lý sự cố.
- docs/RELOO_CHANGELOG.md và docs/RELOO_PROGRESS.md: trạng thái thực, quyết định và việc tiếp theo.
Mỗi rule có: ID, phạm vi, mô tả, tiền điều kiện, đầu vào, kết quả, ngoại lệ, vai trò được phép, nguồn, ngày xác minh, chủ sở hữu, test liên quan. Tách RULE nội bộ khỏi nghĩa vụ pháp luật. Phí, thời hạn, hạn mức, tỷ lệ phạt và SLA chưa chốt phải là cấu hình có nhãn PROPOSED, không ngụy tạo thành quy định đã duyệt.

Mỗi lần cập nhật: đọc AGENTS.md + mục lục rule; đọc đầy đủ rule liên quan và các phụ thuộc; lập bảng tác động; cập nhật đặc tả/test/changelog cùng code; chạy hồi quy theo tác động. Thiết lập kiểm tra CI cho tài liệu/rule và test bắt buộc. Không chỉ dựa vào trí nhớ của AI hoặc một checklist đánh dấu thủ công.
4. Kiến trúc trải nghiệm chung
Một tài khoản có thể vừa thuê, mua, bán, cho thuê và tuyển dụng/tìm việc. Dùng hồ sơ chung tối thiểu; khai bổ sung đúng lúc phát sinh nhu cầu. Đối tác doanh nghiệp có thành viên, chi nhánh và quyền riêng. Chuyển vai trò rõ ràng, không trộn quyền bằng cách đổi giao diện.

Chia module domain; dùng chung identity, địa chỉ, chat, notification, media, moderation, dispute và payment integration nhưng giữ riêng lịch/tồn kho và state machine từng ngành. Trung tâm “Giao dịch” tổng hợp đặt phòng, thuê đồ, mua bán và công việc bằng tab/lọc; không ép tất cả thành một kiểu đơn hàng. Không làm giỏ hàng thanh toán chéo bốn ngành ở giai đoạn đầu.

Điều hướng mobile đề xuất: Trang chủ / Khám phá / Đăng tin / Giao dịch / Tài khoản. Tin nhắn và thông báo có điểm truy cập rõ trên thanh đầu trang. Mini app có tên, bộ lọc và lối về RELOO; nút Back trở về đúng vị trí cuộn. Desktop dùng không gian rộng cho lọc và quản lý. Deep link mở đúng mini app/chi tiết, giữ ngữ cảnh sau đăng nhập và hỗ trợ fallback web.

Hỗ trợ vi-VN và en-US qua i18n, mặc định theo thiết bị và cho đổi. Tiền VND, ngày giờ rõ, lịch nghiệp vụ Asia/Ho_Chi_Minh; lưu thời điểm theo UTC, kiểm tra hiển thị đúng múi giờ. Không nhúng text cố định rải rác trong component.
5. Trang chủ tổng hợp có thể cuộn liên tục
Trang chủ thể hiện cả bốn dịch vụ ngay vùng đầu, không để người dùng tưởng RELOO chỉ có một ngành. Bố cục đề xuất:
1. Địa điểm đang xem, ô “Bạn đang cần gì?”, tin nhắn/thông báo.
2. Bốn lối vào mini app với icon và tên dễ hiểu.
3. Đơn đang diễn ra/việc cần làm tiếp nếu có; không chiếm diện tích khi rỗng.
4. Gần bạn và Trong nội khu.
5. Phòng phù hợp thời gian bạn chọn.
6. Đồ dùng có thể thuê gần đây.
7. Việc làm linh hoạt theo vị trí/thời gian.
8. Đồ cũ đáng xem và các bộ sưu tập có lý do rõ.
9. Feed khám phá tiếp bằng phân trang cursor; cấu trúc có thể cấu hình qua CMS an toàn.
Tìm kiếm tổng hợp nhận diện ý định, cho chọn ngành khi mơ hồ; kết quả gom nhóm theo ngành. Không trộn giá thuê theo giờ, giá bán và lương vào cùng một thứ tự giá thiếu ý nghĩa.

Cuộn liên tục phải có khử trùng lặp, xử lý hết dữ liệu, retry, giữ vị trí khi quay lại, lazy-load ảnh và virtualization khi cần. Web cần URL phân trang/canonical và lối truy cập nội dung/footer; hỗ trợ “Xem thêm” cho bàn phím và trình đọc màn hình. Không tạo feed giả vô tận. Bài tài trợ phải có nhãn; giải thích được lý do gợi ý, không cá nhân hóa bằng dữ liệu nhạy cảm ngoài mục đích đã thông báo.

Card dùng cấu trúc chung nhưng trường chính riêng: phòng = thời gian/giá tổng; đồ thuê = đơn vị thời gian/cọc; việc = ca/lương/địa điểm; đồ cũ = giá bán/tình trạng/cho phép trả giá. Không hiển thị đánh giá, lượt thuê hoặc nhãn xác minh giả.
6. Thiết kế tinh gọn, quen thuộc và dễ dùng cho chủ nhà
Dùng phong cách RELOO xanh thiên nhiên, nền sáng, chữ dễ đọc, ảnh thật, khoảng trắng thoáng. Xây token màu, spacing, typography, radius, elevation và motion. Không đổi tên cùng một thao tác giữa mini app. Mỗi màn hình có một hành động chính; không lạm dụng banner, popup và hiệu ứng.

Mọi màn hình phải có trạng thái loading/skeleton, empty, lỗi có hướng xử lý, mất mạng, thiếu quyền, dữ liệu cũ và thành công. CTA đang xử lý phải chống gửi trùng. Nội dung validation đặt ngay tại trường, giữ thông tin đã nhập. Tối thiểu vùng chạm mục tiêu 44×44 CSS px theo thiết kế, kiểm tra keyboard, focus, tương phản và screen reader; mục tiêu WCAG 2.2 AA.

Animation loading theo vòng lặp RELOO phải nhẹ, có reduced-motion; không chặn nhập liệu hoặc kéo dài tải giả. Form chia nhóm dễ hiểu, có lưu nháp và preview. Không hỏi lại dữ liệu đã có nhưng cho sửa và xác nhận khi ảnh hưởng giao dịch.

Chủ nhà có bảng “Hôm nay”: phòng trống, khách sắp đến, khách sắp đi, yêu cầu cần xác nhận, doanh thu và đối soát. Lối thao tác nhanh: thêm chỗ ở / thêm loại phòng / mở hoặc chặn lịch / cập nhật giá / xem đơn. Form khai báo từng bước với ví dụ ảnh, giải thích ngắn, nháp tự lưu, xem trước và lý do không được xuất bản. Quản lý nhiều chỗ ở, nhiều phòng, nhân viên và chi nhánh theo quyền. Không bắt chủ nhà hiểu thuật ngữ kỹ thuật.

Mục tiêu 1–2 thao tác áp dụng từ lúc đã chọn đủ món/phòng, thời gian và có hồ sơ hợp lệ: chọn → kiểm tra tóm tắt và xác nhận. Không che phí, bỏ đồng ý cần thiết hoặc bỏ xác thực để đạt KPI. Đo riêng người mới, người quay lại và đối tác.
7. Mini app Đặt phòng & Chỗ ở
Trang đầu theo quy ước đặt phòng quen thuộc: khu vực, thời gian, tab Theo giờ / Qua đêm / Theo ngày, ưu đãi có điều kiện, gần bạn, bản đồ và danh sách. Bám trải nghiệm Go2Joy đã quan sát; dùng bộ thiết kế RELOO.

Luồng khách: tìm → lọc → chi tiết chỗ ở → chọn loại phòng/gói/thời gian → giá cuối và điều kiện → thông tin khách tối thiểu → thanh toán hoặc trả tại chỗ nếu được hỗ trợ → xác nhận → hướng dẫn đến nơi → check-in → check-out → đánh giá/khiếu nại.

Chi tiết có ảnh, tiện ích, sức chứa, vị trí, giờ nhận/trả, phí phát sinh, điều kiện tuổi/giấy tờ phù hợp, chính sách hủy/no-show/hoàn tiền, thông tin đối tác và hỗ trợ. Hiển thị giá tổng của thời gian đã chọn; giá “từ” phải nêu điều kiện.

Khai báo đối tác: loại hình → địa chỉ/bản đồ → quyền khai thác và giấy tờ theo mô hình pháp lý → loại phòng/số lượng → ảnh/tiện ích → gói giờ/đêm/ngày → khoảng đệm vệ sinh → giá/phụ thu → hủy/hoàn → nhận tiền → kiểm duyệt → xuất bản. Cho sao chép loại phòng và cập nhật hàng loạt có preview.

Phải thiết kế tồn kho theo phòng cụ thể hoặc loại phòng và số lượng; khoảng thời gian [bắt đầu, kết thúc), giờ qua ngày và buffer. Hold có TTL, xác nhận nguyên tử, không overbooking khi hai người đặt đồng thời. Booking cần xác nhận của chủ nhà khác với instant booking; không hiển thị “đã xác nhận” khi mới gửi yêu cầu.

State machine tối thiểu: draft → held → pending_payment/pending_host theo chính sách → confirmed → checked_in → completed; nhánh expired, rejected, cancelled, no_show và disputed. Payment/refund có trạng thái độc lập. Khách trả tiền sau khi hold hết hạn phải được đối soát và xử lý rõ, không mất tiền không có đơn.

Thuê nhà dài hạn là luồng riêng: tìm → hỏi/xem nhà → đề nghị thuê → xác minh quyền cho thuê → hợp đồng → cọc → bàn giao → thu tiền định kỳ → gia hạn/chấm dứt. Không dùng booking theo giờ làm hợp đồng thuê dài hạn. Giai đoạn đầu có thể triển khai tìm kiếm/đặt lịch xem nhà trước; chưa hoàn thiện hợp đồng và vận hành thì không mở giao dịch tự động.
8. Mini app Thuê đồ dùng
Trang đầu có danh mục, địa điểm, ngày/giờ nhận trả, nội khu, bộ lọc giá/cọc/giao nhận và kết quả còn hàng theo lịch. Học Mioto về sự rõ ràng của lịch và niềm tin; điều chỉnh theo từng loại đồ.

Luồng: chọn đồ → lịch thuê → phương thức nhận/giao → bảng giá và cọc → yêu cầu hoặc đặt ngay → thanh toán → biên bản bàn giao → đang thuê → yêu cầu gia hạn nếu cần → trả → kiểm tra tình trạng → quyết toán/hoàn cọc → đánh giá.

Tin đăng: danh mục, mô tả, ảnh thật, lỗi sẵn có, serial nếu phù hợp, số lượng hoặc mã tài sản, giá theo giờ/ngày/tuần, mức tối thiểu, cọc, giá trị tham chiếu có căn cứ, lịch, địa điểm, giao nhận, phụ kiện và quy tắc sử dụng. Tồn kho phải kiểm tra đồng thời, kể cả một tài sản xuất hiện trong nhiều tin.

Rule riêng cho chậm trả, hỏng/mất, vệ sinh, phụ kiện thiếu, gia hạn và tranh chấp; bằng chứng trước/sau có thời gian. Không tự khấu trừ toàn bộ cọc theo đánh giá đơn phương. Khoản đang tranh chấp xử lý theo chính sách đã công bố và cơ chế thanh toán hợp lệ. Gia hạn không được chồng lịch đơn kế tiếp.
9. Mini app Việc làm linh hoạt
Tách vai trò “Tìm việc” và “Tìm người làm”; hỗ trợ theo ca/giờ, Part-time và Full-time. Không gọi người lao động là tài sản cho thuê.

Hồ sơ người tìm việc: kỹ năng, kinh nghiệm, khu vực, lịch rảnh, loại công việc, mức thu nhập mong muốn; chỉ xin dữ liệu cần thiết đúng thời điểm. Không công khai CCCD, địa chỉ nhà, tài khoản ngân hàng hoặc hồ sơ nhạy cảm.

Tin tuyển: người tuyển đã xác minh ở mức phù hợp, mô tả việc, địa điểm, ca/ngày, số người, yêu cầu, lương theo đơn vị, thời điểm trả, khoản khấu trừ hợp lệ và điều kiện hủy. Ngăn tin yêu cầu nạp tiền/đặt cọc để nhận việc, dụ đầu tư hoặc việc bị cấm.

Luồng việc theo ca: tìm → xem lương/điều kiện → ứng tuyển bằng hồ sơ đã lưu → người tuyển chọn → hai bên xác nhận ca → check-in phù hợp → hoàn thành → xác nhận công/giải quyết bất đồng → thanh toán theo mô hình được phép → đánh giá. Xử lý trùng ca, rút ứng tuyển, đổi ca, no-show, tuyển đủ, hủy và chậm trả.

Full-time có pipeline ứng tuyển/phỏng vấn/offer riêng; không ép vào luồng nghiệm thu trả tiền theo ca. Phải đánh giá vai trò pháp lý RELOO là nền tảng kết nối, dịch vụ việc làm hay bên khác theo hoạt động thực tế. Không mặc định gọi “freelancer” để bỏ qua nghĩa vụ lao động.
10. Mini app Đồ cũ và trả giá
Luồng người bán: chọn danh mục → ảnh và tình trạng → giá → bật/tắt trả giá → giao nhận → preview → kiểm duyệt → xuất bản → trao đổi/đề nghị giá → xác nhận bán → bàn giao/vận chuyển → hoàn tất → hỗ trợ.

Luồng người mua: tìm → xem tin/người bán → chat hoặc trả giá → đạt thỏa thuận → kiểm tra tóm tắt → đặt mua nếu hỗ trợ giao dịch trên nền tảng → thanh toán → nhận/kiểm tra → hoàn tất hoặc khiếu nại. Phân biệt tin rao vặt chỉ kết nối với đơn được RELOO xử lý thanh toán; không gắn nhãn bảo vệ giao dịch khi không có cơ chế thực thi.

Trả giá là tính năng RELOO đề xuất, không khẳng định toàn bộ rule này là của Chợ Tốt:
- Người bán bật/tắt và có thể đặt mức đề nghị tối thiểu; mức bí mật không lộ qua API.
- Người mua gửi số tiền, số lượng và ghi chú. Chặn giá không hợp lệ, tự trả giá tin của mình, spam và tài khoản bị hạn chế.
- Offer: pending → accepted / rejected / countered / withdrawn / expired. Counter-offer tạo phiên bản liên kết, không ghi đè lịch sử.
- Mỗi đề nghị có TTL cấu hình và thông báo hết hạn. Chấp nhận giá chưa đồng nghĩa đã thanh toán hoặc đã bán.
- Chọn rõ chính sách giữ hàng: mặc định đề xuất chỉ tạo reservation khi người mua bước vào checkout và tồn kho còn, hold có TTL. Server quyết định nguyên tử; chỉ một người hoàn tất với món số lượng một. Nếu cho giữ hàng ngay khi chấp nhận offer thì phải quy định thời hạn và cách xử lý offer khác.
- Checkout lưu snapshot giá đã thống nhất, phí và điều kiện. Đổi giá tin không thay đổi đơn đã chốt. Người đến sau nhận giải thích hết hàng thay vì thanh toán nhầm.
- Không tạo đấu giá giả, giá mồi hoặc cam kết mua ràng buộc mà người dùng chưa được thông báo.
Đồ đã bán/hết hàng phải cập nhật trên feed, tìm kiếm và chat. Rule kiểm duyệt hàng cấm, hàng giả, hàng đánh cắp, nội dung vi phạm và cơ chế báo cáo/khiếu nại phải có trước khi mở đăng tin công khai.
11. Nội khu chung cư
Khi người dùng khai “Nơi đang sống”, xin quyền vị trí tại thời điểm phù hợp hoặc cho nhập tay. Có thể gợi ý chung cư trong bán kính 5 km, cho chọn khu/tòa; tọa độ gần không đồng nghĩa cư dân đã được xác minh. Ghi nguồn dữ liệu địa điểm và quyền sử dụng; không scrape tùy tiện hay tạo chung cư giả.

Trong nội khu chỉ giữ “Tìm đồ”; các chức năng trùng đưa về module tương ứng. Hiển thị chương trình nội khu có điều kiện rõ; thông báo theo lựa chọn, tần suất và giờ yên lặng. Không tiết lộ số căn hộ/chính xác vị trí nhà công khai. Không bắt định vị nền liên tục để được thuê. Theo dõi vị trí thiết bị không chứng minh vị trí món đồ; giải pháp thu hồi tài sản cần cơ chế độc lập và căn cứ phù hợp.
12. Thanh toán, niềm tin và vận hành
Tách order, payment, refund, deposit, payout và dispute. Tiền lưu bằng số nguyên VND; sổ đối soát và audit không sửa ngầm. Webhook xác minh chữ ký, chống replay, xử lý idempotent và sai thứ tự; không dựa return URL phía trình duyệt để xác nhận đã trả tiền.

Nếu dùng SePay VA cố định theo user, kiểm tra khả năng và hợp đồng thực tế; định danh khoản chuyển, đối soát đúng đơn, xử lý thiếu/thừa/trùng/chuyển nhầm. VA không tự biến RELOO thành ví hay bên được phép giữ tiền. Chỉ dùng cổng/đối tác phù hợp cho giữ cọc, chia tiền hoặc hoàn tiền; chưa có khả năng thực thì hiển thị chưa hỗ trợ, không giả lập tiền thật.

Mỗi thanh toán phải cho thấy tiền dịch vụ/hàng, phí nền tảng, giao nhận, giảm giá, thuế nếu áp dụng, cọc riêng và tổng phải trả. Chính sách hủy/hoàn được version hóa và snapshot vào giao dịch. Không hardcode tỷ lệ phí chưa được duyệt.

Chat theo ngữ cảnh giao dịch; kiểm tra quyền với người tham gia và file đính kèm. Thông báo chứa hành động tiếp theo, deep link, retry và chống gửi trùng. Lịch trả đồ/check-in/ca làm hỗ trợ thêm lịch có sự đồng ý; không mặc định email đăng ký đồng nghĩa đã cấp Google Calendar. Không đưa thông tin riêng tư lên lock screen.

Anti-scam dùng nhiều tín hiệu, nguồn có quyền sử dụng và cơ chế xác minh; không tự chặn vĩnh viễn chỉ vì trùng IP hoặc một danh sách ngoài. Có review, lý do phù hợp, khiếu nại và gỡ hạn chế; không khẳng định người dùng phạm tội khi chưa có căn cứ.

Admin cần hàng đợi kiểm duyệt, hồ sơ đối tác, tin/đơn, hoàn tiền/đối soát, tranh chấp, báo cáo, cấu hình phí/chính sách có lịch hiệu lực, CMS và nhật ký. Các thay đổi nhạy cảm cần quyền phù hợp, lý do và kiểm soát phê duyệt theo chính sách nội bộ. Dashboard chỉ hiển thị số liệu có định nghĩa và nguồn.
13. Rà soát pháp lý như điều kiện phát hành
Tra văn bản chính thức đang hiệu lực tại ngày triển khai, kể cả sửa đổi, chuyển tiếp và quy định địa phương. Lập register có số văn bản, điều khoản, ngày hiệu lực, mô hình áp dụng, nghĩa vụ, màn hình/API thực thi, bằng chứng và người xác nhận. Không chỉ liệt kê tên luật. Các vấn đề chưa rõ phải đánh dấu NEEDS_LEGAL_REVIEW và chặn phát hành tính năng liên quan, vẫn tiếp tục phần độc lập.

Phạm vi cần đánh giá: thương mại điện tử và nghĩa vụ nền tảng; bảo vệ người tiêu dùng; dữ liệu cá nhân, dữ liệu nhạy cảm và chuyển dữ liệu; giao dịch/hợp đồng điện tử; thuế/hóa đơn; thanh toán và giữ tiền; điều kiện cơ sở lưu trú, khai báo lưu trú, an ninh/PCCC và quyền cho thuê; thuê nhà dài hạn; dịch vụ việc làm, lao động và bảo vệ người chưa thành niên; quảng cáo, khuyến mãi; sở hữu trí tuệ và hàng hóa bị hạn chế.

Viết điều khoản nền tảng, từng ngành, chính sách riêng tư, hủy/hoàn, cọc, giải quyết tranh chấp, tiêu chuẩn cộng đồng và khiếu nại. Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 có nguồn chính thức ghi hiệu lực 01/01/2026; vẫn phải kiểm tra văn bản hướng dẫn và phạm vi cụ thể tại thời điểm triển khai. Không coi chính sách đối thủ là kết luận pháp lý cho RELOO.

Consent có mục đích, phiên bản, thời điểm và bằng chứng; tách thông báo cần thiết khỏi marketing. Có rút đồng ý, truy cập/chỉnh sửa/xóa theo điều kiện pháp luật, thời hạn lưu theo loại dữ liệu và legal hold; không xóa chứng từ bắt buộc chỉ vì người dùng xóa tài khoản. Mã hóa, phân quyền và che dữ liệu định danh; không ghi CCCD/token vào log hoặc analytics.
14. Kỹ thuật và khả năng mở rộng
Ưu tiên tận dụng code hiện có. Tạo domain boundaries, API/schema validation, authorization server-side, RBAC/ownership theo đối tác và chi nhánh. Tách dữ liệu public/private. Có migration versioned, index theo truy vấn, pagination, cache invalidation, background jobs retry/dead-letter và outbox khi cần bảo đảm sự kiện.

Tính sẵn có, giá cuối và chuyển trạng thái phải do server xác nhận. Kiểm tra race condition qua transaction/lock/constraint phù hợp; không dùng nút disabled làm cơ chế chống trùng duy nhất. Chống IDOR, injection, XSS, CSRF theo kiến trúc auth, upload độc hại, lộ bucket và abuse OTP/chat/search. Tối thiểu hóa quyền và secrets theo môi trường.

API chưa có phải có adapter có kiểu dữ liệu, mock chỉ trong test/dev, feature flag và màn hình “Sắp ra mắt” khi cần. Không dùng dữ liệu giả để tạo cảm giác đã có đối tác hoặc giao dịch thật.

Định nghĩa workload trước capacity test: số concurrent active users, requests/giây, loại thao tác, dataset, tỷ lệ đọc/ghi và ngân sách. Mốc 2.000 người dùng đồng thời là kịch bản cần đo, không phải cam kết từ kiến trúc. Có load test đặt lịch/offer/payment đồng thời và báo giới hạn staging so với production.
15. Staging bắt buộc: staging.reloo.vn
Thiết kế và chuẩn bị cấu hình để staging.reloo.vn là môi trường kiểm thử tích hợp; chỉ nhận đã triển khai khi DNS, HTTPS, ứng dụng và luồng thực đã được kiểm chứng. Thiếu quyền DNS/hosting thì hoàn thành code, cấu hình và hướng dẫn cụ thể; ghi BLOCKED kèm thao tác cần chủ sở hữu làm. Không tuyên bố domain hoạt động khi chưa truy cập được.

Yêu cầu:
- Dev / staging / production có biến môi trường, secrets và tài nguyên tách biệt: database, storage, cache, queue, auth/OAuth callback, payment/webhook, push/email/SMS, analytics và search index.
- Cookie/session tách theo host; không đặt cookie chung .reloo.vn ngoài nhu cầu đã đánh giá. Không cho staging dùng production API hoặc ghi nhầm dữ liệu thật.
- Staging có xác thực truy cập; banner STAGING rõ. noindex và X-Robots-Tag, robots phù hợp; robots.txt không thay thế kiểm soát truy cập.
- Dữ liệu synthetic hoặc đã ẩn danh có kiểm chứng; seed có phiên bản và reset được. Không sao chép nguyên dữ liệu khách hàng production.
- Payment sandbox; email/SMS/push vào hộp thử hoặc allowlist. Không gửi thông báo, hồ sơ hay thu tiền của người thật do test.
- CI: lint/typecheck, unit/integration theo rủi ro, migration check, security/secret scan, build, deploy staging, smoke/E2E và xuất báo cáo. E2E backend thật trong staging, sandbox cho dịch vụ ngoài; ghi rõ chỗ còn stub.
- Build once, promote đúng artifact đã test; ghi commit, migration và phiên bản policy. Nếu nền tảng buộc build theo môi trường thì ghi khác biệt và chạy lại kiểm tra liên quan.
- Health check, log có correlation ID, metrics, error tracking, backup và thử restore. Khai báo RPO/RTO đề xuất theo ngân sách, không bịa SLA đạt được.
- Migration expand/contract và tương thích rollback; tách rollback ứng dụng khỏi rollback dữ liệu. Không hứa rollback schema phá hủy là an toàn.
- Dùng feature flags theo module, rollout giới hạn và kill switch. Chuẩn bị release checklist và rollback runbook. Chỉ phát hành production khi có phê duyệt phát hành cụ thể; yêu cầu hiện tại không tự cấp quyền thu tiền thật.
16. Ma trận kiểm thử và điều kiện nghiệm thu
Kiểm tra web mobile/desktop, Android/iOS nếu repository có app; không coi web responsive là app native đã hoàn thành. Có bằng chứng ảnh/video cho hành trình và kết quả CI gắn commit.

Hành trình bắt buộc: khách chưa đăng nhập khám phá và quay lại đúng chỗ sau login; tài khoản nhiều vai trò; chủ nhà tạo tin/sửa lịch/nhận khách; đặt phòng qua ngày; hai người tranh cùng phòng; thanh toán timeout/trễ/trùng; hủy và hoàn tiền; thuê/gia hạn/trả đồ có tranh chấp; ứng tuyển/chọn ca/trùng ca/no-show; trả giá/counter/expired/rút offer/hết hàng; người mua đồng thời cùng món; báo cáo và khiếu nại; reset/xóa dữ liệu theo quyền; sâu link từ thông báo; bị từ chối vị trí; đổi ngôn ngữ; mạng chậm và request gửi lại.

Test quyền phải chứng minh user/đối tác/chi nhánh khác không xem hoặc sửa dữ liệu ngoài phạm vi; kiểm tra cả API, không chỉ menu ẩn. Test giá và chính sách phải dùng snapshot tại thời điểm giao dịch. Regression giữ hoạt động tính năng cũ.

Mục tiêu UX: sau khi đủ điều kiện, CTA chính dẫn đến giao dịch trong 1–2 thao tác có ý nghĩa; đo thực tế không giấu bước. Đặt mục tiêu web ban đầu LCP ≤2,5s, INP ≤200ms, CLS ≤0,1 ở p75 khi có dữ liệu thực; trước phát hành dùng lab có cấu hình máy/mạng công khai và không nhận lab là dữ liệu thực. Không có nút chết, mock tiền thật hoặc trạng thái thành công giả.

Không phát hành nếu còn lỗi có thể lộ dữ liệu, thu/hoàn sai tiền, overbooking, bán trùng, vượt quyền hoặc thiếu điều kiện pháp lý trọng yếu. Báo rõ phần test không chạy được và nguyên nhân; không đánh dấu PASS thay cho NOT_RUN.
17. Thực thi theo giai đoạn
A. Audit repository, khảo sát nguồn, lập gap/risk và kế hoạch có phụ thuộc. Tiếp tục công việc độc lập, chỉ hỏi khi thiếu quyết định thật sự chặn bước tiếp theo.
B. Design system, app shell, home tổng hợp, điều hướng/deep link và staging nền tảng. Xây lát cắt chạy thật: chủ nhà khai báo → tin được duyệt → khách đặt → sandbox payment → chủ nhận → hoàn tất/hủy.
C. Hoàn thiện đặt phòng và quản lý đối tác, tồn kho, đối soát, khiếu nại.
D. Thuê đồ và nội khu với bàn giao, hoàn cọc và lịch.
E. Đồ cũ với chat và trả giá, reservation và xử lý giao dịch đúng mô hình đã chốt.
F. Việc làm với hai vai trò, ca và chống lừa đảo; Full-time theo pipeline riêng.
G. Hồi quy xuyên module, load/security/accessibility, UAT và chuẩn bị phát hành.

Cho phép đổi thứ tự khi dependency và mức sẵn sàng repository chứng minh hợp lý; giải thích và giữ tiến độ rõ. Sau mỗi giai đoạn cung cấp: thay đổi chạy được, file/route/API, rule đã áp dụng, test thực chạy, ảnh giao diện, link staging nếu có, lỗi còn lại và bước tiếp theo. Không gộp “đã thiết kế” với “đã triển khai”.

Ngay bây giờ: bắt đầu đọc repository, lập audit và tài liệu rule; xác định nền tảng hiện tại rồi triển khai giai đoạn B theo lát cắt trên. Không dừng ở một bản kế hoạch nếu có thể tiếp tục làm trong phạm vi đã được cấp quyền.
18. Chế độ tự thực thi sau khi đã hiểu yêu cầu
Người dùng đã yêu cầu tự xây dựng toàn bộ các phần trên sau khi yêu cầu đã rõ. Đây là chỉ thị thực thi: khảo sát → chốt giả định hợp lý có ghi nhận → đặc tả → code frontend/backend/database → test → sửa lỗi → triển khai staging trong quyền hiện có → kiểm tra trên staging. Không dừng sau báo cáo, thiết kế, kế hoạch hoặc câu “Bạn có muốn tôi tiếp tục không?”. Không xin xác nhận lại cho công việc có thể đảo ngược đã nằm trong phạm vi này.

Tự chọn thứ tự công việc theo phụ thuộc; thực hiện từng lát cắt hoàn chỉnh và tiếp tục các giai đoạn cho đến khi hoàn tất hoặc có trở ngại thực sự. Khi bị chặn bởi tài khoản, công cụ, quyền, dịch vụ trả phí hoặc quyết định kinh doanh không thể suy ra: nêu chính xác điểm chặn, chuẩn bị cấu hình/code có thể kiểm tra được và tiếp tục các việc độc lập. Không tự bịa API key, thông tin pháp nhân, hợp đồng, phí dịch vụ hoặc kết quả pháp lý. Không mua dịch vụ, thực hiện giao dịch thật hoặc phát hành production ngoài quyền đã được cấp.

Lưu tiến độ vào docs/RELOO_PROGRESS.md sau mỗi phần hoàn thành: commit/file, kết quả test, lỗi mở, quyết định, bước kế tiếp và lệnh tiếp tục. Khi đổi phiên hoặc gần hết ngữ cảnh, ghi checkpoint để phiên sau đọc và tiếp tục đúng chỗ; không làm lại từ đầu hoặc nhận sẽ tự chạy nền sau khi phiên đã kết thúc.
19. Khảo sát trực tiếp app trên Samsung đang có
Người dùng cho phép tham khảo các app Go2Joy, Small Jobs, Mioto và Chợ Tốt trên điện thoại Samsung hiện tại để phục vụ thiết kế RELOO. Trước tiên kiểm tra các công cụ điều khiển Android có thật trong môi trường đang chạy, tài liệu công cụ và kết nối thiết bị đã được cho phép. Nếu có repo/công cụ REA mà người dùng đã thiết lập, đọc README và cấu hình của nó, xác minh cách dùng; không tự đoán REA là công cụ nào hoặc giả định đã cài.

Nếu môi trường có Android SDK/ADB và công cụ tự động hóa phù hợp, kiểm tra thiết bị kết nối; chỉ chọn máy Samsung đúng mục tiêu. Nếu chưa có thiết bị hoặc trạng thái unauthorized, hướng dẫn một lần theo đúng công cụ: kết nối máy tính đang chạy coding agent, bật Developer options/USB debugging và người dùng tự chấp nhận khóa RSA khi dùng ADB. Kết nối không dây chỉ khi được cấu hình rõ và ở mạng phù hợp. Không yêu cầu tắt bảo mật thiết bị, root máy, chia sẻ OTP/mật khẩu hoặc mở cổng điều khiển ra internet. Khi xong, hướng dẫn ngắt phiên debug nếu người dùng không cần giữ kết nối.

Chỉ điều khiển bốn app mục tiêu và phần hệ thống cần cho kết nối được cho phép. Không đọc tin nhắn, ảnh, danh bạ hoặc app cá nhân khác. Đăng nhập/OTP cần người dùng tự thao tác; khi đã có phiên đăng nhập, khảo sát trong phạm vi tính năng mục tiêu, che dữ liệu cá nhân khỏi bằng chứng. Không đặt phòng/đặt xe thật, ứng tuyển thật, đăng tin công khai, gửi chat, gửi trả giá cho người thật hoặc thanh toán chỉ để kiểm tra. Các bước có tác động chỉ thử trên tài khoản/môi trường test được xác định; nếu không có, ghi chưa quan sát và kiểm thử phiên bản RELOO bằng dữ liệu giả lập riêng.

Mỗi app cần thu thập: sơ đồ điều hướng, màn hình chính, tìm/lọc, card, chi tiết, form khai báo nếu truy cập được, preview, bước xác nhận, trạng thái đơn, chat/thông báo, lỗi/empty/loading, cách quay lại và số thao tác. Khảo sát cả phía khách và đối tác khi có quyền; không coi app người dùng là đủ bằng chứng cho cổng chủ nhà. Chụp ảnh có mục đích, ghi phiên bản/ngày và không lưu dữ liệu riêng không cần thiết.

Chuyển kết quả thành docs/research/SAMSUNG_APP_AUDIT.md và bảng “Quan sát → nguyên lý UX → áp dụng vào RELOO → rule → component → test”. Mẫu không quan sát được phải ghi UNOBSERVED. Không sao chép tài sản thiết kế hoặc tuyên bố đã hiểu logic backend từ ảnh màn hình. Sau khi đủ bằng chứng cho module đang làm, tự triển khai module đó; không đợi khảo sát xong tất cả mới bắt đầu code.
KẾT THÚC PROMPT
Nguồn khởi đầu để AI kiểm tra lại
Đã tìm nguồn công khai ngày 22/10/2026; đây là điểm bắt đầu, không phải bản kiểm toán toàn bộ app hoặc kết luận pháp lý.
- Go2Joy, quy chế nền tảng: https://go2joy.vn/en-vn/regulations-on-operating-website
- Go2Joy, thông tin trải nghiệm đặt theo giờ/đêm/ngày: https://go2joy.vn/blog/
- Small Jobs, website chính thức: https://smalljobs.vn/
- Small Jobs, trang App Store: https://apps.apple.com/vn/app/small-jobs-vi%E1%BB%87c-l%C3%A0m-linh-ho%E1%BA%A1t/id6754379017
- Mioto, chính sách và quy định: https://www.mioto.vn/terms
- Mioto, quy chế hoạt động: https://www.mioto.vn/regu
- Chợ Tốt, quy chế: https://trogiup.chotot.com/nguoi-mua/hoat-dong/
- Chính phủ, Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15: https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3
Không truy cập các domain trông tương tự nhưng không thuộc nguồn chính thức. Không dùng trang staging/UAT của đối thủ làm bằng chứng cho chính sách production. Những rule trả giá, bố cục trang chủ, kiến trúc và quy trình triển khai trong tài liệu là đề xuất thiết kế cho RELOO, cần đối chiếu repository và mô hình vận hành thực tế.