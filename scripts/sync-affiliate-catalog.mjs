import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { fetchProductFeed } from "../lib/affiliate/provider.js";
import { normalizeCatalogProduct } from "../lib/affiliate/catalog.js";
import {prepareListingImages} from '../lib/images/listing-media.js';
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key || !process.env.ACCESSTRADE_ACCESS_KEY)
  throw new Error(
    "Catalog sync requires the working database and approved ACCESSTRADE API access.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (resource, options) =>
      fetch(resource, { ...options, signal: AbortSignal.timeout(12000) }),
  },
});
for (const keyword of (
  process.env.AFFILIATE_CATALOG_KEYWORDS || "đồ dùng,camping,máy ảnh,laptop"
)
  .split(",")
  .slice(0, 10)) {
  let token = "",
    count = 0;
  const seen = new Set();
  for (let page = 0; page < 5; page++) {
    const feed = await fetchProductFeed(keyword, {
      pageToken: token,
      limit: 24,
    });
    const rows = feed.products.map((item) =>
      normalizeCatalogProduct({
        ...item,
        provider: "accesstrade",
        inStock: true,
        observedAt: item.fetchedAt,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        sourceReference:
          "https://api.accesstrade.vn/v2/tiktokshop_product_feeds",
      }),
    );
    if (rows.length) {
      const imports=[];
      let result;
      try{
       for(const row of rows){
        if(!row.image_url)continue;
        const prepared=await prepareListingImages([row.image_url],{db,ownerId:null,purpose:'affiliate'});
        imports.push(prepared);row.image_url=prepared.urls[0];
       }
       result=await db.from("affiliate_products").upsert(rows);
       if(result.error)throw result.error;
      }catch{
       for(const prepared of imports)await prepared.rollback();
       throw new Error('Catalog image import or storage unavailable; no successful sync claimed.');
      }
      if (result.error)
        throw new Error(
          "Catalog storage unavailable; no successful sync claimed.",
        );
      count += rows.length;
    }
    token = feed.nextPageToken;
    if (!token || seen.has(token)) break;
    seen.add(token);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.log(JSON.stringify({ keyword, stored: count }));
}
