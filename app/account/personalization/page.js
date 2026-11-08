import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { CareSettings } from "@/components/rental-care/CareSettings";
export default async function Page({ searchParams }) {
  const params = await searchParams;
  return (
    <MarketplaceShell>
      <CareSettings
        mode="personalization"
        initialLocale={params.lang === "en-US" ? "en-US" : "vi-VN"}
      />
    </MarketplaceShell>
  );
}
