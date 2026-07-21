import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, FOOTER_FEATURED_SLUGS } from "@/lib/constants";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  const year = new Date().getFullYear();

  const featuredCategories = FOOTER_FEATURED_SLUGS.map((slug) =>
    CATEGORIES.find((cat) => cat.slug === slug)
  ).filter(Boolean);

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-col footer-brand">
          <div className="footer-brand__lockup">
            <Logo size="lg" href={null} />
          </div>
          <p className="footer-brand__desc">
            Sàn cho thuê đồ dùng, thiết bị tại TP.HCM. Đăng tin miễn phí, thuê theo ngày, giao nhận
            tận nơi hoặc gặp trực tiếp.
          </p>
          <p className="footer-brand__cert">
            Đã thông báo Bộ Công Thương · Mã số thương mại điện tử: RELOO-2026
          </p>
        </div>

        <div className="footer-col footer-col--cats">
          <h4>Danh mục phổ biến</h4>
          <ul className="footer-cats">
            {featuredCategories.map((cat) => (
              <li key={cat.id}>
                <Link href={`/explore?category=${cat.slug}`} className="footer-link">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/explore" className="footer-cats__all">
            Xem tất cả danh mục
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="footer-col">
          <h4>Hỗ trợ</h4>
          <ul>
            <li>
              <Link href="/help" className="footer-link">
                Câu hỏi thường gặp
              </Link>
            </li>
            <li>
              <Link href="/cms/about" className="footer-link">
                Giới thiệu RELOO
              </Link>
            </li>
            <li>
              <Link href="/dashboard/assets/new" className="footer-link">
                Đăng tin cho thuê
              </Link>
            </li>
            <li>
              <Link href="/explore" className="footer-link">
                Tìm đồ cần thuê
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Pháp lý</h4>
          <ul>
            <li>
              <Link href="/cms/rental-guide" className="footer-link">
                Quy trình cho thuê
              </Link>
            </li>
            <li>
              <Link href="/cms/terms" className="footer-link">
                Quy chế hoạt động
              </Link>
            </li>
            <li>
              <Link href="/cms/privacy" className="footer-link">
                Bảo mật thông tin
              </Link>
            </li>
            <li>
              <Link href="/cms/help" className="footer-link">
                Giải quyết tranh chấp
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {year} Công ty TNHH RELOO Việt Nam</span>
        <span>Hotline: 1900 6868 · hotline@reloo.vn</span>
      </div>
    </footer>
  );
}
