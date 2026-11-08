import { affiliateStatus } from "@/lib/affiliate/provider";
import { errorResponse } from "@/lib/server/http";
export async function GET() {
  try {
    return Response.json(
      { ok: true, ...affiliateStatus() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
