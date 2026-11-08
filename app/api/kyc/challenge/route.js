import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
} from "@/lib/server/http";
import { livePoses } from "@/lib/kyc/challenge";
import { manualKycEnabled } from "@/lib/kyc/manual";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "kyc-challenge", 5);
    const { profile, db } = await requireAccount(request, { active: false });
    if (manualKycEnabled()) throw new HttpError(409,"Giai đoạn này hồ sơ được admin duyệt thủ công, không cần quay video.","MANUAL_REVIEW_ONLY");
    if (profile.activation_status === "RESTRICTED")
      throw new HttpError(403, "Gửi bằng chứng qua yêu cầu xem xét.");
    const { data, error } = await db
      .from("kyc_challenges")
      .insert({ profile_id: profile.id, poses: livePoses() })
      .select("id,poses,issued_at,expires_at")
      .single();
    if (error) throw new Error("CHALLENGE_STORAGE_UNAVAILABLE");
    return Response.json(
      { ok: true, challenge: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
