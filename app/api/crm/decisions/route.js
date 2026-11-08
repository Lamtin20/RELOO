import { requirePermission } from "@/lib/operations/permissions";
import { decryptPrivate, encryptPrivate, privateHash } from "@/lib/operations/crypto";
import { normalizedHolderName } from "@/lib/profile/validation";
import { validExpiry } from "@/lib/kyc/manual";
import {resolveQrReview} from '@/lib/kyc/qr-review';
import { validateStaffGrant } from "@/lib/operations/access";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    const input = await readJson(request);
    const permission =
      input.kind === "staff"
        ? "roles.write"
        : input.kind === "kyc"
          ? "kyc.write"
          : "risk.write";
    const { profile, db } = await requirePermission(request, permission);
    const reasonRequired = ['REJECTED','DENIED','RESTRICT','VERIFY'].includes(input.action);
    if (typeof input.reason !== 'string' || reasonRequired && !input.reason.trim())
      throw new HttpError(400, reasonRequired ? 'Cần nhập lý do từ chối/xử lý.' : '');
    input.reason = input.reason.trim();
    if (input.kind === "blacklist") {
      const { error } = await db.rpc("reloo_blacklist_decision", {
        p_actor: profile.id,
        p_id: input.id,
        p_action: input.action,
        p_reason: input.reason,
        p_evidence: [
          {
            source: "admin_review",
            note: input.reason,
            reviewedAt: new Date().toISOString(),
          },
        ],
      });
      if (error) throw new HttpError(400, "Chưa ghi nhận quyết định.");
    } else if (input.kind === "case") {
      if (
        !["VERIFY", "RESTRICT", "CLEAR"].includes(input.action) ||
        (input.action === "CLEAR" &&
          (typeof input.evidenceUrl !== "string" ||
            !/^https:\/\//.test(input.evidenceUrl)))
      )
        throw new HttpError(
          400,
          "Gỡ hạn chế cần liên kết bằng chứng xác minh.",
        );
      const { error } = await db.rpc("reloo_review_case", {
        p_actor_id: profile.id,
        p_case_id: input.id,
        p_action: input.action,
        p_reason: input.reason,
        p_evidence: input.evidenceUrl
          ? [
              {
                url: input.evidenceUrl,
                note: input.reason,
                source: "admin_review",
              },
            ]
          : [],
        p_valid_hours: 720,
      });
      if (error)
        throw new HttpError(
          400,
          "Chưa xét duyệt được hồ sơ. Kiểm tra bằng chứng và các mục danh sách đen chưa gỡ.",
        );
    } else if (input.kind === "kyc") {
      if (!["APPROVED", "REJECTED"].includes(input.action))
        throw new HttpError(400, "Quyết định không hợp lệ.");
      const declaration = await db
        .from("kyc_submissions")
        .select("*")
        .eq("id", input.id)
        .eq("status", "REVIEW")
        .is("superseded_at", null)
        .single();
      if (declaration.error)
        throw new HttpError(409, "Hồ sơ đã được xử lý hoặc được thay thế.");
      if(input.action==='APPROVED'&&declaration.data.extracted_encrypted){
        try{
          const expiryDate=input.expiryDate||declaration.data.declared_expiry;
          if(input.documentsConfirmed!==true)throw new HttpError(400,'Hãy xác nhận đã kiểm tra bộ ảnh và thông tin QR.');
          if(!validExpiry(expiryDate))throw new HttpError(400,'Nhập ngày hết hạn còn hiệu lực đã đọc trên thẻ.','EXPIRY_REQUIRED');
          const result=await resolveQrReview(db,declaration.data,{actor:profile.id,expiryDate});
          if(result.status!=='APPROVED')throw new HttpError(409,'Hồ sơ cần xử lý riêng: tài khoản bị hạn chế hoặc thay đổi danh tính.');
          await db.from('security_audit').insert({actor_id:profile.id,subject_id:declaration.data.profile_id,action:'KYC_QR_REVIEW_REQUESTED',details:{id:input.id,method:'QR_ONLY_V1'}});
          return Response.json({ok:true,status:'APPROVED'},{headers:{'Cache-Control':'private,no-store'}});
        }catch(error){
          if(error instanceof HttpError)throw error;
          throw new HttpError(409,error.message==='QR_INVALID'?'Mã QR đã lưu chưa hợp lệ. Khách cần quét lại.':error.code?.includes('IDENTIFIER_EXISTS')?'Căn cước đã gắn với tài khoản khác.':error.message==='CAPTURE_REQUIRED'||error.code?.includes('CAPTURE_REQUIRED')?'Bộ ảnh hoặc video của phiên chụp chưa đầy đủ. Vui lòng chụp lại.':'Chưa duyệt được thông tin QR. Kiểm tra phiên chụp và hồ sơ.');
        }
      }
      if(declaration.data.extracted_encrypted){const qr=JSON.parse(decryptPrivate(declaration.data.extracted_encrypted));input.fullName=qr.name;input.nationalId=qr.nationalId;}
      const expiryDate=declaration.data.declared_expiry||input.expiryDate;
      if (
        input.action === "APPROVED" &&
        (input.documentsConfirmed !== true ||
          !validExpiry(expiryDate))
      )
        throw new HttpError(
          400,
          "Cần xác nhận đã đối chiếu đủ ba ảnh và ngày hết hạn còn hiệu lực.",
        );
      if (
        input.action === "APPROVED" &&
        (typeof input.fullName !== "string" ||
          input.fullName.trim().length < 3 ||
          input.fullName.length > 100 ||
          !/^\d{12}$/.test(input.nationalId || ""))
      )
        throw new HttpError(
          400,
          "Cần xác nhận họ tên và số căn cước đã đối chiếu trên giấy tờ.",
        );
      const { error } =
        input.action === "APPROVED"
          ? await db.rpc("reloo_review_qr_identity", {
              p_expiry:expiryDate,
              p_actor: profile.id,
              p_id: input.id,
              p_reason: input.reason,
              p_fields: encryptPrivate(
                JSON.stringify({
                  fullName: input.fullName.trim(),
                  nationalId: input.nationalId,
                  expiryDate,
                  verification: "STAFF_DOCUMENT_REVIEW",
                }),
              ),
              p_holder_hash: privateHash(
                "HOLDER_NAME",
                normalizedHolderName(input.fullName),
              ),
              p_national_hash: privateHash("NATIONAL_ID", input.nationalId),
            })
          : await db.rpc("reloo_review_kyc", {
              p_actor: profile.id,
              p_id: input.id,
              p_action: input.action,
              p_reason: input.reason,
            });
      if (error)
        throw new HttpError(
          409,
          error.message?.includes('REVIEW_ALL_DOCUMENTS')?'Tài khoản duyệt hiện tại chưa có nhật ký mở đủ ba ảnh. Hãy mở lại từng ảnh trong hồ sơ.':error.message?.includes('DECLARED_NUMBER_MISMATCH')?'Số căn cước chưa khớp hồ sơ đã khai báo.':error.message?.includes('EXPIRY')?'Ngày hết hạn chưa hợp lệ.':'Hồ sơ đã thay đổi hoặc chưa đủ điều kiện duyệt. Hãy mở lại hồ sơ.',
        );
      // Document review and account risk clearance are independent decisions.
    } else if (input.kind === "staff") {
      let permissions;
      try {permissions=validateStaffGrant(input);}catch(e){throw new HttpError(400,e.message);}
      if (input.id === profile.id)
        throw new HttpError(400, "Không tự thay đổi quyền của chính mình.");
      const { error } = await db.rpc("reloo_staff_set", {
        p_actor: profile.id,
        p_target: input.id,
        p_role: input.role,
        p_permissions: permissions,
        p_enabled: input.enabled !== false,
        p_reason: input.reason,
      });
      if (error) throw new HttpError(400, "Chưa lưu được phân quyền.");
    } else throw new HttpError(400, "Loại quyết định không hợp lệ.");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
