import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {issueExpiryReceipt,verifyExpiryReceipt} from '../lib/kyc/expiry-receipt.js';
const context={profileId:'fixture-profile',sessionId:'fixture-session',manifest:{hashes:{front:'a'.repeat(64),back:'b'.repeat(64)}},qrPayload:'099000000001||Nguyễn Người Thử|01011990|Nam|Fixture address|01012020',businessVersion:1,noticeVersion:'RELOO_KYC_OCR_FINAL_V6'};
const ocr={version:'VN_CARD_OCR_V1',front:{cardType:'CCCD',nationalId:'099000000001',fullName:'NGUYEN NGUOI THU',dateOfBirth:'1990-01-01'},expiryDate:'2040-01-01',expirySide:'front'};
test('expiry receipt binds identity, capture, QR, notice, controller and a short expiry',()=>{
 process.env.RELOO_PRIVATE_DATA_KEY=randomBytes(32).toString('hex');const now=Date.now(),token=issueExpiryReceipt(context,ocr,now),proof=verifyExpiryReceipt(token,context,now+1000);assert.equal(proof.expiryDate,'2040-01-01');assert.equal(proof.needsReview,false);
 for(const patch of [{profileId:'other'},{sessionId:'other'},{businessVersion:2},{noticeVersion:'old'},{qrPayload:context.qrPayload.replace('099000000001','099000000002')},{manifest:{hashes:{front:'c'.repeat(64),back:'b'.repeat(64)}}}])assert.throws(()=>verifyExpiryReceipt(token,{...context,...patch},now+1000),/RECEIPT/);
 assert.throws(()=>verifyExpiryReceipt(token,context,now+600001),/RECEIPT/);assert.throws(()=>verifyExpiryReceipt(token.slice(0,-4)+'xxxx',context,now),/RECEIPT/);
 assert.equal(issueExpiryReceipt(context,{...ocr,expirySide:'back'}),null);assert.equal(issueExpiryReceipt(context,{...ocr,expiryDate:'2020-01-01'}),null);
 const newCard={...ocr,front:{...ocr.front,cardType:'CAN_CUOC'},expirySide:'back'};assert.equal(verifyExpiryReceipt(issueExpiryReceipt(context,newCard),context).side,'back');
 const mismatch={...ocr,front:{...ocr.front,fullName:'NGUOI KHAC'}};assert.equal(verifyExpiryReceipt(issueExpiryReceipt(context,mismatch),context).needsReview,true);
});
