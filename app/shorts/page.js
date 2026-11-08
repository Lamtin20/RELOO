import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { ShortFeed } from "@/components/shorts/ShortFeed";
export const metadata = {
  title: "RELOO Shorts – Video giới thiệu đồ thuê",
  description:
    "Khám phá video ngắn và sản phẩm được gắn ngay trong video trên RELOO.",
};
export default async function ShortsPage({ searchParams }) {
  const params = await searchParams;
  return (
    <MarketplaceShell hideHeader hideFooter hideBottomNav>
      <ShortFeed initialId={params.id || ""} />
    </MarketplaceShell>
  );
}
