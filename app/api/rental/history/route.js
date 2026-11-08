import { securityDb } from "@/lib/security/service";
import { errorResponse, HttpError } from "@/lib/server/http";
import { rentalHistory } from "@/lib/assurance/rental";
export async function GET(request) {
  try {
    const listing = new URL(request.url).searchParams.get("listing");
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(listing || ""))
      throw new HttpError(400, "Mã tin đăng không hợp lệ.");
    const db = securityDb(),
      { data, error } = await db
        .from("rental_agreements")
        .select("id,created_at")
        .eq("listing_id", listing)
        .eq("status", "CLOSED")
        .order("created_at", { ascending: false })
        .limit(10);
    if (error) throw new Error("HISTORY_UNAVAILABLE");
    const items = await Promise.all(
      data.map(async (agreement) => {
        const history = await rentalHistory(db, agreement),
          last = history.events.at(-1);
        return {
          month: new Date(agreement.created_at).toLocaleDateString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            month: "2-digit",
            year: "numeric",
          }),
          integrity: history.integrity.ok,
          digest: last?.digest,
          anchored:
            history.checkpoint?.count === history.agreement.sequence &&
            !history.checkpointUnavailable,
        };
      }),
    );
    return Response.json(
      { ok: true, items },
      { headers: { "Cache-Control": "public,max-age=60" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
