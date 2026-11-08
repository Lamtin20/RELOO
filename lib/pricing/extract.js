import { load } from "cheerio";
import { matchesProductTitle } from "./sources.js";
function publicText(value, limit) {
  return load(String(value || ""))
    .text()
    .replace(/\s+/g, " ")
    .replace(
      /(?:\+84|0)[\s.()-]*[35789](?:[\s.()-]*\d){8}\b/g,
      "[đã ẩn số liên hệ]",
    )
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[đã ẩn email]")
    .slice(0, limit);
}
export function extractPrice(html, target) {
  const $ = load(html),
    products = [];
  function visit(value, depth = 0) {
    if (!value || depth > 15 || products.length > 100) return;
    if (Array.isArray(value)) {
      value.slice(0, 500).forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value !== "object") return;
    const types = Array.isArray(value["@type"])
      ? value["@type"]
      : [value["@type"]];
    if (types.includes("Product")) products.push(value);
    for (const key of ["@graph", "itemListElement", "item", "mainEntity"])
      if (value[key]) visit(value[key], depth + 1);
  }
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      visit(JSON.parse($(element).text()));
    } catch {
      /* Ignore malformed structured data; never guess prices from unrelated page text. */
    }
  });
  const product = products.find((item) =>
    matchesProductTitle(
      `${typeof item.brand === "object" ? item.brand?.name || "" : item.brand || ""} ${item.name || ""}`,
      target,
    ),
  );
  if (!product)
    return {
      status: products.length ? "MODEL_MISMATCH" : "NO_STRUCTURED_PRICE",
    };
  const offers = Array.isArray(product.offers)
    ? product.offers
    : [product.offers];
  const valid = offers.filter(
    (offer) =>
      offer &&
      offer.priceCurrency === "VND" &&
      /^\d+(?:\.0+)?$/.test(String(offer.price)) &&
      Number(offer.price) >= 1000 &&
      Number(offer.price) <= 1000000000,
  );
  if (
    !valid.length ||
    new Set(valid.map((offer) => Number(offer.price))).size !== 1
  )
    return { status: "NO_STRUCTURED_PRICE" };
  const offer = valid[0],
    condition = String(offer.itemCondition || product.itemCondition || "");
  if (
    target.price_kind === "new_retail" &&
    condition &&
    !condition.endsWith("NewCondition")
  )
    return { status: "MODEL_MISMATCH" };
  if (
    target.price_kind !== "new_retail" &&
    condition &&
    (condition.endsWith("DamagedCondition") ||
      condition.endsWith("RefurbishedCondition") ||
      (condition.endsWith("NewCondition") && target.condition !== "new") ||
      (condition.endsWith("UsedCondition") && target.condition === "new"))
  )
    return { status: "MODEL_MISMATCH" };
  const inStock = String(offer.availability || "").endsWith("InStock");
  return {
    status: "SUCCESS",
    snapshot: {
      title: publicText(product.name, 300),
      description: publicText(product.description, 4000),
      price: Number(offer.price),
      in_stock: inStock,
      condition:
        target.price_kind === "new_retail"
          ? "new"
          : target.condition || "unknown",
    },
  };
}
