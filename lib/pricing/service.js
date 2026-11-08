import { createSupabaseAdminClient } from "../supabase/admin.js";
import { estimateValue, validateValuation } from "./rules.js";
import { PRICE_SOURCES } from "./sources.js";
export async function valuation(input) {
  const product = validateValuation(input),
    db = createSupabaseAdminClient();
  let snapshots = [],
    dataStatus = "UNAVAILABLE",
    sources = [];
  if (db) {
    const [prices, states] = await Promise.all([
      db
        .from("price_snapshots")
        .select(
          "source_id,model_key,category,title,url,price,price_kind,condition,in_stock,observed_at,verified",
        )
        .eq("model_key", product.modelKey)
        .gte("observed_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("observed_at", { ascending: false })
        .limit(300),
      db
        .from("price_sources")
        .select("id,enabled,status,last_success_at,last_error_code"),
    ]);
    if (!prices.error && !states.error) {
      sources = states.data || [];
      snapshots = (prices.data || []).filter((row) =>
        sources.some((source) => source.id === row.source_id && source.enabled),
      );
      dataStatus = snapshots.length ? "AVAILABLE" : "NO_DATA";
    }
  }
  return {
    ...estimateValue(product, snapshots),
    product: {
      brand: product.brand,
      model: product.model,
      variant: product.variant,
    },
    dataStatus,
    sources: PRICE_SOURCES.map((source) => {
      const state = sources.find((item) => item.id === source.id);
      return {
        id: source.id,
        name: source.name,
        status: state?.status || "NOT_CONNECTED",
        lastSuccessAt: state?.last_success_at || null,
      };
    }),
  };
}
