export const PRICE_SOURCES = [
  {
    id: "chotot",
    name: "Chợ Tốt",
    hosts: ["www.chotot.com", "chotot.com", "www.chotot.vn", "chotot.vn"],
    kind: "used_asking",
  },
  {
    id: "tgdd",
    name: "Thế Giới Di Động",
    hosts: ["www.thegioididong.com", "thegioididong.com"],
    kind: "new_retail",
  },
  {
    id: "fpt",
    name: "FPT Shop",
    hosts: ["fptshop.com.vn", "www.fptshop.com.vn"],
    kind: "new_retail",
  },
  {
    id: "dmx",
    name: "Điện Máy Xanh",
    hosts: ["www.dienmayxanh.com", "dienmayxanh.com"],
    kind: "new_retail",
  },
  {
    id: "cellphones",
    name: "CellphoneS",
    hosts: ["cellphones.com.vn", "www.cellphones.com.vn"],
    kind: "new_retail",
  },
];
export const PRICE_KINDS = [
  "new_retail",
  "used_asking",
  "buyback",
  "rental_daily",
];
export function priceSource(id) {
  return PRICE_SOURCES.find((source) => source.id === id);
}
export function sourceUrl(value, sourceId) {
  const source = priceSource(sourceId);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL nguồn không hợp lệ.");
  }
  if (
    !source ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.href.length > 2000 ||
    !source.hosts.includes(url.hostname)
  )
    throw new Error("URL không thuộc nguồn được hỗ trợ.");
  url.hash = "";
  return url.href;
}
export function identityText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/(\d)\s+(gb|tb)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function productKey({ brand, model, variant = "" }) {
  return [brand, model, variant].map(identityText).join("|");
}
export function matchesProductTitle(title, target) {
  const text = identityText(title),
    tokens = new Set(text.split(" "));
  const required = identityText(`${target.model} ${target.variant || ""}`)
    .split(" ")
    .filter(Boolean);
  const brand = identityText(target.brand).split(" ").filter(Boolean);
  if (brand.length && !brand.every((token) => tokens.has(token))) return false;
  if (!required.length || !required.every((token) => tokens.has(token)))
    return false;
  const requested = new Set(required);
  for (const modifier of [
    "pro",
    "max",
    "plus",
    "mini",
    "ultra",
    "lite",
    "fe",
    "air",
    "se",
  ])
    if (tokens.has(modifier) && !requested.has(modifier)) return false;
  const titleStorage = [...tokens].filter((token) =>
    /^\d+(gb|tb)$/.test(token),
  );
  const wantedStorage = required.filter((token) => /^\d+(gb|tb)$/.test(token));
  if (
    titleStorage.length &&
    (!wantedStorage.length ||
      !titleStorage.every((token) => wantedStorage.includes(token)))
  )
    return false;
  return true;
}
