import {createHash} from 'node:crypto';
import {encryptPrivate,decryptPrivate} from '../operations/crypto.js';
import {validExpiry} from './manual.js';
import {parseIdentityQr} from './qr.js';
import {compareIdentityOcr} from './ocr-comparison.js';
const digest=v=>createHash('sha256').update(v).digest('hex');
const binding=({profileId,sessionId,manifest,qrPayload,businessVersion,noticeVersion})=>({profileId,sessionId,front:manifest?.hashes?.front,back:manifest?.hashes?.back,qr:digest(qrPayload),businessVersion,noticeVersion});
export function issueExpiryReceipt(context,ocr,now=Date.now()){
 const cardType=ocr?.front?.cardType,side=cardType==='CCCD'?'front':cardType==='CAN_CUOC'?'back':null;
 if(!side||ocr.expirySide!==side||!validExpiry(ocr.expiryDate))return null;
 const comparison=compareIdentityOcr(ocr,parseIdentityQr(context.qrPayload));
 return encryptPrivate(JSON.stringify({purpose:'KYC_OCR_EXPIRY_V1',...binding(context),expiryDate:ocr.expiryDate,cardType,side,needsReview:comparison.verdict!=='MATCH',expiresAt:now+10*60*1000}));
}
export function verifyExpiryReceipt(token,context,now=Date.now()){
 if(typeof token!=='string'||token.length>5000)throw Error('EXPIRY_RECEIPT_INVALID');
 try{const r=JSON.parse(decryptPrivate(token));if(r.purpose!=='KYC_OCR_EXPIRY_V1'||!Number.isFinite(r.expiresAt)||r.expiresAt<=now||r.expiresAt>now+10*60*1000||!validExpiry(r.expiryDate))throw Error();
  const expected=binding(context);if(Object.entries(expected).some(([k,v])=>!v||r[k]!==v)||typeof r.needsReview!=='boolean'||r.side!==(r.cardType==='CCCD'?'front':r.cardType==='CAN_CUOC'?'back':null))throw Error();return {expiryDate:r.expiryDate,cardType:r.cardType,side:r.side,needsReview:r.needsReview};
 }catch{throw Error('EXPIRY_RECEIPT_INVALID')}
}
