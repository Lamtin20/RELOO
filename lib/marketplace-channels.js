export const MARKET_CHANNELS = Object.freeze([
  { id: "ALL", label: "Dành cho bạn" },
  { id: "RENT", label: "Cho thuê" },
  { id: "SALE", label: "Mua bán" },
  { id: "AFFILIATE", label: "Ưu đãi liên kết" },
  { id: "BRAND", label: "Local Brand" },
]);
export function matchesMarketChannel(listing, channel) {
  if (channel === "RENT") return listing.transactionMode !== "SALE";
  if (channel === "SALE")
    return (
      ["SALE", "BOTH"].includes(listing.transactionMode) &&
      Number(listing.salePrice) > 0
    );
  return channel === "ALL";
}
export function commerceLabel(listing) {
  return listing.transactionMode === "SALE"
    ? "Đang bán"
    : listing.transactionMode === "BOTH"
      ? "Thuê hoặc mua"
      : "Cho thuê";
}
export function safePartnerImage(value) {
  return (
    typeof value === "string" &&
    !value.split("/").some((segment) => segment === "." || segment === "..") &&
    (/^\/api\/media\/[a-f0-9-]+$/i.test(value) ||
      /^\/images\/[a-z0-9/_.-]+$/i.test(value))
  );
}
export function publicTransactionMode(value){return ['RENT','SALE','BOTH'].includes(value)?value:'RENT';}
