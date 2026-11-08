import { valuation } from "@/lib/pricing/service";
import {
  assertOrigin,
  errorResponse,
  rateLimit,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "price-estimate", 30);
    return Response.json(
      { ok: true, ...(await valuation(await readJson(request, 6000))) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
