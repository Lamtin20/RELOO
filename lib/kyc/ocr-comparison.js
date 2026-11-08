import {normalizedHolderName} from '../profile/validation.js';
export const OCR_COMPARISON_NOTICE='RELOO_OCR_COMPARE_V1';
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v:null;
const number=v=>typeof v==='string'&&/^\d{12}$/.test(v)?v:null;
const name=v=>typeof v==='string'&&v.length<=100&&/^[\p{L} '\-]+$/u.test(v)&&normalizedHolderName(v).length>=3?v:null;
export function compareIdentityOcr(ocr,qr){
 const engines=[{id:'tesseract',front:ocr?.version==='VN_CARD_OCR_V1'?ocr.front:null}];
 if(['PROCESSED','PARTIAL'].includes(ocr?.vietocr?.status))engines.push({id:'vietocr',front:ocr.vietocr.front});
 const types={nationalId:number,fullName:name,dateOfBirth:date},expected={nationalId:qr.nationalId,fullName:qr.name,dateOfBirth:qr.birthDate};
 const fields={};let conflict=false,complete=true;
 for(const [key,validate] of Object.entries(types)){
  const candidates=engines.map(e=>({engine:e.id,value:validate(e.front?.[key])})).filter(e=>e.value);
  const normalize=v=>key==='fullName'?normalizedHolderName(v):v;
  const mismatch=candidates.some(c=>normalize(c.value)!==normalize(expected[key]||''));
  const disagreement=new Set(candidates.map(c=>normalize(c.value))).size>1;
  if(mismatch||disagreement)conflict=true;if(!candidates.length)complete=false;
  fields[key]={candidates,matchesQr:candidates.length?!mismatch&&!disagreement:null};
 }
 fields.expiryDate={candidates:date(ocr?.expiryDate)?[{engine:'tesseract',value:ocr.expiryDate}]:[],matchesQr:null};
 return {method:'IMAGE_OCR_QR_COMPARISON_V1',verdict:conflict?'MISMATCH':complete?'MATCH':'INCOMPLETE',fields,vietocrStatus:['DISABLED','NOT_LOADED','READY','PROCESSED','PARTIAL','UNAVAILABLE','NO_TEXT_REGIONS'].includes(ocr?.vietocr?.status)?ocr.vietocr.status:'UNAVAILABLE',requiresHumanConfirmation:true,authenticity:'NOT_ESTABLISHED'};
}
