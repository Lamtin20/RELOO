import { EmptyState } from "@/components/ui";
import { ListingCard } from "./ListingCard";

export function ListingGrid({
  listings = [],
  viewerAddress = null,
  emptyTitle = "Không tìm thấy sản phẩm",
  emptyDescription = "Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem thêm sản phẩm khác.",
  layout = "grid",
  estimatedDays = 0,
  rentalSelection = null,
  priceMode = null,
  emptyAction = null,
}) {
  if (!listings.length) {
    return (
      <EmptyState
        icon="PackageSearch"
        title={emptyTitle}
        description={emptyDescription}
        showMascot
        action={emptyAction}
      />
    );
  }

  const gridClass =
    layout === "carousel"
      ? "product-grid product-grid--carousel"
      : "product-grid";

  return (
    <div className={gridClass}>
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          viewerAddress={viewerAddress}
          estimatedDays={estimatedDays}
          rentalSelection={rentalSelection}
          priceMode={priceMode}
        />
      ))}
    </div>
  );
}
