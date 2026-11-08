import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { NeighborhoodAdmin } from "@/components/neighborhood/NeighborhoodAdmin";
import { text } from "@/lib/neighborhood/content";
export const metadata = {
  title: text("vi-VN", "admin"),
  robots: { index: false, follow: false },
};
// Data and all mutations independently require the existing CRM AAL2 receipt + scopes.
export default function Page() {
  return (
    <MarketplaceShell>
      <div className="container" style={{ padding: "28px 16px" }}>
        <NeighborhoodAdmin />
      </div>
    </MarketplaceShell>
  );
}
