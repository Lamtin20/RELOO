import { affiliateStatus, fetchProductFeed } from "@/lib/affiliate/provider";
import { readCatalog } from "@/lib/affiliate/catalog";
import { errorResponse, HttpError, rateLimit } from "@/lib/server/http";
const cache = new Map();
export async function GET(request) {
  try {
    rateLimit(request, "affiliate-products", 30);
    const params = new URL(request.url).searchParams,
      keyword = (params.get("q") || "").trim().slice(0, 80),
      merchant = params.get("merchant") || "all",
      category = (params.get("category") || "").slice(0, 80),
      sort = params.get("sort") || "recommended";
    if (
      !["all", "shopee", "tiktok"].includes(merchant) ||
      !["recommended", "price_asc"].includes(sort)
    )
      throw new HttpError(400, "Bộ lọc sản phẩm không hợp lệ.");
    let cursor = { offset: 0, token: "", catalogDone: false };
    const raw = params.get("cursor");
    if (raw) {
      try {
        cursor = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
      } catch {
        throw new HttpError(400, "Trang sản phẩm không hợp lệ.");
      }
      if (
        raw.length > 2000 ||
        !Number.isInteger(cursor.offset) ||
        cursor.offset < 0 ||
        cursor.offset > 10000 ||
        typeof cursor.token !== "string" ||
        cursor.token.length > 1000 ||
        typeof cursor.catalogDone !== "boolean"
      )
        throw new HttpError(400, "Trang sản phẩm không hợp lệ.");
    }
    const key = JSON.stringify({
      keyword,
      merchant,
      category,
      sort,
      cursor,
      connected: affiliateStatus().connected,
      approved: affiliateStatus().cashbackApproved,
    });
    if (cache.get(key)?.until > Date.now())
      return Response.json(cache.get(key).value, {
        headers: {
          "Cache-Control": `private, max-age=${Math.max(0, Math.floor((cache.get(key).until - Date.now()) / 1000))}`,
        },
      });
    const catalog = cursor.catalogDone
      ? { products: [], nextOffset: null, available: true }
      : await readCatalog({
          keyword,
          merchant,
          category,
          sort,
          offset: cursor.offset,
        });
    let feed = { products: [], nextPageToken: null },
      feedError = null;
    if (
      merchant !== "shopee" &&
      !category &&
      affiliateStatus().connected &&
      (!raw || cursor.token)
    ) {
      try {
        feed = await fetchProductFeed(keyword || "đồ dùng", {
          pageToken: cursor.token,
          sort: sort === "price_asc" ? "LOW_PRICE" : "BEST_SELLERS",
        });
      } catch (error) {
        feedError = error.message;
        if (!catalog.products.length) throw error;
      }
    }
    const seen = new Set(),
      products = [...catalog.products, ...feed.products].filter((item) => {
        const id = `${item.merchant}:${item.originalUrl}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    if (sort === "price_asc") products.sort((a, b) => a.price - b.price);
    const nextCursor =
      catalog.nextOffset !== null || feed.nextPageToken
        ? Buffer.from(
            JSON.stringify({
              offset: catalog.nextOffset || cursor.offset,
              token: feed.nextPageToken || "",
              catalogDone: catalog.nextOffset === null,
            }),
          ).toString("base64url")
        : null;
    const value = {
      ok: true,
      available: catalog.available || affiliateStatus().connected,
      products,
      nextCursor,
      reason:
        feedError ||
        (!products.length && !affiliateStatus().connected
          ? "Chưa có feed sản phẩm đối tác được kết nối. Sản phẩm được nhập từ nguồn đã cấp quyền sẽ hiển thị tại đây."
          : null),
    };
    if (cache.size > 100) cache.clear();
    const expiry = Math.min(
      Date.now() + 60000,
      ...products
        .map((item) => Date.parse(item.expiresAt))
        .filter(Number.isFinite),
    );
    cache.set(key, { until: expiry, value });
    return Response.json(value, {
      headers: {
        "Cache-Control": `private, max-age=${Math.max(0, Math.floor((expiry - Date.now()) / 1000))}`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
