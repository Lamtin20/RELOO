import { securityDb } from "@/lib/security/service";
import { publicBusiness } from "@/lib/operations/settings";
import { errorResponse } from "@/lib/server/http";
export async function GET() {
  try {
    return Response.json(
      { ok: true, ...(await publicBusiness(securityDb())) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
