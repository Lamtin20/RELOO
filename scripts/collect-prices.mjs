import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { permittedPage } from "../lib/pricing/fetch.js";
import { extractPrice } from "../lib/pricing/extract.js";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key)
  throw new Error(
    "Pricing worker needs the working Supabase project and service key.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (resource, options) =>
      fetch(resource, { ...options, signal: AbortSignal.timeout(12000) }),
  },
});
const limit = Math.min(
  30,
  Math.max(1, Number(process.env.PRICE_WORKER_BATCH || 10)),
);
async function run() {
  for (let index = 0; index < limit; index++) {
    const claimed = await db.rpc("reloo_claim_price_target");
    if (claimed.error)
      throw new Error("Price queue unavailable; verify project and migration.");
    const target = claimed.data?.[0];
    if (!target) break;
    let outcome,
      reason = null;
    try {
      const page = await permittedPage(target.url, target.source_id);
      outcome = extractPrice(page.body, target);
      if (outcome.snapshot)
        outcome.snapshot = {
          ...outcome.snapshot,
          url: page.url,
          content_hash: createHash("sha256").update(page.body).digest("hex"),
        };
    } catch (error) {
      outcome = { status: error.collectionStatus || "SOURCE_UNAVAILABLE" };
      reason = /^[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "FETCH_FAILED";
    }
    const stored = await db.rpc("reloo_finish_price_target", {
      p_target_id: target.id,
      p_status: outcome.status,
      p_reason: reason,
      p_snapshot: outcome.snapshot || null,
    });
    if (stored.error)
      throw new Error(
        "Price snapshot transaction failed; target remains leased for retry.",
      );
    console.log(
      JSON.stringify({
        source: target.source_id,
        target: target.id,
        status: outcome.status,
        reason,
      }),
    );
  }
}
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
do {
  try {
    await run();
  } catch (error) {
    console.error(error.message);
    if (!process.argv.includes("--watch")) {
      process.exitCode = 1;
      break;
    }
  }
  if (!process.argv.includes("--watch") || stopping) break;
  for (let count = 0; count < 12 && !stopping; count++)
    await new Promise((resolve) => setTimeout(resolve, 5000));
} while (!stopping);
