import { HttpError } from "../server/http.js";

const SHOPEE_HOSTS = new Set([
  "shopee.vn",
  "www.shopee.vn",
  "s.shopee.vn",
  "shope.ee",
]);
const TIKTOK_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "vt.tiktok.com",
  "vm.tiktok.com",
  "shop.tiktok.com",
]);
const TRACKING_HOSTS = new Set([
  "go.isclix.com",
  "isclix.com",
  "shorten.accesstrade.me",
  "shorten.accesstrade.vn",
  "tracking.accesstrade.me",
  "tracking.accesstrade.vn",
  "s.shopee.vn",
  "shope.ee",
  "www.tiktok.com",
  "vt.tiktok.com",
]);

export function classifyProductUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new HttpError(
      400,
      "Dán liên kết sản phẩm Shopee hoặc TikTok Shop hợp lệ.",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.href.length > 2000
  )
    throw new HttpError(
      400,
      "Liên kết cần dùng HTTPS và không chứa thông tin đăng nhập.",
    );
  const merchant = SHOPEE_HOSTS.has(url.hostname)
    ? "shopee"
    : TIKTOK_HOSTS.has(url.hostname)
      ? "tiktok"
      : null;
  if (!merchant)
    throw new HttpError(
      400,
      "Hiện hỗ trợ liên kết Shopee Việt Nam và TikTok Shop.",
    );
  url.hash = "";
  return { url: url.href, merchant };
}

export function affiliateStatus() {
  const connected = Boolean(process.env.ACCESSTRADE_ACCESS_KEY);
  const approved = process.env.AFFILIATE_CASHBACK_APPROVED === "true";
  return {
    provider: "accesstrade",
    connected,
    cashbackApproved: approved,
    merchants: {
      shopee:
        connected &&
        approved &&
        Boolean(process.env.ACCESSTRADE_SHOPEE_CAMPAIGN_ID),
      tiktok: connected && approved,
    },
    rewardShare: rewardShare(),
  };
}

export function rewardShare() {
  const share = Number(process.env.AFFILIATE_REWARD_SHARE || 0.7);
  if (!Number.isFinite(share) || share < 0 || share > 1)
    throw new HttpError(503, "Chính sách hoàn tiền chưa được cấu hình hợp lệ.");
  return share;
}
export function tiktokCommissionBps(
  value,
  unit = process.env.ACCESSTRADE_TIKTOK_COMMISSION_UNIT,
) {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (unit === "bps" && Number.isInteger(rate) && rate <= 10000) return rate;
  if (unit === "percent" && rate <= 100) return Math.round(rate * 100);
  return null;
}

async function providerRequest(path, options = {}) {
  const key = process.env.ACCESSTRADE_ACCESS_KEY;
  if (!key)
    throw new HttpError(
      503,
      "Chương trình đang chờ kết nối tài khoản đối tác. Chưa thể tạo link hoàn tiền.",
      "AFFILIATE_NOT_CONFIGURED",
    );
  let response;
  try {
    response = await fetch(new URL(path, "https://api.accesstrade.vn"), {
      ...options,
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new HttpError(
      502,
      "Chưa kết nối được đối tác affiliate.",
      "AFFILIATE_UNAVAILABLE",
    );
  }
  if (!response.ok)
    throw new HttpError(
      502,
      "Đối tác chưa chấp nhận yêu cầu. Kiểm tra quyền truy cập chiến dịch.",
      "AFFILIATE_REJECTED",
    );
  let body;
  try {
    body = await response.json();
  } catch {
    throw new HttpError(502, "Phản hồi đối tác không hợp lệ.");
  }
  if (body.success === false || body.status === false)
    throw new HttpError(
      502,
      "Sản phẩm hoặc chiến dịch chưa được đối tác chấp nhận.",
      "PRODUCT_NOT_ELIGIBLE",
    );
  return body;
}

export async function createAffiliateLink(rawUrl, clickId) {
  const { url, merchant } = classifyProductUrl(rawUrl);
  if (process.env.AFFILIATE_CASHBACK_APPROVED !== "true")
    throw new HttpError(
      503,
      "Chương trình đang chờ đối tác phê duyệt hình thức hoàn tiền.",
      "CASHBACK_NOT_APPROVED",
    );
  let body,
    candidate,
    product = null;
  if (merchant === "shopee") {
    const campaign = process.env.ACCESSTRADE_SHOPEE_CAMPAIGN_ID;
    if (!campaign)
      throw new HttpError(
        503,
        "Chiến dịch Shopee chưa được kết nối.",
        "SHOPEE_NOT_CONFIGURED",
      );
    body = await providerRequest("/v1/product_link/create", {
      method: "POST",
      body: JSON.stringify({
        campaign_id: campaign,
        urls: [url],
        utm_source: "reloo",
        utm_content: clickId,
        sub1: clickId,
      }),
    });
    const success = body.data?.success_link;
    const item = Array.isArray(success)
      ? success.find((entry) => entry.url_origin === url) ||
        (success.length === 1 ? success[0] : null)
      : null;
    candidate = item?.aff_link;
  } else {
    body = await providerRequest("/v2/tiktokshop_product_feeds/create_link", {
      method: "POST",
      body: JSON.stringify({
        product_url: url,
        utm_source: "reloo",
        utm_content: clickId,
        sub1: clickId,
      }),
    });
    candidate = body.data?.aff_url;
    if (body.data?.product_name)
      product = {
        title: String(body.data.product_name),
        price: Number(body.data.product_price?.amount),
        image: body.data.product_image,
      };
  }
  let tracking;
  try {
    tracking = new URL(candidate);
  } catch {
    throw new HttpError(502, "Đối tác chưa trả được liên kết affiliate.");
  }
  if (
    tracking.protocol !== "https:" ||
    tracking.username ||
    tracking.password ||
    tracking.port ||
    !TRACKING_HOSTS.has(tracking.hostname)
  )
    throw new HttpError(502, "Liên kết đối tác chưa được xác nhận an toàn.");
  return { merchant, originalUrl: url, affiliateUrl: tracking.href, product };
}

export async function fetchProductFeed(
  keyword = "đồ dùng",
  { pageToken = "", limit = 24, sort = "BEST_SELLERS" } = {},
) {
  const params = new URLSearchParams({
    sort_field: [
      "BEST_SELLERS",
      "LOW_PRICE",
      "HIGH_PRICE",
      "NEWLY_RELEASED",
      "RECOMMENDED",
      "HIGH_COMMISSION_RATE",
    ].includes(sort)
      ? sort
      : "BEST_SELLERS",
    limit: String(Math.min(50, Math.max(1, limit))),
    title_keywords: keyword.slice(0, 80) || "đồ dùng",
  });
  if (pageToken) {
    if (pageToken.length > 1000 || !/^[a-zA-Z0-9=_-]+$/.test(pageToken))
      throw new HttpError(400, "Trang sản phẩm không hợp lệ.");
    params.set("page_token", pageToken);
  }
  const body = await providerRequest(`/v2/tiktokshop_product_feeds?${params}`);
  if (!Array.isArray(body.data?.products))
    throw new HttpError(502, "Chưa đọc được danh sách sản phẩm từ đối tác.");
  const products = body.data.products
    .filter(
      (item) => item.has_inventory && item.sales_price?.currency === "VND",
    )
    .map((item) => {
      const price = Number(item.sales_price.minimum_amount);
      const rate = tiktokCommissionBps(item.commission?.rate);
      let url;
      try {
        url = classifyProductUrl(item.detail_link);
      } catch {
        return null;
      }
      if (
        url.merchant !== "tiktok" ||
        !Number.isFinite(price) ||
        price <= 0 ||
        price > 1000000000 ||
        !item.title ||
        !item.id
      )
        return null;
      return {
        id: String(item.id),
        merchant: "tiktok",
        title: String(item.title),
        image: /^https:\/\//.test(item.main_image_url || "")
          ? item.main_image_url
          : null,
        originalUrl: url.url,
        price: Number.isFinite(price) ? price : null,
        commissionBps:
          Number.isInteger(rate) && rate >= 0 && rate <= 10000 ? rate : null,
        cashbackPercent:
          affiliateStatus().cashbackApproved &&
          rate !== null &&
          Number.isFinite(rate) &&
          rate >= 0 &&
          rate <= 10000
            ? Math.floor(rate * rewardShare()) / 100
            : null,
        source: "accesstrade",
        category: "Khác",
        fetchedAt: new Date().toISOString(),
      };
    })
    .filter(Boolean);
  const token = body.data.next_page_token || body.next_page_token;
  return {
    products,
    nextPageToken:
      typeof token === "string" &&
      token !== pageToken &&
      token.length <= 1000 &&
      /^[a-zA-Z0-9=_-]+$/.test(token)
        ? token
        : null,
  };
}

export async function fetchProviderOrders(since, until, page = 1) {
  return providerRequest(
    `/v1/order-list?${new URLSearchParams({ since, until, page: String(page), limit: "100" })}`,
  );
}

export function normalizeConversion(order) {
  const commission = Number(order.pub_commission),
    updated = Date.parse(order.update_time || "");
  if (
    !Number.isFinite(commission) ||
    commission < 0 ||
    !Number.isFinite(updated) ||
    !order.order_id ||
    !order.merchant ||
    !/^[a-f0-9-]{36}$/i.test(order.utm_content || "")
  )
    return null;
  const approved = Number(order.order_approved),
    pending = Number(order.order_pending),
    rejected = Number(order.order_reject);
  if (![approved, pending, rejected].every(Number.isFinite)) return null;
  const status =
    pending === 0 &&
    rejected === 0 &&
    approved > 0 &&
    Number(order.is_confirmed) === 1
      ? "APPROVED"
      : pending === 0 && approved === 0 && rejected > 0
        ? "REJECTED"
        : "PENDING";
  return {
    clickId: order.utm_content,
    orderId: String(order.order_id),
    merchant: String(order.merchant),
    status,
    commission: Math.floor(commission),
    updatedAt: new Date(updated).toISOString(),
  };
}
