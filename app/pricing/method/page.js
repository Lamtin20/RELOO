import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import Link from "next/link";
export default function PricingMethod() {
  return (
    <MarketplaceShell>
      <article className="container privacy-page">
        <h1>Cách RELOO đề xuất giá</h1>
        <section>
          <h2>Đối chiếu đúng sản phẩm</h2>
          <p>
            Ưu tiên cùng thương hiệu, model, phiên bản và danh mục. Giá đồ đã
            dùng và giá thuê phải có cùng tình trạng khai báo. Tin trùng URL chỉ
            lấy lần ghi nhận gần nhất.
          </p>
        </section>
        <section>
          <h2>Tách từng loại giá</h2>
          <p>
            Giá bán mới, giá rao đồ cũ, giá thu mua và giá thuê là các dữ liệu
            khác nhau. Giá rao không chứng minh đã bán được. Bảng giá thu mua
            không được dùng như giá trị bán lại của chủ đồ.
          </p>
        </section>
        <section>
          <h2>Mẫu và thời hạn</h2>
          <p>
            Cần ít nhất 3 mức giá hợp lệ trong mỗi nhóm. Dữ liệu bán mới có hiệu
            lực tham khảo tối đa 2 ngày; giá rao và giá thuê tối đa 7 ngày. Giá
            quá hạn, hết hàng, khác cấu hình và mức lệch xa trung vị bị loại.
            Kết quả còn ít nguồn được đánh dấu mức chắc chắn thấp.
          </p>
        </section>
        <section>
          <h2>Khi chưa có dữ liệu</h2>
          <p>
            Bạn có thể nhập giá mua/giá bán mới. Giá trị đề xuất dùng hệ số tình
            trạng: mới 100%, như mới 85%, tốt 72%, khá 50%; đồ đã dùng áp dụng
            hệ số giữ giá 88% mỗi năm. Khoảng tham khảo là ±15%. Đây là quy tắc
            thử nghiệm của RELOO, không phải báo giá thị trường hay cam kết thu
            mua.
          </p>
        </section>
        <section>
          <h2>Giá cho thuê</h2>
          <p>
            Nếu đủ tin giá thuê tương đồng, dùng trung vị và khoảng giá của nhóm
            đó. Nếu chưa đủ, tính giá thuê từ giá trị đồ và hệ số danh mục hiện
            có của RELOO. Chủ đồ có thể chỉnh giá; lịch trống, tiền cọc và giao
            nhận phải được hai bên xác nhận.
          </p>
        </section>
        <section>
          <h2>Thu thập nguồn</h2>
          <p>
            Bộ thu thập chỉ mở nguồn được bật, kiểm tra robots.txt, giới hạn
            nhịp truy cập, không vượt chặn hoặc đăng nhập. Giá được đọc từ dữ
            liệu sản phẩm có cấu trúc và lưu URL, thời điểm, nội dung sản phẩm
            và dấu kiểm tra. Nguồn không truy cập được được ghi nhận riêng,
            không tạo giá thay thế.
          </p>
        </section>
        <Link className="btn btn-primary" href="/pricing">
          Định giá món đồ
        </Link>
      </article>
    </MarketplaceShell>
  );
}
