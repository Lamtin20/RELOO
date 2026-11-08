# 04 — Thủ tục và nhóm hồ sơ cần chuẩn bị

**Danh mục làm việc với luật sư, không phải danh sách giấy phép tự động áp dụng cho mọi mini app.** Thời điểm kiểm tra 23/10/2026. Không nộp các bản mẫu nội bộ dưới đây thay mẫu hành chính chính thức. Đầu mối, phân cấp, mẫu/số hiệu, hạn, phí và kênh nộp phải kiểm tra trên cổng của cơ quan có thẩm quyền tại ngày nộp; ô chưa xác minh không được tự điền.

## Quy trình tổng thể

1. **Đóng phạm vi launch:** chọn rõ dịch vụ nào có giao dịch thật, dịch vụ chỉ giới thiệu, hoạt động trong/ngoài VN, ai vận hành, tuổi khách, dữ liệu nhạy cảm và luồng tiền. Bản mô tả có ảnh màn hình/API/diagram, không chỉ ngành nghề đăng ký.
2. **Pháp nhân/thuế:** hoàn thành đăng ký doanh nghiệp theo hình thức/ngành phù hợp; dữ kiện người đại diện, trụ sở, vốn/chủ sở hữu, ủy quyền; đăng ký thuế và chế độ kế toán/hóa đơn phù hợp. Mã ngành trong đăng ký không tự thay giấy phép kinh doanh có điều kiện.
3. **Phân loại nền tảng:** luật sư xác định bán hàng trực tiếp, nền tảng trung gian/sàn, mạng xã hội có giao dịch, app và dịch vụ hỗ trợ nào. Đối chiếu chế độ TMĐT hiện hành thay vì dùng hướng dẫn cũ của NĐ52/2013 như căn cứ duy nhất.
4. **Đánh giá từng ngành có điều kiện:** Job, bất động sản, lưu trú, payment/escrow/insurance, game/vật phẩm; đối tác có giấy phép không tự cấp quyền kinh doanh cho RELOO. Mở launch flag theo kết luận có văn bản.
5. **Hồ sơ dữ liệu/IP/hợp đồng:** lập data map, đánh giá tác động/chuyển dữ liệu theo phạm vi áp dụng, phân công nhân sự, DPA, quyền tài sản, chính sách/đồng ý/DSAR/sự cố; chưa xác định entity thì không tự công bố bên kiểm soát là công ty tương lai.
6. **Review và nộp đúng thủ tục:** áp dụng đúng mẫu chính thức hiện hành, kiểm tra chữ ký/thẩm quyền/tài liệu đính kèm, nộp cổng/cơ quan đúng loại; ghi biên nhận, yêu cầu bổ sung và phiên bản đã nộp. Không đưa trạng thái “đã cấp phép” khi mới nộp.
7. **Xuất bản và kiểm thử:** CRM cấu hình đúng pháp nhân, version policy/consent, nhãn thông báo/đăng ký thực khi đã có; QA server quyền/giá/tồn/hoàn/DSAR, staging và cùng runtime web/mobile.
8. **Hậu kiểm:** lịch review khi đổi ngành, SDK/provider, mục đích dữ liệu, trẻ em/xuyên biên giới/luồng tiền; theo dõi báo cáo/duy trì điều kiện và yêu cầu cơ quan. Không coi đăng ký một lần là hết nghĩa vụ.

## Ma trận hồ sơ/thủ tục

| Nhóm | Trigger cần luật sư phân loại | Bộ hồ sơ đầu vào cần chuẩn bị | Đầu mối cần xác minh | Bằng chứng đủ để đóng bước |
|---|---|---|---|---|
| Doanh nghiệp | Chủ thể đứng tên vận hành/kinh doanh | Dự thảo điều lệ, hồ sơ đăng ký phù hợp loại hình, chủ sở hữu/thành viên, đại diện/ủy quyền, trụ sở, ngành nghề, nghĩa vụ chủ sở hữu hưởng lợi nếu áp dụng | Cơ quan đăng ký kinh doanh/cổng hiện hành theo địa bàn | Tài liệu được cấp và thông tin được đối chiếu, không tạo mã giả |
| Thuế/kế toán/hóa đơn | Doanh thu nền tảng, tiền đối tác/thu hộ, thương nhân/cá nhân | Sơ đồ tiền, hợp đồng thu/phí, sổ ledger, loại chứng từ, quy tắc lập/điều chỉnh/hủy hóa đơn, merchant tax status | Cơ quan thuế và đơn vị kế toán, provider hóa đơn có hợp đồng | Kết luận mô hình, cấu hình và chứng từ/đăng ký liên quan phù hợp; không coi tiền thu hộ là toàn bộ doanh thu |
| TMĐT web/app | Theo phân loại bán hàng/nền tảng trung gian và tính năng | Đăng ký pháp nhân, domain/app ownership, đề án/quy chế hoạt động, giao kết, người bán, phí/hoàn/cọc, khiếu nại, bảo vệ dữ liệu, quản lý hàng vi phạm | Cơ quan/cổng TMĐT có thẩm quyền trong chế độ hiện hành; kiểm tra phân cấp | Xác nhận/kết quả đúng loại, phạm vi domain/app và mô hình; nhãn/link kiểm chứng được |
| Dữ liệu cá nhân | Theo vai trò, quy mô, dữ liệu/ngoại lệ và văn bản hiện hành | Data map/RoPA, phân loại, mục đích/căn cứ, notices/consent, bên xử lý, biện pháp bảo vệ, người phụ trách, đánh giá tác động, quy trình DSAR/sự cố | Cơ quan chuyên trách bảo vệ dữ liệu và pháp lý xác định hồ sơ phải nộp | Hồ sơ hoàn chỉnh theo đúng mẫu/phạm vi; biên nhận/kết quả nếu phải nộp; nội bộ phê duyệt không giả thành chứng nhận |
| Chuyển dữ liệu xuyên biên giới | Có processor/cloud/analytics/support hoặc truyền/cho truy cập ngoài VN | Danh sách nước/recipient/subprocessor, hợp đồng, luồng kỹ thuật, đánh giá rủi ro, biện pháp/quyền chủ thể | Cơ quan dữ liệu và luật sư xác định trigger/ngoại lệ/kênh/hạn | Kết luận applicability và hồ sơ/kết quả đúng yêu cầu; server ở VN không tự loại trigger |
| Lưu trú/đặt phòng | RELOO trung gian/đại lý hay trực tiếp kinh doanh; đối tác vận hành cơ sở | Hợp đồng đối tác, quyền phòng/ảnh/API, giấy tờ cơ sở, điều kiện an ninh/PCCC/khai báo/tourism theo loại, chính sách giá/check-in/hủy | Cơ quan ngành/địa phương phù hợp vai trò và luật sư | Checklist quyền cung cấp + hợp đồng + điều kiện cơ sở đã xác minh; không mặc định giấy phép riêng sàn đủ cho cơ sở |
| Nhà dài hạn/BĐS | Quảng cáo/kết nối hay môi giới/sàn/kinh doanh trực tiếp | Quyền tài sản/ủy quyền, giao dịch nhà đất, hợp đồng thuê/môi giới, phí, nhân sự/chứng chỉ/điều kiện nếu áp dụng | Cơ quan ngành xây dựng/BĐS theo phân cấp hiện hành | Phân loại vai trò, hồ sơ điều kiện/nghĩa vụ đúng loại và nghiệm thu quy trình |
| Việc làm | Rao tin, dịch vụ việc làm, tuyển trực tiếp, cung ứng/cho thuê lại | Đề án mô hình, hợp đồng, phí/không phí, người trả lương/chỉ đạo, nhân sự/địa điểm/điều kiện/ký quỹ nếu áp dụng, nội dung tin, CV/tuổi/retention | Cơ quan quản lý lao động/việc làm theo phân cấp hiện hành | Văn bản kết luận loại dịch vụ và giấy phép/đáp ứng điều kiện nếu cần; không mở thu phí nhận việc trước đó |
| Payment/escrow/ví | Giữ/nhận/chuyển tiền, số dư/rút, trung gian, bảo đảm | Tiền của ai, tài khoản ai, giấy phép/hợp đồng bank/PSP, ủy quyền thu, đối soát/AML theo đúng chủ thể, an ninh, khiếu nại/hoàn | NHNN/cơ quan và đối tác có thẩm quyền theo mô hình thực tế | Đối tác đúng phạm vi, quyền RELOO rõ; nếu RELOO trực tiếp làm dịch vụ cần điều kiện thì phải có kết quả riêng |
| RELOO Care/bảo hiểm | Hỗ trợ dịch vụ hay phân phối/bán sản phẩm bảo hiểm/bảo lãnh | Mô tả nghĩa vụ/rủi ro/bên chi trả/giới hạn, hợp đồng đối tác nếu có, wording UI | Luật sư/cơ quan ngành bảo hiểm khi đúng trigger | Kết luận phân loại và điều kiện/hợp đồng; bỏ claims sai trước công khai |
| World/game/UGC/NFT | Game/ứng dụng/mạng xã hội/tiền vật phẩm/giao dịch số | Gameplay/đối tượng/độ tuổi, server, chat/UGC/moderation, quy đổi, tiền/vật phẩm/NFT, mô hình doanh thu | Cơ quan game/thông tin/asset/thuế phù hợp theo luật hiện hành | Phân loại từng tính năng, giấy phép/xác nhận/thông báo nếu áp dụng, không tự tuyên bố NFT hợp pháp cho mọi mục đích |
| IP/quảng cáo/khuyến mại | Dùng asset bên khác, âm nhạc, nguồn tin, chiến dịch | License/assignment/invoice/release, brand permission, thời hạn/phạm vi/derivative, chứng cứ claims, thể lệ/budget/đối tượng campaign | Chủ quyền/tổ chức cấp quyền; cơ quan quảng cáo/khuyến mại nếu trigger | Chuỗi quyền và điều kiện thực hiện được; owner attestation không thay mọi giấy phép bên thứ ba |
| Khiếu nại/cơ quan | Tranh chấp, yêu cầu dữ liệu, tố giác | SOP intake/xác minh/hạn trả lời, phân quyền/case/evidence export, legal hold, nhật ký bàn giao | Cơ quan gửi yêu cầu và pháp lý kiểm tra thẩm quyền | Quyết định scope, người duyệt, dữ liệu tối thiểu và biên bản giao nhận |

## Checklist mỗi lần nộp

Mã thủ tục `[CHƯA XÁC MINH]`; tên thủ tục; văn bản/điều làm căn cứ; cơ quan/địa bàn; cổng chính thức và ngày kiểm tra; trường hợp phải nộp/ngoại lệ; mẫu đơn/phụ lục **đúng phiên bản**; số bản/chữ ký/chứng thực theo yêu cầu; tài liệu kèm; lệ phí/hạn xử lý; thời hạn bổ sung; báo cáo/duy trì sau cấp; người ký/ủy quyền; requestId/biên nhận/kết quả; điều kiện bật feature.

Không có “bộ giấy tờ chung” đủ cho cả sàn, lưu trú, tuyển dụng, ví và game. Danh mục trên nhằm để luật sư đóng phạm vi trước, tránh xin giấy phép không cần hoặc mở chức năng có điều kiện khi chưa có quyền.

## Cập nhật khung TMĐT đã xác minh trực tiếp

[Luật 122/2025/QH15](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/luat122.2025.qh15.pdf), trang PDF28: Điều40 hiệu lực 01/07/2026; Điều41 có chuyển tiếp đến 30/06/2027 cho nhóm website/app đã được xác nhận trước hiệu lực theo nội dung điều này. **Không suy ra nền tảng mới chưa đăng ký được tự hoạt động đến 2027.** Điều4–5, trang PDF3, phân biệt luật TMĐT với hoạt động ngân hàng/trung gian thanh toán và trách nhiệm theo pháp luật liên quan.

[NĐ248/2026](https://vanban.chinhphu.vn/?pageid=27160&docid=218747) và biểu mẫu/đầu mối cụ thể cần luật sư đọc đủ và kiểm tra thay đổi/phân cấp tại ngày nộp. Không lấy riêng tiêu đề hoặc một trang phụ lục làm chứng cứ đã đọc toàn bộ thủ tục.
