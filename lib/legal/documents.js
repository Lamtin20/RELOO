export const LEGAL_VERSION = "2026-10-10.1";
export const LEGAL_SOURCES = [
  {
    number: "91/2015/QH13",
    title: "Bộ luật Dân sự",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=183188",
    scope:
      "Năng lực giao kết, thuê tài sản, nghĩa vụ bảo quản, bồi thường và biện pháp bảo đảm.",
  },
  {
    number: "36/2005/QH11",
    title: "Luật Thương mại",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=14765",
    scope:
      "Áp dụng với hoạt động thương mại thuộc phạm vi của luật; không mặc định mọi giao dịch giữa cá nhân đều là giao dịch thương mại.",
  },
  {
    number: "20/2023/QH15",
    title: "Luật Giao dịch điện tử",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=208421",
    scope:
      "Thông điệp dữ liệu, giao kết điện tử và chứng cứ; chữ ký hệ thống hoặc mã băm không tự thay thế chữ ký số được chứng thực.",
  },
  {
    number: "19/2023/QH15",
    title: "Luật Bảo vệ quyền lợi người tiêu dùng",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=208363",
    scope:
      "Công bố thông tin, trách nhiệm nền tảng, quyền khiếu nại, thương lượng; không sử dụng điều khoản loại trừ trách nhiệm trái luật.",
  },
  {
    number: "122/2025/QH15",
    title: "Luật Thương mại điện tử",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=216503",
    scope:
      "Hiệu lực 01/07/2026. Điều 41 chuyển tiếp đến 30/06/2027 chỉ áp dụng cho hồ sơ đủ điều kiện được xác nhận trước hiệu lực.",
  },
  {
    number: "248/2026/NĐ-CP",
    title: "Quy định chi tiết Luật Thương mại điện tử",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=218747",
    scope:
      "Hiệu lực 01/07/2026; Điều 52 chấm dứt hiệu lực NĐ 52/2013 và 85/2021, trừ chuyển tiếp tại Điều 53. Trách nhiệm xác thực điện tử danh tính người bán/livestream theo khoản 2 Điều 52 áp dụng từ 01/01/2027.",
  },
  {
    number: "52/2013/NĐ-CP + 85/2021/NĐ-CP",
    title: "Khung thương mại điện tử trước 01/07/2026",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=204191",
    scope:
      "Lưu trong hồ sơ lịch sử/chuyển tiếp; không dùng làm căn cứ hiện hành duy nhất cho một nền tảng mới.",
  },
  {
    number: "91/2025/QH15",
    title: "Luật Bảo vệ dữ liệu cá nhân",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=214590",
    scope:
      "Hiệu lực 01/01/2026. Dữ liệu định danh, sinh trắc học, mục đích xử lý, quyền chủ thể, an toàn và đánh giá tác động.",
  },
  {
    number: "356/2025/NĐ-CP",
    title: "Hướng dẫn Luật Bảo vệ dữ liệu cá nhân",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=216387",
    scope:
      "Điều 42: NĐ 13/2023 hết hiệu lực từ 01/01/2026. Ngoại lệ tại Điều 41 dành cho một số quy mô doanh nghiệp không mặc nhiên áp dụng khi trực tiếp xử lý dữ liệu nhạy cảm.",
  },
  {
    number: "52/2024/NĐ-CP",
    title: "Thanh toán không dùng tiền mặt",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=210262",
    scope:
      "Phân định dịch vụ thanh toán/trung gian thanh toán với phần mềm đối soát; tài khoản ảo không tự tạo giấy phép giữ ký quỹ.",
  },
  {
    number: "70/2025/NĐ-CP",
    title: "Sửa đổi quy định hóa đơn, chứng từ",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=213179",
    scope:
      "Đọc cùng NĐ 123/2020 và văn bản hướng dẫn hiện hành; đối chiếu chủ thể bán, thời điểm lập, số tiền, trạng thái phát hành và cơ quan thuế.",
  },
  {
    number: "117/2025/NĐ-CP",
    title: "Quản lý thuế trên nền tảng của hộ, cá nhân",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=213883",
    scope:
      "Xác định nghĩa vụ theo mô hình và chức năng thanh toán thực tế; tiền của người cho thuê không tự là doanh thu của RELOO.",
  },
  {
    number: "88/2015/QH13",
    title: "Luật Kế toán",
    url: "https://vanban.chinhphu.vn/?pageid=27160&docid=183198",
    scope:
      "Chứng từ, sổ kế toán, đối chiếu, lưu trữ và kiểm soát điều chỉnh; cần áp dụng chế độ phù hợp với chủ thể đã đăng ký.",
  },
];
export function legalDocument(slug, business) {
  const entity = business.entity || {},
    operator =
      entity.legalName || "Đơn vị vận hành RELOO (chưa khai báo pháp nhân)",
    contact =
      [entity.supportEmail, entity.supportPhone].filter(Boolean).join(" · ") ||
      "Kênh hỗ trợ trong RELOO";
  const common = {
    slug,
    templateVersion: LEGAL_VERSION,
    entityVersion: business.version,
    operator,
    entitySnapshot: entity,
    draft: !business.entityReady,
    updatedAt: "2026-10-10",
    sources: LEGAL_SOURCES,
  };
  const documents = {
    terms: {
      title: "Quy chế hoạt động RELOO",
      sections: [
        {
          title: "Đơn vị vận hành & phạm vi",
          paragraphs: [
            `${operator}. Địa chỉ: ${entity.address || "chưa khai báo"}. Mã số thuế: ${entity.taxId || "chưa khai báo"}. Liên hệ: ${contact}.`,
            "RELOO kết nối người có tài sản với người cần thuê. Người cho thuê chịu trách nhiệm về quyền cho thuê, thông tin, tình trạng và việc giao nhận; người thuê chịu trách nhiệm sử dụng, bảo quản và hoàn trả đúng thỏa thuận. RELOO thực hiện trách nhiệm vận hành nền tảng, tiếp nhận phản ánh, bảo vệ dữ liệu và phối hợp giải quyết vụ việc theo pháp luật.",
          ],
        },
        {
          title: "Tài khoản & thông tin giao dịch",
          paragraphs: [
            "Thông tin khai báo phải đúng và thuộc quyền sử dụng của người khai báo. Xác minh căn cước, kiểm tra cảnh báo và đối chiếu tên không bảo đảm tuyệt đối một tài sản hay giao dịch không có rủi ro. Người dùng có quyền yêu cầu xem xét khi kết quả sai.",
            "Số điện thoại đăng ký được khóa sửa trực tiếp để bảo vệ tài khoản. Yêu cầu sửa thông tin có sai sót được tiếp nhận qua quy trình bảo vệ dữ liệu và cần đối chiếu phù hợp. Không dùng cơ chế khóa để tước quyền hợp pháp của chủ thể dữ liệu.",
          ],
        },
        {
          title: "Giao kết, giao nhận & hoàn trả",
          paragraphs: [
            "Hai bên xem và xác nhận tài sản, giá, thời gian, phụ kiện, tiền bảo đảm nếu có, giao nhận, hủy và trách nhiệm thiệt hại trước khi giao kết. Một yêu cầu thuê hoặc tin nhắn chưa tự chứng minh đã phát sinh thuê hay thanh toán. Thông tin được xác nhận phải lưu lại để tham chiếu.",
            "Ghi nhận hình ảnh tình trạng và phụ kiện lúc bàn giao/hoàn trả, thông báo lỗi ngay khi phát hiện, giữ bằng chứng và tạo khiếu nại khi chưa thống nhất. Không tự áp dụng khấu trừ tiền chỉ dựa vào kết luận của bot.",
          ],
        },
        {
          title: "Thanh toán & chương trình ký quỹ",
          paragraphs: [
            business.deposit?.enabled
              ? "Chương trình có ký quỹ chỉ áp dụng theo điều kiện đã công bố, ngân hàng/đơn vị đủ điều kiện giữ tiền, sự chấp thuận của hai bên và chứng từ đối soát. Không thay đổi hồi tố khoản bảo đảm của thỏa thuận đã giao kết."
              : "RELOO chưa vận hành dịch vụ giữ ký quỹ. Thanh toán và tiền cọc trực tiếp do hai bên thống nhất. Việc có tài khoản ảo để nhận diện giao dịch không đồng nghĩa tiền đã được ngân hàng giữ ký quỹ.",
            "Các chương trình miễn hoặc yêu cầu ký quỹ phải nêu đối tượng, thời hạn, mức tiền, bên giữ tiền, điều kiện giải phóng và xử lý tranh chấp. Công tắc phần mềm không thay thế đăng ký, hợp đồng hay giấy phép cần thiết.",
          ],
        },
        {
          title: "Hành vi bị hạn chế & xử lý cảnh báo",
          paragraphs: [
            "Không đăng tài sản cấm, không có quyền cho thuê, giả giấy tờ, giả bằng chứng thanh toán hoặc lịch sử; không chiếm đoạt, quấy rối hoặc lừa dối. Khi có dấu hiệu, RELOO có thể hạn chế nghiệp vụ cần thiết để kiểm tra và thông báo cơ chế xem xét.",
            "Thông tin lộ email, lỗi nguồn tra cứu hoặc IP dùng chung không tự chứng minh gian lận. Ba vụ giả mạo được xác nhận với bằng chứng và đúng chủ thể có thể dẫn đến hạn chế tài khoản; người dùng vẫn được gửi yêu cầu xem xét và tiếp cận quyền hợp pháp.",
          ],
        },
        {
          title: "Trách nhiệm & quyền người dùng",
          paragraphs: [
            "Không có điều khoản nào loại trừ trách nhiệm bắt buộc của RELOO, cản trở quyền khiếu nại/khởi kiện hoặc cho phép tùy ý thay đổi hợp đồng đã giao kết. Bồi thường, phạt, hủy, hoàn tiền được xử lý theo thỏa thuận hợp pháp và căn cứ thực tế.",
            "Bộ quy chế phải được công bố, rà soát pháp lý và gắn với hồ sơ đăng ký nền tảng. Việc khai báo pháp nhân trong CRM không tự hoàn thành thủ tục với cơ quan quản lý.",
          ],
        },
      ],
    },
    "rental-guide": {
      title: "Thỏa thuận thuê & bàn giao tài sản",
      sections: [
        {
          title: "Trước khi xác nhận",
          paragraphs: [
            "Kiểm tra quyền cho thuê, ảnh thật, thông số, phụ kiện, khu vực và tình trạng. Xác nhận rõ giá thuê, ngày giờ nhận/trả, phương thức giao nhận, chi phí phát sinh, điều kiện hủy và trách nhiệm khi hỏng/mất.",
          ],
        },
        {
          title: "Bằng chứng của hai bên",
          paragraphs: [
            "Trao đổi và xác nhận trên RELOO để lưu thông điệp dữ liệu. Hai bên cùng lập ghi nhận bàn giao/hoàn trả kèm ảnh, danh sách phụ kiện và tình trạng. Chữ ký hệ thống và neo mã băm hỗ trợ kiểm tra toàn vẹn; không thay thế chứng thực hay chữ ký số chuyên dùng khi pháp luật yêu cầu.",
          ],
        },
        {
          title: "Bảo vệ tài sản & thông tin",
          paragraphs: [
            "Không dùng tài sản trái mục đích, không chia sẻ tài khoản hoặc mã OTP, không gửi căn cước trong chat. Dữ liệu xác minh dùng luồng riêng và quyền truy cập theo mục đích.",
          ],
        },
        {
          title: "Xử lý phát sinh",
          paragraphs: [
            "Thông báo bên còn lại và gửi yêu cầu hỗ trợ kèm bằng chứng nếu có chênh lệch tình trạng, quá hạn, mất/hỏng hoặc bất đồng. Giữ nguyên lịch sử; điều chỉnh bằng thỏa thuận mới hoặc bản ghi giải quyết được xác nhận.",
          ],
        },
      ],
    },
    help: {
      title: "Khiếu nại & giải quyết tranh chấp",
      sections: [
        {
          title: "Tiếp nhận",
          paragraphs: [
            `Gửi yêu cầu qua kênh hỗ trợ trong RELOO hoặc ${contact}, kèm mã cuộc trao đổi/thỏa thuận, nội dung, mốc thời gian, yêu cầu xử lý và chứng cứ. Không bắt buộc công khai dữ liệu nhạy cảm để được hỗ trợ.`,
          ],
        },
        {
          title: "Đối chiếu & thương lượng",
          paragraphs: [
            "RELOO ghi nhận hồ sơ, xác định các bên, phân quyền nhân sự xử lý và lưu việc tiếp cận chứng cứ. Các bên được bổ sung thông tin, nhận phản hồi và thương lượng. Không buộc chấp nhận quyết định của bot hoặc buộc từ bỏ quyền yêu cầu cơ quan có thẩm quyền.",
            "Trường hợp thuộc Luật Bảo vệ quyền lợi người tiêu dùng, việc tiếp nhận và tiến hành thương lượng tuân theo Điều 56, 57; quy trình nội bộ không được kéo dài thời hạn luật định.",
          ],
        },
        {
          title: "Biện pháp bảo vệ & quyết định",
          paragraphs: [
            "Có thể tạm hạn chế nghiệp vụ liên quan hoặc đề nghị bên giữ tiền có thẩm quyền bảo toàn khoản đang tranh chấp theo thỏa thuận hợp pháp. Việc hạn chế phải có căn cứ, phạm vi, thời hạn và đường yêu cầu xem xét.",
            "Kết quả xử lý được ghi thành văn bản/thông điệp dữ liệu, nêu căn cứ, trách nhiệm, khoản tiền nếu có và cách thực hiện. Một tranh chấp chưa thống nhất được có thể tiếp tục hòa giải, trọng tài khi đủ điều kiện hoặc khởi kiện theo pháp luật.",
          ],
        },
        {
          title: "Bảo mật hồ sơ",
          paragraphs: [
            "Chỉ nhân sự có quyền và mục đích hỗ trợ vụ việc được tiếp cận dữ liệu cần thiết. Không công khai ảnh căn cước, ngân hàng, IP hoặc gán nhãn lừa đảo khi chưa đủ căn cứ. Khi có dấu hiệu tội phạm, phối hợp cơ quan có thẩm quyền theo quy định.",
          ],
        },
      ],
    },
    "privacy-annex": {
      title: "Dữ liệu cá nhân & xác minh điện tử",
      sections: [
        {
          title: "Mục đích & lựa chọn",
          paragraphs: [
            "Xử lý thông tin cần cho đăng nhập, hồ sơ, giao dịch, phòng ngừa rủi ro và hỗ trợ. Cookie đo lường/quảng bá cần lựa chọn riêng. RELOO không đọc cookie hoặc lịch sử của website khác để tự lập hồ sơ người dùng.",
            "Sau khi người dùng xác nhận gửi hồ sơ, RELOO xử lý OCR ảnh thẻ tại hệ thống riêng để đối chiếu số định danh và họ tên mặt trước với QR. Thông tin khớp rõ ràng và giấy tờ còn hạn được duyệt tự động; không khớp, thiếu hoặc chưa đọc chắc chắn được chuyển admin tối đa 3 ngày. Chân dung và video được lưu cùng hồ sơ. Kết quả khớp giấy tờ không phải chứng nhận sinh trắc học hoặc xác nhận từ cơ sở dữ liệu quốc gia. Hồ sơ mới không gửi sang VNPT.",
          ],
        },
        {
          title: "Lưu trữ & nhà cung cấp",
          paragraphs: [
            "Cơ sở dữ liệu ứng dụng và bằng chứng của RELOO được lưu trên máy chủ tại Việt Nam. Ảnh thẻ, chân dung, video và OCR thô tại RELOO được mã hóa và hết hạn lưu sau 30 ngày. Thông tin định danh đã xác nhận chỉ giữ trong thời hạn cần cho tài khoản và nghĩa vụ hợp pháp.",
            "Google, Cloudflare, nguồn cảnh báo và đơn vị thanh toán xử lý dữ liệu cần cho dịch vụ đang được sử dụng. VNPT đang tạm dừng trong luồng xác minh hiện tại. Nơi lưu dữ liệu ứng dụng không tự loại bỏ nghĩa vụ rà soát nhà cung cấp, dữ liệu chuyển xuyên biên giới, đánh giá tác động và hồ sơ quản lý.",
          ],
        },
        {
          title: "Quyền của bạn",
          paragraphs: [
            `Có thể yêu cầu truy cập, sửa sai, xóa hoặc hạn chế xử lý, rút lựa chọn cookie và gửi khiếu nại. Đầu mối bảo vệ dữ liệu: ${entity.privacyEmail || "chưa khai báo; có thể gửi qua kênh hỗ trợ RELOO"}.`,
            "Yêu cầu phải được đối chiếu chủ thể và xử lý theo căn cứ, thời hạn pháp luật; dữ liệu phải giữ cho chứng từ, tranh chấp hoặc nghĩa vụ luật định cần được giải thích cụ thể. Không tự xóa chứng cứ đang được giữ hợp pháp hoặc giữ dữ liệu vô thời hạn chỉ vì tiện vận hành.",
          ],
        },
        {
          title: "Kiểm soát tổ chức",
          paragraphs: [
            "Đơn vị vận hành cần lập hồ sơ đánh giá tác động, phân công trách nhiệm, hợp đồng xử lý với nhà cung cấp, quy trình sự cố, kiểm soát truy cập, sao lưu/khôi phục và lưu việc xử lý yêu cầu chủ thể. Đặc biệt rà soát dữ liệu nhạy cảm khi sử dụng sinh trắc học.",
          ],
        },
      ],
    },
    "deposit-terms": {
      title: "Điều kiện chương trình ký quỹ",
      sections: [
        {
          title: "Điều kiện kích hoạt",
          paragraphs: [
            "Chương trình hiện chỉ được vận hành khi khai báo đúng chủ thể, bên giữ tiền đủ điều kiện, hợp đồng dịch vụ và chương trình, phương thức xác nhận và đối soát. Bật trên CRM không tự cho phép nhận/giữ tiền nếu thiếu điều kiện pháp lý hoặc kết nối.",
          ],
        },
        {
          title: "Thông tin cần công bố",
          paragraphs: [
            "Công bố tài sản/đối tượng áp dụng, mức bảo đảm, phí, thời hạn, bên giữ tiền, cách thanh toán, điều kiện giải phóng, hoàn trả, bảo toàn tiền khi tranh chấp và đầu mối hỗ trợ. Người dùng cần xem và đồng ý trước khi áp dụng.",
          ],
        },
        {
          title: "Đối soát & giải phóng",
          paragraphs: [
            "Chỉ ghi nhận tiền sau khi đối chiếu giao dịch ngân hàng. Không dựa vào ảnh chụp chuyển khoản hoặc cờ thành công ở trình duyệt. Giải phóng/hoàn trả phải theo quyền và điều kiện đã xác nhận; chứng từ và khoản điều chỉnh phải được lưu đầy đủ.",
          ],
        },
      ],
    },
  };
  return documents[slug] ? { ...common, ...documents[slug] } : null;
}
