import {validExpiry} from './manual.js';
﻿import {decryptPrivate,encryptPrivate,privateHash} from '../operations/crypto.js';
import {normalizedHolderName} from '../profile/validation.js';
import {parseIdentityQr} from './qr.js';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
const packedDate=v=>v.slice(8,10)+v.slice(5,7)+v.slice(0,4);
export function validateStoredQr(fields){
 if(!fields||fields.source!=='CARD_QR')throw Error('QR_REQUIRED');
 return parseIdentityQr([fields.nationalId,fields.oldId||'',fields.name,packedDate(fields.birthDate||''),fields.gender,fields.residence,packedDate(fields.issueDate||'')].join('|'));
}
// This is QR-based account approval, not OCR/face matching or government proof.
export async function resolveQrReview(db,item,{actor=null,expiryDate=item.declared_expiry}={}){
 if(item.status!=='REVIEW'||item.superseded_at)return {status:item.status};
 let qr;try{qr=validateStoredQr(JSON.parse(decryptPrivate(item.extracted_encrypted)));}catch{throw Error('QR_INVALID');}
 for(const kind of ['front','back','selfie','video']){
  if(item.document_paths?.[kind]!==`${item.id}-${kind}.enc`)throw Error('CAPTURE_REQUIRED');
  const content=decryptPrivate(await readFile(join(process.env.RELOO_EVIDENCE_DIR,item.document_paths[kind]),'utf8'));
  if(Buffer.from(content,'base64').length<(kind==='video'?1000:1))throw Error('CAPTURE_REQUIRED');
 }
 if(expiryDate&&(!validExpiry(expiryDate)||expiryDate<qr.issueDate))throw Error('EXPIRY_REQUIRED');
 const fields={nationalId:qr.nationalId,fullName:qr.name,dateOfBirth:qr.birthDate,sex:qr.gender,residence:qr.residence,issueDate:qr.issueDate,expiryDate:expiryDate||null,verificationMethod:item.document_paths?.expirySource?.method==='SERVER_OCR_RECEIPT_V1'?'QR_OCR_EXPIRY_V1':'QR_ONLY_V1',biometricVerified:false};
 const {data,error}=await db.rpc(actor?'reloo_review_kyc_qr':'reloo_resolve_kyc_qr',{...(actor?{p_actor:actor,p_expiry:expiryDate}:{}),p_id:item.id,p_fields:encryptPrivate(JSON.stringify(fields)),p_holder_hash:privateHash('HOLDER_NAME',normalizedHolderName(qr.name)),p_national_hash:privateHash('NATIONAL_ID',qr.nationalId)});
 if(error){const e=Error('KYC_QR_RESOLUTION_FAILED');e.code=error.message;throw e;}
 return {status:data,checks:{method:'QR_ONLY_V1',qrValid:true,eligible:data==='APPROVED',manualReview:data!=='APPROVED',reason:data==='APPROVED'?'QR_VALID':'ACCOUNT_REVIEW'}};
}
