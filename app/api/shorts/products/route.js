import { requireAccount } from "@/lib/security/authorization";
import { errorResponse } from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false }),
      result = await db
        .from("assets")
        .select("id,title,daily_price,images")
        .eq("owner_id", profile.id)
        .eq("status", "available")
        .eq("is_locked", false)
        .order("created_at", { ascending: false })
        .limit(100);
    if (result.error) throw result.error;
    return Response.json(
      {
        ok: true,
        products: result.data.map((p) => ({
          ...p,
          daily_price: String(p.daily_price),
        })),
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
