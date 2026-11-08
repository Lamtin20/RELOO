import { requirePermission } from "@/lib/operations/permissions";
import { decryptPrivate } from "@/lib/operations/crypto";
import { writeAudit } from "@/lib/security/service";
import { errorResponse, HttpError } from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requirePermission(request, "kyc.read");
    const id = new URL(request.url).searchParams.get("id");
    const { data, error } = await db
      .from("kyc_submissions")
      .select("*")
      .eq("id", id)
      .single();
    if (error || (data.expires_at && Date.parse(data.expires_at) <= Date.now()))
      throw new HttpError(404, "Hồ sơ không còn khả dụng.");
    await writeAudit({
      actorId: profile.id,
      subjectId: data.profile_id,
      action: "KYC_DETAILS_VIEWED",
      details: { id, purpose: "IDENTITY_REVIEW" },
    });
    return Response.json(
      {
        ok: true,
        id,
        nationalId: decryptPrivate(data.national_id_encrypted),
        expiryDate: data.declared_expiry,
        expiryCandidate:data.checks?.expiryCandidate||null,
        face:data.face_result,
        reviewDueAt: data.review_due_at,
        status: data.status,
        portraitSource: data.document_paths.portraitSource || "LEGACY",
        mode: data.checks?.method==='QR_ONLY_V1'?'QR_ONLY':data.checks?.method==='OCR_QR_V1'?'OCR_QR':'MANUAL',
        matchChecks:data.checks?.method==='OCR_QR_V1'?{id:data.checks.nationalIdMatches===true,name:data.checks.nameMatches===true,confident:data.checks.ocrConfident===true,reason:data.checks.reason}:null,
        qrFields:data.provider==='MANUAL'&&data.checks?.source==='CARD_QR'&&data.extracted_encrypted?JSON.parse(decryptPrivate(data.extracted_encrypted)):null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
