import {verifyExpiryReceipt} from '@/lib/kyc/expiry-receipt';
import {IDENTITY_NOTICE_VERSION,DATA_COLLECTION_VERSION,identityControllerReady} from '@/lib/privacy/identity-policy';
import {parseIdentityQr} from '@/lib/kyc/qr';
import {resolveQrReview} from '@/lib/kyc/qr-review';
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { requireAccount } from "@/lib/security/authorization";
import {
  decryptPrivate,
  encryptPrivate,
  privateHash,
} from "@/lib/operations/crypto";
import { validExpiry, validPhotoSession, vietnamToday } from "@/lib/kyc/manual";
import { validCaptureManifest } from "@/lib/kyc/capture";
import { publicBusiness } from "@/lib/operations/settings";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readMultipart,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const { data, error } = await db
      .from("kyc_submissions")
      .select(
        "id,status,reason,created_at,expires_at,review_due_at,declared_expiry,reviewed_at,superseded_at,national_id_encrypted,face_result,checks",
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error("KYC_STORAGE_UNAVAILABLE");
    return Response.json(
      {
        ok: true,
        reviewDays: 3,
        mode: process.env.RELOO_KYC_AUTO_EXPIRY==='1'?'OCR_QR_FINAL':'QR_ONLY',
        today: vietnamToday(),
        submissions: data.map(({ national_id_encrypted,face_result,checks, ...item }) => ({
          ...item,
          liveness:face_result?.activeLive?.status||'PENDING',
          verificationMethod:checks?.method||'MANUAL',
          nationalIdMatches:checks?.nationalIdMatches===true,
          nameMatches:checks?.nameMatches===true,
          overdue:
            item.status === "REVIEW" &&
            !item.superseded_at &&
            Date.parse(item.review_due_at) < Date.now(),
          nationalId:
            (!item.expires_at || Date.parse(item.expires_at) > Date.now()) &&
            national_id_encrypted
              ? decryptPrivate(national_id_encrypted)
              : null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  const written = [];
  let committed = false;
  try {
    assertOrigin(request);
    rateLimit(request, "kyc-upload", 3);
    const { profile, db } = await requireAccount(request, { active: false });
    if (profile.activation_status === "RESTRICTED")
      throw new HttpError(
        403,
        "Gửi bằng chứng qua hồ sơ yêu cầu xem xét.",
        "ACCOUNT_RESTRICTED",
      );
    if (process.env.RELOO_DATA_REGION !== "VN")
      throw new HttpError(503, "Kho giấy tờ tại Việt Nam chưa sẵn sàng.");
    const form = await readMultipart(request, 14000000);
    if (form.get("consent") !== "true" || form.get("qrAcknowledged") !== "true")
      throw new HttpError(
        400,
        "Cần rà soát thông tin QR và đồng ý xử lý hồ sơ trước khi gửi.",
        "DECLARATION_REQUIRED",
      );
    if (form.get("selfieSource") !== "CAMERA")
      throw new HttpError(
        400,
        "Ảnh chân dung cần được chụp trực tiếp bằng camera của RELOO.",
        "CAMERA_CAPTURE_REQUIRED",
      );
    const sessionId = String(form.get("photoSessionId") || "");
    if (!/^[a-f0-9-]{36}$/i.test(sessionId))
      throw new HttpError(
        400,
        "Cần chụp chân dung trước khi gửi.",
        "CAMERA_CAPTURE_REQUIRED",
      );
    const session = await db
      .from("kyc_photo_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("profile_id", profile.id)
      .single();
    let manifest;
    try {
      manifest = JSON.parse(String(form.get("captureManifest") || ""));
    } catch {
      throw new HttpError(
        400,
        "Cần chụp đủ ba ảnh trực tiếp.",
        "CAMERA_CAPTURE_REQUIRED",
      );
    }
    if (!validCaptureManifest(manifest, session.data, profile.id))
      throw new HttpError(
        409,
        "Lượt chụp không hợp lệ. Hãy chụp lại đủ ba bước.",
        "CAMERA_CAPTURE_REQUIRED",
      );
    const business = await publicBusiness(db);
    if(!identityControllerReady(business.entity))throw new HttpError(503,'Thông tin đơn vị tiếp nhận hồ sơ đang được hoàn thiện. Vui lòng liên hệ hỗ trợ; chưa gửi giấy tờ.','CONTROLLER_NOT_CONFIGURED');
    if (
      form.get("consentVersion") !== IDENTITY_NOTICE_VERSION ||
      Number(form.get("businessVersion")) !== business.version
    )
      throw new HttpError(
        409,
        "Thông báo xử lý dữ liệu đã cập nhật. Hãy mở lại thông báo trước khi gửi.",
        "CONSENT_UPDATED",
      );
    if (session.error || !validPhotoSession(session.data, profile.id))
      throw new HttpError(
        409,
        "Lượt chụp đã hết hạn. Hãy chụp lại chân dung.",
        "PHOTO_SESSION_EXPIRED",
      );
    let qr;try{qr=parseIdentityQr(String(form.get('qrPayload')||''));}catch{throw new HttpError(400,'Hãy quét lại QR và xác nhận thông tin trước khi gửi.','QR_INVALID');}
    let expiryProof=null;
    if(process.env.RELOO_KYC_AUTO_EXPIRY==='1'&&form.get('expiryReceipt')){try{expiryProof=verifyExpiryReceipt(String(form.get('expiryReceipt')),{profileId:profile.id,sessionId,manifest,qrPayload:String(form.get('qrPayload')),businessVersion:business.version,noticeVersion:IDENTITY_NOTICE_VERSION});}catch{throw new HttpError(409,'Lượt đọc thẻ đã hết hạn. Hãy kiểm tra lại ảnh.','EXPIRY_RECEIPT_INVALID');}}
    const nationalId=qr.nationalId,expiryDate=process.env.RELOO_KYC_AUTO_EXPIRY==='1'?(expiryProof?.expiryDate||null):String(form.get('expiryDate')||'').trim()||null;
    if(expiryDate&&(!validExpiry(expiryDate)||expiryDate<qr.issueDate))throw new HttpError(400,'Ngày hết hạn phải đúng trên thẻ, từ ngày cấp và còn hiệu lực.','EXPIRY_INVALID');
    const id = randomUUID(),
      root = process.env.RELOO_EVIDENCE_DIR;
    if (!root) throw new HttpError(503, "Kho giấy tờ chưa được cấu hình.");
    const paths = {
      mode: "MANUAL",
      consentVersion: IDENTITY_NOTICE_VERSION,
      collectionPolicyVersion: DATA_COLLECTION_VERSION,
      qrAcknowledged: true,
      controllerVersion: business.version,
      controller: business.entity,
      capture: manifest,
      portraitSource: "CAMERA_CAPTURE",
      qrPolicy: 'V1',
      expirySource:expiryProof?{method:'SERVER_OCR_RECEIPT_V1',side:expiryProof.side,cardType:expiryProof.cardType}:{method:'UNAVAILABLE'},
      ocrNeedsReview:process.env.RELOO_KYC_AUTO_EXPIRY==='1'&&(!expiryProof||expiryProof.needsReview),
    };
    if(session.data.challenge_poses){
      const video=form.get('liveVideo');if(!video||video.size<1000||video.size>6000000||!['video/webm','video/mp4'].includes(video.type.split(';')[0]))throw new HttpError(400,'Cần video quay trực tiếp để kiểm tra người thật.','LIVE_VIDEO_REQUIRED');
      const raw=Buffer.from(await video.arrayBuffer());if(createHash('sha256').update(raw).digest('hex')!==manifest.hashes.liveVideo)throw new HttpError(409,'Video đã thay đổi. Hãy quay lại.');
      await mkdir(root,{recursive:true,mode:0o700});const filename=id+'-video.enc';await writeFile(join(root,filename),encryptPrivate(raw.toString('base64')),{mode:0o600,flag:'wx'});written.push(join(root,filename));paths.video=filename;paths.videoType=video.type;paths.challengePoses=session.data.challenge_poses;
    }
    await mkdir(root, { recursive: true, mode: 0o700 });
    for (const kind of ["front", "back", "selfie"]) {
      const file = form.get(kind);
      if (
        !file ||
        typeof file.arrayBuffer !== "function" ||
        file.size < 1 ||
        file.size > 2000000 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        throw new HttpError(
          400,
          "Cần đủ ảnh hai mặt căn cước và chân dung, mỗi ảnh tối đa 2 MB.",
        );
      let image;
      try {
        const raw = Buffer.from(await file.arrayBuffer());
        if (
          createHash("sha256").update(raw).digest("hex") !==
          manifest.hashes[kind]
        )
          throw new HttpError(
            400,
            "Ảnh đã thay đổi sau lượt chụp. Hãy chụp lại.",
            "CAPTURE_CHANGED",
          );
        image = await sharp(raw, {
          limitInputPixels: 16000000,
        })
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 94 })
          .toBuffer();
      } catch (cause) {
        if (cause instanceof HttpError) throw cause;
        throw new HttpError(400, "Ảnh không đọc được. Hãy chụp lại ảnh.");
      }
      const filename = `${id}-${kind}.enc`;
      await writeFile(
        join(root, filename),
        encryptPrivate(image.toString("base64")),
        { mode: 0o600, flag: "wx" },
      );
      paths[kind] = filename;
      written.push(join(root, filename));
    }
    const { data, error } = await db.rpc("reloo_submit_kyc_reviewed_qr", {
      p_profile: profile.id,
      p_id: id,
      p_national: encryptPrivate(nationalId),
      p_hash: privateHash("NATIONAL_ID", nationalId),
      p_expiry: expiryDate,
      p_paths: paths,
      p_session: sessionId,
      p_qr_fields: encryptPrivate(JSON.stringify(qr)),
    });
    if (error)
      if(error.message?.includes('IDENTIFIER_EXISTS'))throw new HttpError(409,'Thông tin này đã tồn tại ở Reloo. Vui lòng sử dụng tài khoản đã đăng ký hoặc liên hệ hỗ trợ.','IDENTIFIER_EXISTS');
    if(error?.message?.includes('QR_ID_MISMATCH'))throw new HttpError(409,'Số căn cước chưa khớp mã QR đã quét. Hãy kiểm tra lại thông tin.','QR_ID_MISMATCH');
    if (error)
      throw new HttpError(
        409,
        "Chưa lưu được hồ sơ hoặc lượt chụp đã được sử dụng. Hãy thử lại.",
      );
    committed = true;
    let status='REVIEW';
    try{const saved=await db.from('kyc_submissions').select('*').eq('id',id).eq('profile_id',profile.id).single();if(!saved.error){const resolution=await resolveQrReview(db,saved.data);status=resolution.status;}}catch{}
    return Response.json(
      { ok: true, id, status, reviewDueAt: status==='APPROVED'?null:data, reviewDays: status==='APPROVED'?0:3 },
      { status: 201 },
    );
  } catch (error) {
    if (!committed)
      await Promise.all(written.map((path) => unlink(path).catch(() => {})));
    return errorResponse(error);
  }
}
