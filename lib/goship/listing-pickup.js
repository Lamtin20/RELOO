import { formatListingAddress } from "@/lib/listing-location";
import { formatGoshipAddress } from "@/lib/rent-draft";

/**
 * Địa chỉ lấy hàng từ tin đăng (chủ đồ đã khai báo) — người thuê chỉ xem, không chỉnh sửa
 */
export function buildListingPickupAddress(listing, owner) {
  const goship = listing?.locationDetails?.goship;
  const street =
    listing?.locationDetails?.addressDetail?.trim() ||
    listing?.location?.split(",")[0]?.trim() ||
    "";

  if (goship?.city?.id && goship?.district?.id && goship?.ward?.id) {
    return {
      name: owner?.name ?? goship.name ?? "",
      phone: owner?.phone ?? goship.phone ?? "",
      street: street || goship.street || "",
      city: goship.city,
      district: goship.district,
      ward: goship.ward,
      displayLine: formatGoshipAddress({
        street: street || goship.street,
        ward: goship.ward,
        district: goship.district,
        city: goship.city,
      }),
      source: "listing",
    };
  }

  const displayLine =
    formatListingAddress(listing?.locationDetails ?? {}) ||
    listing?.location ||
    "Chưa có địa chỉ lấy hàng";

  return {
    name: owner?.name ?? "",
    phone: owner?.phone ?? "",
    street,
    city: null,
    district: null,
    ward: null,
    displayLine,
    source: "listing-text",
  };
}
