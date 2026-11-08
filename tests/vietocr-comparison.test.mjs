import test from 'node:test';import assert from 'node:assert/strict';
import {compareIdentityOcr} from '../lib/kyc/ocr-comparison.js';
const qr={nationalId:'099000000001',name:'Nguyễn Văn Thử',birthDate:'1990-01-01'};
const front={nationalId:qr.nationalId,fullName:'NGUYỄN VĂN THỬ',dateOfBirth:qr.birthDate};
test('OCR comparison preserves diacritics, never authenticates, approves or overwrites QR',()=>{
 const image={version:'VN_CARD_OCR_V1',front,expiryDate:'2040-01-01',vietocr:{status:'PROCESSED',front}};const before=structuredClone(qr),r=compareIdentityOcr(image,qr);
 assert.equal(r.verdict,'MATCH');assert.equal(r.authenticity,'NOT_ESTABLISHED');assert.equal(r.requiresHumanConfirmation,true);assert.deepEqual(qr,before);assert.equal(r.eligible,undefined);assert.equal(r.fields.fullName.candidates[0].value,'NGUYỄN VĂN THỬ');assert.equal(r.fields.expiryDate.matchesQr,null);
});
test('independent engines disagree rather than silently correcting each other to QR',()=>{
 const r=compareIdentityOcr({version:'VN_CARD_OCR_V1',front,vietocr:{status:'PROCESSED',front:{...front,nationalId:'099000000002'}}},qr);assert.equal(r.verdict,'MISMATCH');assert.equal(r.fields.nationalId.candidates.length,2);
 assert.equal(compareIdentityOcr({version:'VN_CARD_OCR_V1',front:{...front,fullName:'NGƯỜI KHÁC'}},qr).verdict,'MISMATCH');
 assert.equal(compareIdentityOcr({front:{nationalId:null}},qr).verdict,'INCOMPLETE');
 assert.equal(compareIdentityOcr({version:'VN_CARD_OCR_V1',front:{...front,dateOfBirth:'1990-02-31'}},qr).verdict,'INCOMPLETE');
 const absent=compareIdentityOcr({front:{},vietocr:{status:'UNAVAILABLE',front}},qr);assert.equal(absent.verdict,'INCOMPLETE');assert.equal(absent.vietocrStatus,'UNAVAILABLE');
});
