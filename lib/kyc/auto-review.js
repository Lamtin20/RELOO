import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {decryptPrivate,encryptPrivate,privateHash} from '../operations/crypto.js';
import {normalizedHolderName} from '../profile/validation.js';
import {ocrQrDecision} from './ocr-decision.js';
import {readIdentityDocuments} from './read-document.js';

// Called only after the final consent and evidence transaction has committed.
export async function resolveOcrReview(db,item){
 if(item.status!=='REVIEW'||item.superseded_at||item.document_paths?.ocrQrPolicy!=='V1')return {status:item.status};
 let qr,ocr;
 try{
  qr=JSON.parse(decryptPrivate(item.extracted_encrypted));
  const images={};
  for(const kind of ['front','back']){
   if(item.document_paths[kind]!==`${item.id}-${kind}.enc`)throw Error('INVALID_DOCUMENT_PATH');
   const encrypted=await readFile(join(process.env.RELOO_EVIDENCE_DIR,item.document_paths[kind]),'utf8');
   images[kind]=Buffer.from(decryptPrivate(encrypted),'base64');
  }
  ocr=await readIdentityDocuments(images);
 }catch{}
 const checks=ocrQrDecision(ocr,qr),fields=checks.eligible?{nationalId:qr.nationalId,fullName:qr.name,dateOfBirth:qr.birthDate,sex:qr.gender,residence:qr.residence,issueDate:qr.issueDate,expiryDate:ocr.expiryDate,verificationMethod:'OCR_QR_V1'}:null;
 const {data,error}=await db.rpc('reloo_resolve_kyc_ocr',{p_id:item.id,p_checks:checks,p_expiry:checks.expiryCandidate,p_fields:fields?encryptPrivate(JSON.stringify(fields)):null,p_holder_hash:fields?privateHash('HOLDER_NAME',normalizedHolderName(fields.fullName)):null,p_national_hash:fields?privateHash('NATIONAL_ID',fields.nationalId):null});
 if(error)throw Error('KYC_OCR_RESOLUTION_FAILED');
 return {status:data,checks};
}
