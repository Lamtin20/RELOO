import { requireAccount } from "@/lib/security/authorization";
import { queueIdentifier } from "@/lib/security/identifiers";
import { assertOrigin, errorResponse, HttpError, rateLimit } from "@/lib/server/http";

export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, { active: false });
    rateLimit(request, `screening-recheck:${profile.id}`, 5);
    if (!profile.phone) throw new HttpError(400, "Vui lòng bổ sung số điện thoại trong hồ sơ.");
    const identifier = await queueIdentifier(db, profile.id, "PHONE", profile.phone);
    return Response.json({ ok: true, identifier }, { status: identifier.job.queued ? 202 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
