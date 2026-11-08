import { securityDb } from "@/lib/security/service";
import { currentLegal } from "@/lib/legal/current";
import { errorResponse, HttpError } from "@/lib/server/http";
export async function GET(_request, { params }) {
  try {
    const { slug } = await params,
      document = await currentLegal(securityDb(), slug);
    if (!document) throw new HttpError(404, "Không có tài liệu này.");
    return Response.json(
      { ok: true, document },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
