import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
export default function CashbackTerms() {
  return (
    <MarketplaceShell>
      <article className="container feature-article">
        <Link href="/cashback" className="r-text-link">
          <ArrowLeft size={16} />
          Mua sắm hoàn tiền
        </Link>
        <h1>Điều kiện hoàn tiền</h1>
        <h2>Liên kết và ghi nhận đơn</h2>
        <p>
          Bạn cần đăng nhập tài khoản đủ điều kiện và tạo liên kết mua hàng trên
          RELOO. Việc tạo liên kết chưa xác nhận đơn hàng hoặc khoản hoàn. Đơn
          chỉ được ghi nhận theo báo cáo của đối tác affiliate.
        </p>
        <h2>Mức hoàn theo sản phẩm</h2>
        <p>
          Mức hoàn phụ thuộc sản phẩm, chiến dịch và hoa hồng thực tế được đối
          tác duyệt. Khoản dự kiến có thể thay đổi khi áp dụng mã giảm giá, hủy,
          trả hàng hoặc khi đơn không đáp ứng điều kiện chiến dịch. Không có mức
          hoàn hoặc thưởng đơn đầu cố định khi chưa được công bố và phê duyệt.
        </p>
        <h2>Đối soát và chi trả</h2>
        <p>
          Đơn có ba trạng thái: chờ duyệt, đối tác đã duyệt và không đủ điều
          kiện. Thời gian xác nhận phụ thuộc đối tác. Khoản đã duyệt chưa đồng
          nghĩa với tiền đã chi trả. RELOO chưa mở rút tiền tự động khi chưa có
          kết nối đối soát và thanh toán được xác nhận.
        </p>
        <h2>Điều kiện chương trình</h2>
        <p>
          Chương trình chỉ mở sau khi nhà cung cấp cho phép mô hình hoàn tiền và
          tài khoản publisher được cấp quyền chiến dịch. RELOO không sử dụng tỷ
          lệ hoàn mẫu thay cho dữ liệu từ đối tác.
        </p>
        <Link className="r-text-link" href="/help">
          Liên hệ hỗ trợ <ArrowLeft size={16} />
        </Link>
      </article>
    </MarketplaceShell>
  );
}
