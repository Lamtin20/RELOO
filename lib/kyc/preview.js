import {readIdentityDocuments} from '@/lib/kyc/read-document';
import {compareIdentityOcr,OCR_COMPARISON_NOTICE} from '@/lib/kyc/ocr-comparison';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {requireAccount} from '@/lib/security/authorization';
import {assertOrigin,errorResponse,HttpError,rateLimit,readMultipart} from '@/lib/server/http';
import {publicBusiness} from '@/lib/operations/settings';
import {IDENTITY_NOTICE_VERSION,identityControllerReady} from '@/lib/privacy/identity-policy';
import {validCaptureManifest} from '@/lib/kyc/capture';
import {parseIdentityQr} from '@/lib/kyc/qr';
import {issueExpiryReceipt} from '@/lib/kyc/expiry-receipt';



// Transient processing only: no submission, file, approval or consumed session.
// Final submission revalidates all evidence and performs QR-based approval.
export async function previewIdentity(request,{ocr=false}={}){
 try{
  assertOrigin(request);
  const {profile,db}=await requireAccount(request,{active:false});
  rateLimit(request,(ocr?'kyc-ocr-preview:':'kyc-preview:')+profile.id,3);
  if(profile.activation_status==='RESTRICTED')throw new HttpError(403,'Tài khoản cần được hỗ trợ trước khi xác minh.');
  if(process.env.RELOO_DATA_REGION!=='VN')throw new HttpError(503,'Kho giấy tờ tại Việt Nam chưa sẵn sàng.');
  const business=await publicBusiness(db);
  if(!identityControllerReady(business.entity))throw new HttpError(503,'Chưa thể tiếp nhận giấy tờ. Vui lòng thử lại sau.','CONTROLLER_NOT_CONFIGURED');
  const form=await readMultipart(request,4100000);
  const automatic=process.env.RELOO_KYC_AUTO_EXPIRY==='1'&&!ocr;
  if(ocr){
   if(process.env.RELOO_KYC_OCR_COMPARISON!=='1')throw new HttpError(503,'Đọc chữ từ ảnh chưa sẵn sàng.','OCR_DISABLED');
   if(form.get('ocrConsent')!=='true'||form.get('ocrNoticeVersion')!==OCR_COMPARISON_NOTICE)throw new HttpError(409,'Cần đồng ý riêng để đọc chữ từ ảnh.','OCR_CONSENT_REQUIRED');
  }
  if(form.get('consent')!=='true'||form.get('consentVersion')!==IDENTITY_NOTICE_VERSION||Number(form.get('businessVersion'))!==business.version)throw new HttpError(409,'Hãy đọc và đồng ý thông báo xử lý dữ liệu mới nhất.','CONSENT_UPDATED');
  const sessionId=String(form.get('photoSessionId')||'');
  if(!/^[a-f0-9-]{36}$/i.test(sessionId))throw new HttpError(400,'Hãy thực hiện lại lượt chụp.');
  const {data:session}=await db.from('kyc_photo_sessions').select('*').eq('id',sessionId).eq('profile_id',profile.id).single();
  let manifest;try{manifest=JSON.parse(String(form.get('captureManifest')||''));}catch{}
  if(!validCaptureManifest(manifest,session,profile.id))throw new HttpError(409,'Lượt chụp đã hết hạn. Hãy chụp lại.','PHOTO_SESSION_EXPIRED');
  let qr;try{qr=parseIdentityQr(String(form.get('qrPayload')||''));}catch{throw new HttpError(400,'Hãy quét lại mã QR.','QR_INVALID');}
  const images={};
  for(const kind of ['front','back']){
   const file=form.get(kind);
   if(!file||typeof file.arrayBuffer!=='function'||file.size<1||file.size>2000000||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new HttpError(400,'Ảnh căn cước không hợp lệ.');
   const raw=Buffer.from(await file.arrayBuffer());
   if(createHash('sha256').update(raw).digest('hex')!==manifest.hashes[kind])throw new HttpError(409,'Ảnh đã thay đổi. Hãy chụp lại.','CAPTURE_CHANGED');
   try{images[kind]=await sharp(raw,{limitInputPixels:16000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:94}).toBuffer();}catch{throw new HttpError(400,'Ảnh chưa đọc được. Hãy chụp lại rõ nét.');}
  }
  if(automatic){
   let result;try{result=await readIdentityDocuments(images);}catch{return Response.json({ok:true,checks:{method:'OCR_QR_FINAL_V1',qrValid:true,eligible:false,reason:'OCR_UNAVAILABLE',expiryDate:null},expiryReceipt:null},{headers:{'Cache-Control':'no-store'}});}
   const comparison=compareIdentityOcr(result,qr),expiryReceipt=issueExpiryReceipt({profileId:profile.id,sessionId,manifest,qrPayload:String(form.get('qrPayload')),businessVersion:business.version,noticeVersion:IDENTITY_NOTICE_VERSION},result);
   return Response.json({ok:true,checks:{method:'OCR_QR_FINAL_V1',qrValid:true,eligible:!!expiryReceipt&&comparison.verdict==='MATCH',reason:comparison.verdict,expiryDate:result.expiryDate||null,expirySide:result.expirySide||null},expiryReceipt},{headers:{'Cache-Control':'no-store'}});
  }
  if(ocr){
   let result;try{result=await readIdentityDocuments(images);}catch{throw new HttpError(503,'Chưa đọc được ảnh. Bạn có thể thử lại hoặc tiếp tục kiểm tra QR.','OCR_UNAVAILABLE');}
   return Response.json({ok:true,comparison:compareIdentityOcr(result,qr)},{headers:{'Cache-Control':'no-store'}});
  }
  const checks={method:'QR_ONLY_V1',qrValid:!!qr.nationalId,eligible:true,manualReview:false,reason:'QR_VALID',expiryKnown:false};
  return Response.json({ok:true,checks},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error);}
}
