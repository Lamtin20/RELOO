import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import {
  decryptPrivate,
  encryptPrivate,
  privateHash,
} from "@/lib/operations/crypto";
import { normalizedHolderName } from "@/lib/profile/validation";
import { manualKycEnabled } from "@/lib/kyc/manual";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "kyc-confirm", 3);
    const { profile, db } = await requireAccount(request, { active: false }),
      input = await readJson(request);
    if (manualKycEnabled()) throw new HttpError(409,"Chỉ admin được phê duyệt hồ sơ căn cước trong giai đoạn này.","MANUAL_REVIEW_ONLY");
    if (input.confirmed !== true || !/^[a-f0-9-]{36}$/i.test(input.id || ""))
      throw new HttpError(400, "Hãy xác nhận thông tin đã đọc từ căn cước.");
    const { data, error } = await db
      .from("kyc_submissions")
      .select("extracted_encrypted")
      .eq("id", input.id)
      .eq("profile_id", profile.id)
      .eq("provider", "VNPT")
      .eq("status", "REVIEW")
      .single();
    if (error || !data.extracted_encrypted)
      throw new HttpError(409, "Hồ sơ chưa có kết quả để xác nhận.");
    const extracted = JSON.parse(decryptPrivate(data.extracted_encrypted)),
      fields = extracted.fields;
    if (!fields?.fullName || !/^\d{12}$/.test(fields.nationalId || ""))
      throw new HttpError(409, "Cần chụp lại giấy tờ để đọc đủ thông tin.");
    const result = await db.rpc("reloo_confirm_kyc", {
      p_profile: profile.id,
      p_id: input.id,
      p_fields: encryptPrivate(JSON.stringify(fields)),
      p_holder_hash: privateHash(
        "HOLDER_NAME",
        normalizedHolderName(fields.fullName),
      ),
    });
    if (result.error)
      throw new HttpError(
        409,
        "Hồ sơ chưa đạt đầy đủ kiểm tra giấy tờ, khuôn mặt và người thật.",
      );
    return Response.json({ ok: true, status: "APPROVED" });
  } catch (cause) {
    return errorResponse(cause);
  }
}
