import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { PricingEstimator } from "@/components/pricing/PricingEstimator";
export const metadata = { title: "Định giá đồ & giá thuê tham khảo | RELOO" };
export default function PricingPage() {
  return (
    <MarketplaceShell>
      <div className="container pricing-page">
        <PricingEstimator headingLevel={1} />
      </div>
    </MarketplaceShell>
  );
}
