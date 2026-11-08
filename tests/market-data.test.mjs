import test from "node:test";
import assert from "node:assert/strict";
import robotsParser from "robots-parser";
import { estimateValue, validateValuation } from "../lib/pricing/rules.js";
import {
  productKey,
  matchesProductTitle,
  sourceUrl,
} from "../lib/pricing/sources.js";
import { extractPrice } from "../lib/pricing/extract.js";
import { publicAddress } from "../lib/pricing/fetch.js";
import {
  normalizeCatalogProduct,
  publicCatalogProduct,
} from "../lib/affiliate/catalog.js";
import { tiktokCommissionBps } from "../lib/affiliate/provider.js";
import { validConsent, CONSENT_MAX_AGE, CONSENT_VERSION } from "../lib/privacy/consent-policy.mjs";
const now = Date.parse("2026-10-09T08:00:00Z");
const input = validateValuation({
  brand: "Apple",
  model: "iPhone 15",
  variant: "128GB",
  category: "dien-thoai",
  condition: "good",
  ageMonths: 12,
  purchasePrice: 0,
  functional: true,
});
const snapshot = (price, index, patch = {}) => ({
  source_id: "chotot",
  model_key: input.modelKey,
  category: input.category,
  title: "Apple iPhone 15 128GB",
  url: `https://www.chotot.com/mua-ban-dien-thoai/${index}.htm`,
  price,
  price_kind: "used_asking",
  condition: "good",
  in_stock: true,
  verified: true,
  observed_at: new Date(now - 1000).toISOString(),
  ...patch,
});
test("valuation keeps price kinds, variant, freshness and outliers separate", () => {
  const rows = [
    snapshot(5000000, 1),
    snapshot(5200000, 2),
    snapshot(5400000, 3),
    snapshot(100000000, 4),
    snapshot(1, 5),
    snapshot(3000000, 6, { observed_at: "2025-01-01T00:00:00Z" }),
    snapshot(9990000, 7, {
      model_key: productKey({ ...input, variant: "256GB" }),
    }),
    snapshot(9990000, 8, { condition: "fair" }),
    snapshot(1000000, 9, { price_kind: "buyback" }),
  ];
  const result = estimateValue(input, rows, now);
  assert.equal(result.basis, "USED_ASKING");
  assert.equal(result.asset.suggested, 5200000);
  assert.equal(result.evidence.length, 3);
  assert.equal(result.confidence, "LOW");
  assert.equal(result.rentalBasis, "CATEGORY_RULE");
  assert.equal(
    estimateValue(input, [rows[0], rows[0], rows[0]], now).status,
    "INSUFFICIENT_DATA",
  );
  assert.equal(
    estimateValue(
      input,
      [
        snapshot(5000000, 1, {
          observed_at: new Date(now + 1000).toISOString(),
        }),
      ],
      now,
    ).status,
    "INSUFFICIENT_DATA",
  );
});
test("manual estimates are explicitly labelled and broken products get no offer", () => {
  const result = estimateValue({ ...input, purchasePrice: 10000000 }, [], now);
  assert.equal(result.basis, "OWNER_INPUT_RULE");
  assert.equal(result.evidence.length, 0);
  assert.ok(result.message.includes("chưa phải kết quả tra cứu"));
  assert.equal(
    estimateValue(
      { ...input, purchasePrice: 10000000, functional: false },
      [],
      now,
    ).rental,
    null,
  );
  assert.throws(() => validateValuation({ ...input, category: "admin" }));
});
test("structured product extraction rejects different storage, Pro variants and ambiguous offers", () => {
  const target = { ...input, price_kind: "new_retail" };
  const document = (product) =>
    `<script type="application/ld+json">${JSON.stringify({ "@graph": [product] })}</script>`;
  const product = {
    "@type": "Product",
    name: "Apple iPhone 15 128GB",
    offers: {
      "@type": "Offer",
      price: "15000000",
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  assert.equal(
    extractPrice(document(product), target).snapshot.price,
    15000000,
  );
  assert.equal(
    extractPrice(
      document({ ...product, name: "Apple iPhone 15 Pro 128GB" }),
      target,
    ).status,
    "MODEL_MISMATCH",
  );
  assert.equal(
    extractPrice(
      document({ ...product, name: "Apple iPhone 15 256GB" }),
      target,
    ).status,
    "MODEL_MISMATCH",
  );
  assert.equal(
    extractPrice(
      document({
        ...product,
        offers: [product.offers, { ...product.offers, price: 12000000 }],
      }),
      target,
    ).status,
    "NO_STRUCTURED_PRICE",
  );
  assert.equal(
    extractPrice("<p>Giá chỉ 15.000.000đ</p>", target).status,
    "NO_STRUCTURED_PRICE",
  );
  assert.equal(matchesProductTitle("iPhone 15 Pro Max 128GB", target), false);
  const leaked = extractPrice(
    document({
      ...product,
      description: "Liên hệ 0912345678 hoặc test@example.invalid để xem máy",
    }),
    target,
  );
  assert.equal(leaked.snapshot.description.includes("0912345678"), false);
  assert.equal(
    leaked.snapshot.description.includes("test@example.invalid"),
    false,
  );
  assert.equal(
    extractPrice(document(product), {
      ...target,
      price_kind: "used_asking",
      condition: "good",
    }).status,
    "MODEL_MISMATCH",
  );
});
test("source URL allowlist, private networks and robot exclusions prevent unsafe collection", () => {
  for (const url of [
    "http://www.chotot.com/test",
    "https://www.chotot.com.evil.invalid/test",
    "https://user:secret@www.chotot.com/test",
    "https://127.0.0.1/test",
  ])
    assert.throws(() => sourceUrl(url, "chotot"));
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "192.168.1.1",
  ])
    assert.equal(publicAddress(ip), false);
  assert.equal(publicAddress("8.8.8.8"), true);
  const policy = robotsParser(
    "https://www.chotot.com/robots.txt",
    "User-agent: *\nAllow: /\nDisallow: /*q=\nDisallow: /user/",
  );
  assert.equal(
    policy.isAllowed(
      "https://www.chotot.com/mua-ban?q=iphone",
      "RelooPriceBot/1.0",
    ),
    false,
  );
});
test("catalog needs genuine feed identity, unexpired values and exact merchant", () => {
  const item = {
    id: "fixture",
    provider: "accesstrade",
    merchant: "shopee",
    title: "Test product",
    image: null,
    originalUrl: "https://shopee.vn/product/1/2",
    price: 100000,
    category: "Điện tử",
    commissionBps: 1000,
    inStock: true,
    observedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 86400000).toISOString(),
    sourceReference: "https://api.accesstrade.vn",
  };
  const row = normalizeCatalogProduct(item, now);
  assert.equal(row.commission_bps, 1000);
  assert.equal(row.id.length, 64);
  for (const patch of [
    { merchant: "tiktok" },
    { commissionBps: 10001 },
    { expiresAt: new Date(now - 1).toISOString() },
    { originalUrl: "https://evil.invalid/item" },
    { provider: "fake" },
  ])
    assert.throws(() => normalizeCatalogProduct({ ...item, ...patch }, now));
  const previous = process.env.AFFILIATE_CASHBACK_APPROVED;
  process.env.AFFILIATE_CASHBACK_APPROVED = "false";
  assert.equal(publicCatalogProduct(row).cashbackPercent, null);
  if (previous === undefined) delete process.env.AFFILIATE_CASHBACK_APPROVED;
  else process.env.AFFILIATE_CASHBACK_APPROVED = previous;
});
test("cookie choices expire and do not treat unknown versions or future timestamps as consent", () => {
  const consent = {
    version: CONSENT_VERSION,
    analytics: false,
    marketing: false,
    savedAt: now - 1000,
  };
  assert.equal(validConsent(consent, now), true);
  for (const patch of [
    { version: CONSENT_VERSION + 1 },
    { analytics: "true" },
    { savedAt: now + 1 },
    { savedAt: now - CONSENT_MAX_AGE * 1000 },
  ])
    assert.equal(validConsent({ ...consent, ...patch }, now), false);
});
test("TikTok commission amounts need confirmed units before advertising a cashback percentage", () => {
  assert.equal(tiktokCommissionBps("1000", "bps"), 1000);
  assert.equal(tiktokCommissionBps("12.5", "percent"), 1250);
  for (const [value, unit] of [
    [10, "unknown"],
    ["", "bps"],
    [null, "bps"],
    [10001, "bps"],
    [101, "percent"],
    [12.5, "bps"],
  ])
    assert.equal(tiktokCommissionBps(value, unit), null);
});
