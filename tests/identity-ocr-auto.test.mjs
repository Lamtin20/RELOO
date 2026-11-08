import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {ocrQrDecision} from '../lib/kyc/ocr-decision.js';
const qr={nationalId:'099000000001',name:'Nguyễn Người Thử'};
const ocr={version:'VN_CARD_OCR_V1',front:{cardType:'CAN_CUOC',nationalId:qr.nationalId,fullName:'NGUYEN NGUOI THU',idConfidence:96,nameConfidence:95},expiryDate:'2040-01-01'};
test('both card layouts match ID and normalized name; weak, conflicting, expired or unknown OCR stays manual',()=>{
 const now=new Date('2026-10-21');
 for(const cardType of ['CCCD','CAN_CUOC'])assert.equal(ocrQrDecision({...ocr,front:{...ocr.front,cardType}},qr,now).eligible,true);
 for(const value of [null,{...ocr,version:'CLIENT'},{...ocr,front:{...ocr.front,nationalId:'099000000002'}},{...ocr,front:{...ocr.front,fullName:'NGUYEN NGUOI KHAC'}},{...ocr,front:{...ocr.front,idConfidence:49}},{...ocr,front:{...ocr.front,nameConfidence:NaN}},{...ocr,front:{...ocr.front,cardType:'UNKNOWN'}},{...ocr,expiryDate:'2025-01-01'},{...ocr,expiryDate:null}])assert.equal(ocrQrDecision(value,qr,now).eligible,false);
});
test('automatic decision is transactional, server-only and cannot overwrite a manual decision or approve missing capture',async()=>{
 const db=new PGlite();try{
  const existing=await readFile('tests/mobile-workflow-schema.test.mjs','utf8'),part=existing.slice(existing.indexOf("test('QR intake"));await db.exec(part.match(/await db\.exec\(`([\s\S]*?)`\)/)[1]);
  await db.exec(await readFile('deploy/vietnam/manual-kyc.sql','utf8'));
  await db.exec('alter table profiles add column deleted_at timestamptz;');
  await db.exec('alter table kyc_photo_sessions add column qr_fields_encrypted text;alter table kyc_photo_sessions add column qr_national_hash text;');
  await db.exec(await readFile('deploy/vietnam/identity-live-capture.sql','utf8'));
  await db.exec(await readFile('deploy/vietnam/identity-qr-intake.sql','utf8'));
  await db.exec(await readFile('deploy/vietnam/identity-ocr-auto.sql','utf8'));
  const id='30000000-0000-4000-8000-000000000001',hash='a'.repeat(64),holder='b'.repeat(64),session=(await db.query("insert into kyc_photo_sessions(profile_id,capture_version,consumed_at) values('owner',2,now()) returning id")).rows[0].id;
  const paths={ocrQrPolicy:'V1',consentVersion:'RELOO_KYC_OCR_QR_V4',...Object.fromEntries(['front','back','selfie','video'].map(kind=>[kind,id+'-'+kind+'.enc']))};
  await db.query("insert into kyc_submissions(id,profile_id,national_id_hash,document_paths,photo_session_id,consent_at,status,provider,review_due_at) values($1,'owner',$2,$3,$4,now(),'REVIEW','MANUAL',now()+interval '3 days')",[id,hash,paths,session]);
  const checks=ocrQrDecision(ocr,qr),call=(value=checks,expiry='2040-01-01',national=hash)=>db.query('select reloo_resolve_kyc_ocr($1,$2,$3,$4,$5,$6) status',[id,value,expiry,'encrypted-fields-of-sufficient-length',holder,national]);
  await db.exec('set role authenticated');await assert.rejects(call(),/permission denied/);await db.exec('reset role');
  await assert.rejects(call({...checks,nameMatches:false}),/OCR_MATCH_REQUIRED/);
  await assert.rejects(call(checks,null),/OCR_IDENTITY_INVALID/);
  await assert.rejects(call(checks,'2040-01-01','c'.repeat(64)),/OCR_IDENTITY_INVALID/);
  await db.query('update kyc_submissions set document_paths=$1 where id=$2',[{...paths,video:'invalid.enc'},id]);await assert.rejects(call(),/CAPTURE_REQUIRED/);
  await db.query('update kyc_submissions set document_paths=$1 where id=$2',[paths,id]);
  assert.equal((await call({...checks,eligible:false,manualReview:true})).rows[0].status,'REVIEW');
  assert.equal((await db.query('select count(*)::int n from verified_identities')).rows[0].n,0);
  assert.equal((await call()).rows[0].status,'APPROVED');
  assert.equal((await db.query("select kyc_level from profiles where id='owner'")).rows[0].kyc_level,'L2');
  assert.equal((await db.query('select submission_id from verified_identities')).rows[0].submission_id,id);
  assert.equal((await call()).rows[0].status,'APPROVED');
  assert.equal((await db.query("select count(*)::int n from security_audit where action='KYC_AUTO_APPROVED'")).rows[0].n,1);
  await db.query("update kyc_submissions set status='REJECTED' where id=$1",[id]);assert.equal((await call()).rows[0].status,'REJECTED');
 }finally{await db.close();}
});
