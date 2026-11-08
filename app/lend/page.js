import Link from "next/link";
import { ArrowRight, ClipboardList, PackagePlus } from "lucide-react";
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { ListingComposer } from "@/components/owner/ListingComposer";
export default function LendPage() {
  return (
    <MarketplaceShell>
      <div className="container owner-page">
        <div className="market-audience">
          <Link href="/">Khám phá sản phẩm</Link>
          <Link href="/lend" aria-current="page">
            <PackagePlus size={16} />
            Đăng sản phẩm
          </Link>
        </div>
        <header className="owner-page__header">
          <div>
            <span className="r-eyebrow">ĐĂNG TIN RELOO</span>
            <h1>Đồ của bạn, thêm cơ hội được dùng.</h1>
            <p>Cho thuê, bán hoặc cả hai. Chọn giá và cách giao dịch phù hợp với món đồ của bạn.</p>
          </div>
          <Link href="/dashboard/assets" className="owner-text-link">
            <ClipboardList size={17} />
            Quản lý tin <ArrowRight size={15} />
          </Link>
        </header>
        
        <ListingComposer />
      </div>
    </MarketplaceShell>
  );
}
