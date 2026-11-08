import {validExpiry} from './manual.js';
export function qrAnalysis(result,nationalId,now=new Date()){
 const matched=Array.isArray(result?.ocr?.nationalIds)&&result.ocr.nationalIds.length===1&&result.ocr.nationalIds[0]===nationalId;
 const raw=result?.ocr?.fields?.expiryDate||'',parts=/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/.exec(raw),expiry=parts?`${parts[3]}-${parts[2]}-${parts[1]}`:null;
 return {source:'CARD_QR',manualReview:true,eligible:false,ocrStatus:result?.ocr?'PROCESSED':'UNAVAILABLE',nationalIdMatches:matched,expiryCandidate:matched&&validExpiry(expiry,now)?expiry:null,face:{...result?.face,requiresHumanReview:true,liveness:result?.face?.liveness||'NOT_ESTABLISHED'}};
}
