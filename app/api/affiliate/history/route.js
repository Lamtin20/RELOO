import { requireAccount } from "@/lib/security/authorization";
import { errorResponse } from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const { data: clicks, error } = await db
      .from("affiliate_clicks")
      .select("id,merchant,original_url,created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Storage unavailable");
    const ids = (clicks || []).map((item) => item.id);
    const { data: conversions, error: conversionError } = ids.length
      ? await db
          .from("cashback_conversions")
          .select("id,click_id,merchant,status,reward,provider_updated_at")
          .in("click_id", ids)
      : { data: [] };
    const { data: ledger, error: ledgerError } = await db
      .from("cashback_ledger")
      .select("amount")
      .eq("profile_id", profile.id);
    if (conversionError || ledgerError) throw new Error("Storage unavailable");
    return Response.json(
      {
        ok: true,
        clicks,
        conversions,
        approvedBalance: (ledger || []).reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
