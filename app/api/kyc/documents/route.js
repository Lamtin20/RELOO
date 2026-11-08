import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requirePermission } from "@/lib/operations/permissions";
import { decryptPrivate } from "@/lib/operations/crypto";
import { writeAudit } from "@/lib/security/service";
import { errorResponse, HttpError } from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requirePermission(request, "kyc.read");
    const params = new URL(request.url).searchParams,
      kind = params.get("kind"),
      id = params.get("id");
    if (
      !/^[a-f0-9-]{36}$/i.test(id || "") ||
      !["front", "back", "selfie", "video"].includes(kind)
    )
      throw new HttpError(400, "Giấy tờ không hợp lệ.");
    const { data, error } = await db
      .from("kyc_submissions")
      .select("profile_id,document_paths,expires_at")
      .eq("id", id)
      .single();
    if (error || (data.expires_at && Date.parse(data.expires_at) <= Date.now()))
      throw new HttpError(404, "Giấy tờ không còn khả dụng.");
    const filename = data.document_paths[kind];
    if (filename !== `${id}-${kind}.enc`)
      throw new HttpError(400, "Đường dẫn giấy tờ không hợp lệ.");
    const content = decryptPrivate(
      await readFile(join(process.env.RELOO_EVIDENCE_DIR, filename), "utf8"),
    );
    await writeAudit({
      actorId: profile.id,
      subjectId: data.profile_id,
      action: "KYC_DOCUMENT_VIEWED",
      details: { id, kind, purpose: "IDENTITY_REVIEW" },
    });
    return new Response(Buffer.from(content, "base64"), {
      headers: {
        "Content-Type":
          kind === "video"
            ? data.document_paths.videoType === "video/mp4"
              ? "video/mp4"
              : "video/webm"
            : "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition":
          kind === "video"
            ? 'inline; filename="identity-review-video"'
            : 'inline; filename="identity-review.jpg"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
