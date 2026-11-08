import {normalizedHolderName} from '../profile/validation.js';
import {validExpiry} from './manual.js';

export function ocrQrDecision(ocr,qr,now=new Date()){
 const front=ocr?.front;
 const idMatches=/^\d{12}$/.test(front?.nationalId||'')&&front.nationalId===qr?.nationalId;
 const name=normalizedHolderName(front?.fullName),nameMatches=name.length>=3&&name===normalizedHolderName(qr?.name);
 const scores=['idConfidence','nameConfidence'].map(key=>front?.[key]);
 const validScores=scores.every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100);
 // Exact agreement with the independently decoded QR is the business rule;
 // reject missing/very weak OCR instead of fuzzy-matching or correcting it to QR.
 const confidence=ocr?.version==='VN_CARD_OCR_V1'&&['CCCD','CAN_CUOC'].includes(front?.cardType)&&validScores&&scores.every(value=>value>=50);
 const expiryValid=validExpiry(ocr?.expiryDate,now);
 const eligible=Boolean(idMatches&&nameMatches&&confidence&&expiryValid);
 return {method:'OCR_QR_V1',eligible,manualReview:!eligible,nationalIdMatches:idMatches,nameMatches,ocrConfident:confidence,expiryValid,cardType:front?.cardType||'UNKNOWN',expiryCandidate:expiryValid?ocr.expiryDate:null,reason:eligible?'MATCHED':!front?'OCR_UNAVAILABLE':!confidence?'OCR_UNCERTAIN':!idMatches||!nameMatches?'INFORMATION_MISMATCH':'EXPIRY_REVIEW'};
}
