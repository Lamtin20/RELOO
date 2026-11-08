import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const sql=n=>fs.readFile('deploy/vietnam/'+n+'.sql','utf8');
test('final QR acknowledgement and document intake commit together, never on failed consent',async()=>{
 const db=new PGlite();try{
 const existing=await fs.readFile('tests/mobile-workflow-schema.test.mjs','utf8');const part=existing.slice(existing.indexOf("test('QR intake"));const schema=part.match(/await db\.exec\(`([\s\S]*?)`\)/)[1];await db.exec(schema);
 await db.exec(await sql('manual-kyc'));await db.exec('alter table profiles add column deleted_at timestamptz;alter table kyc_photo_sessions add column qr_fields_encrypted text;alter table kyc_photo_sessions add column qr_national_hash text;');await db.exec(await sql('identity-live-capture'));await db.exec(await sql('identity-qr-intake'));
 const unique=await sql('identity-qr-unique');for(const name of ['reloo_identity_conflict','reloo_store_identity_qr']){const fn=unique.match(new RegExp('create or replace function '+name+'\\([\\s\\S]*?end\\$\\$;|create or replace function '+name+'\\([\\s\\S]*?\\$\\$;'));assert.ok(fn);await db.exec(fn[0]);}
 await db.exec(await sql('identity-consent-submit'));
 const session=(await db.query("insert into kyc_photo_sessions(profile_id,capture_version) values('owner',2) returning id")).rows[0].id,id='00000000-0000-4000-8000-000000000001',hash='a'.repeat(64),paths={front:id+'-front.enc',back:id+'-back.enc',selfie:id+'-selfie.enc',portraitSource:'CAMERA_CAPTURE',mode:'MANUAL',consentVersion:'RELOO_KYC_QR_REVIEW_V3',qrAcknowledged:true,collectionPolicyVersion:'2026-10-17.1'};
 const submit=(actor,p)=>db.query('select reloo_submit_kyc_reviewed_qr($1,$2,$3,$4,null,$5,$6,$7)',[actor,id,'encrypted-national-test-value',hash,p,session,'encrypted-qr-test-fields-value']);
 await assert.rejects(submit('owner',{...paths,qrAcknowledged:false}),/CONSENT_REQUIRED/);
 await assert.rejects(submit('other',paths),/PHOTO_SESSION/);
 await assert.rejects(submit('owner',{...paths,front:'invalid'}),/THREE_PHOTOS_REQUIRED/);
 const before=(await db.query('select qr_fields_encrypted,consumed_at from kyc_photo_sessions where id=$1',[session])).rows[0];assert.equal(before.qr_fields_encrypted,null);assert.equal(before.consumed_at,null);
 await submit('owner',paths);assert.equal((await db.query('select status from kyc_submissions where id=$1',[id])).rows[0].status,'REVIEW');assert.ok((await db.query('select consumed_at from kyc_photo_sessions where id=$1',[session])).rows[0].consumed_at);
 await assert.rejects(submit('owner',paths),/PHOTO_SESSION/);await db.exec('set role authenticated');await assert.rejects(submit('owner',paths),/permission denied/);
 }finally{await db.close();}
});
