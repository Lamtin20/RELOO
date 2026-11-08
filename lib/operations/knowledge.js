export const SUPPORT_KNOWLEDGE = [
  { title: "Thanh toán", url: "/cms/terms", text: "RELOO kết nối người thuê và chủ đồ. Hai bên tự thỏa thuận giá, tiền cọc, thanh toán và giao nhận. RELOO không nhận hoặc giữ tiền giao dịch." },
  { title: "Xác minh", url: "/safety", text: "Tài khoản PENDING cần được xác minh. MATCH có bằng chứng sẽ bị hạn chế và mở hồ sơ cho admin. Không tìm thấy và lỗi nguồn không đủ để kết luận một tài khoản an toàn hay lừa đảo. Có thể gửi yêu cầu xem xét tại Hồ sơ an toàn." },
  { title: "Căn cước", url: "/dashboard/kyc/verify", text: "Có thể gửi căn cước hai mặt và chân dung cùng sự đồng ý xử lý. Ảnh mã hóa được lưu ở Việt Nam tối đa 30 ngày. OCR và face match hỗ trợ đối chiếu; admin phải xem xét giấy tờ và người thật." },
  { title: "Giao hàng", url: "/shipping", text: "Phí GHTK là tạm tính theo địa chỉ và khối lượng. Tạm tính không tự tạo vận đơn; phí chiều về cần tính riêng." },
  { title: "Hoàn tiền", url: "/cashback/terms", text: "Hoàn tiền cần nhà cung cấp affiliate chấp thuận, liên kết có mã theo dõi và đơn được xác nhận. Không bảo đảm hoàn tiền cho đơn không được ghi nhận, đơn hủy hay bị từ chối." },
  { title: "Phiên truy cập", url: "/auth", text: "Phiên đăng nhập được làm mới tự động khi hợp lệ. Người dùng có thể đăng xuất chủ động. Đổi mật khẩu, thu hồi phiên hoặc lỗi xác thực thực sự có thể yêu cầu đăng nhập lại. Khi có tín hiệu VPN, có thể xem trang nhưng phải tắt VPN để giao dịch và chat." },
];
export function supportContext(question) {
  const words = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\W+/).filter((word) => word.length > 2);
  return SUPPORT_KNOWLEDGE.map((item) => ({ ...item, score: words.filter((word) => (item.title + " " + item.text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(word)).length })).sort((a, b) => b.score - a.score).slice(0, 3);
}
