import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "../supabase/admin.js";
import {
  affiliateStatus,
  classifyProductUrl,
  rewardShare,
} from "./provider.js";
import { HttpError } from "../server/http.js";
export function normalizeCatalogProduct(item, now = Date.now()) {
  if (
    !item ||
    item.provider !== "accesstrade" ||
    typeof item.id !== "string" ||
    !item.id ||
    item.id.length > 150 ||
    typeof item.title !== "string" ||
    !item.title.trim() ||
    item.title.length > 300 ||
    typeof item.category !== "string" ||
    item.category.length > 80
  )
    throw new HttpError(400, "Sản phẩm trong feed thiếu thông tin hợp lệ.");
  const link = classifyProductUrl(item.originalUrl),
    price = Number(item.price),
    observed = Date.parse(item.observedAt),
    expires = Date.parse(item.expiresAt);
  if (
    link.merchant !== item.merchant ||
    !Number.isSafeInteger(price) ||
    price < 1 ||
    price > 1000000000 ||
    !Number.isFinite(observed) ||
    observed > now ||
    now - observed > 7 * 86400000 ||
    !Number.isFinite(expires) ||
    expires <= now ||
    expires <= observed ||
    expires - observed > 7 * 86400000 ||
    typeof item.inStock !== "boolean" ||
    !/^https:\/\//.test(item.sourceReference || "")
  )
    throw new HttpError(
      400,
      "Feed cần giá, hiệu lực và nguồn đối tác được xác nhận.",
    );
  const commission = item.commissionBps;
  if (
    commission !== null &&
    commission !== undefined &&
    (!Number.isInteger(commission) || commission < 0 || commission > 10000)
  )
    throw new HttpError(
      400,
      "Tỷ lệ hoa hồng phải là basis points của đối tác.",
    );
  return {
    id: createHash("sha256")
      .update(`accesstrade:${item.merchant}:${item.id}`)
      .digest("hex"),
    source: item.provider,
    merchant: item.merchant,
    title: item.title.trim(),
    image_url:
      typeof item.image === "string" &&
      /^https:\/\//.test(item.image) &&
      item.image.length < 2000
        ? item.image
        : null,
    original_url: link.url,
    price,
    category: item.category || "Khác",
    commission_bps: commission ?? null,
    in_stock: item.inStock,
    source_updated_at: new Date(observed).toISOString(),
    expires_at: new Date(expires).toISOString(),
    source_reference: item.sourceReference,
  };
}
export function publicCatalogProduct(row) {
  const approved = affiliateStatus().merchants[row.merchant];
  return {
    id: row.id,
    merchant: row.merchant,
    title: row.title,
    image: row.image_url,
    originalUrl: row.original_url,
    price: row.price,
    category: row.category,
    source: row.source,
    fetchedAt: row.source_updated_at,
    expiresAt: row.expires_at,
    cashbackPercent:
      approved && Number.isInteger(row.commission_bps)
        ? Math.floor(row.commission_bps * rewardShare()) / 100
        : null,
  };
}
export async function readCatalog({
  keyword = "",
  merchant = "all",
  category = "",
  offset = 0,
  sort = "recommended",
  limit = 24,
} = {}) {
  const db = createSupabaseAdminClient();
  if (!db) return { products: [], nextOffset: null, available: false };
  let query = db
    .from("affiliate_products")
    .select("*", { count: "exact" })
    .eq("in_stock", true)
    .gt("expires_at", new Date().toISOString())
    .order(sort === "price_asc" ? "price" : "source_updated_at", {
      ascending: sort === "price_asc",
    })
    .order("id")
    .range(offset, offset + limit - 1);
  if (merchant !== "all") query = query.eq("merchant", merchant);
  if (category) query = query.eq("category", category);
  if (keyword)
    query = query.ilike("title", `%${keyword.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error, count } = await query;
  if (error) return { products: [], nextOffset: null, available: false };
  return {
    products: (data || []).map(publicCatalogProduct),
    nextOffset: offset + limit < count ? offset + limit : null,
    available: true,
  };
}
