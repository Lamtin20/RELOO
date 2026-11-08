import { requireAccount } from "@/lib/security/authorization";
import {livePoses} from '@/lib/kyc/challenge';
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "kyc-photo", 10);
    const { profile, db } = await requireAccount(request, { active: false });
    if (profile.activation_status === "RESTRICTED")
      throw new HttpError(403, "Gửi bằng chứng qua yêu cầu xem xét.");
    const input = await readJson(request);
    if (input.consent !== true || input.captureVersion !== 2)
      throw new HttpError(
        400,
        "Cần đồng ý xử lý hồ sơ trước khi chụp chân dung.",
      );
    const { data, error } = await db
      .from("kyc_photo_sessions")
      .insert({ profile_id: profile.id, capture_version: 2,challenge_poses:livePoses() })
      .select("id,issued_at,expires_at,challenge_poses")
      .single();
    if (error) throw new Error("PHOTO_SESSION_STORAGE_UNAVAILABLE");
    return Response.json(
      { ok: true, session: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
