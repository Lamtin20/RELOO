import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
test('new notice, unread expiry and mismatches remain review; committed approval emits one notification',async()=>{
 const db=new PGlite();try{
 const source=await readFile('tests/mobile-workflow-schema.test.mjs','utf8'),part=source.slice(source.indexOf("test('QR intake"));await db.exec(part.match(/await db\.exec\(`([\s\S]*?)`\)/)[1]);
 await db.exec(await readFile('deploy/vietnam/manual-kyc.sql','utf8'));await db.exec('alter table kyc_submissions add column extracted_encrypted text;alter table profiles add column deleted_at timestamptz;alter table kyc_photo_sessions add column qr_fields_encrypted text;alter table kyc_photo_sessions add column qr_national_hash text;');
 for(const f of ['identity-live-capture','identity-qr-intake','identity-qr-auto'])await db.exec(await readFile('deploy/vietnam/'+f+'.sql','utf8'));
 await db.exec("create table qa_kyc_notifications(event text primary key, recipient text);create function reloo_emit_notification(text,text,text,text,text,text) returns void language sql as $$insert into qa_kyc_notifications values($2,$3) on conflict do nothing$$;");
 await db.exec(await readFile('supabase/migrations/20261025120000_kyc_auto_expiry.sql','utf8'));
 const id='30000000-0000-4000-8000-000000000099',hash='a'.repeat(64),holder='b'.repeat(64),encrypted='encrypted-valid-qr-fields-fixture-only';const session=(await db.query("insert into kyc_photo_sessions(profile_id,capture_version,consumed_at,qr_fields_encrypted,qr_national_hash) values('owner',2,now(),$1,$2) returning id",[encrypted,hash])).rows[0].id;
 const paths={qrPolicy:'V1',consentVersion:'RELOO_KYC_OCR_FINAL_V6',qrAcknowledged:true,ocrNeedsReview:true,...Object.fromEntries(['front','back','selfie','video'].map(k=>[k,id+'-'+k+'.enc']))};
 await db.query("insert into kyc_submissions(id,profile_id,national_id_hash,document_paths,photo_session_id,extracted_encrypted,consent_at,status,provider,review_due_at,declared_expiry) values($1,'owner',$2,$3,$4,$5,now(),'REVIEW','MANUAL',now()+interval '3 days','2040-01-01')",[id,hash,paths,session,encrypted]);
 const call=()=>db.query('select reloo_resolve_kyc_qr($1,$2,$3,$4) status',[id,encrypted,holder,hash]);
 assert.equal((await call()).rows[0].status,'REVIEW');assert.equal((await db.query('select count(*)::int n from qa_kyc_notifications')).rows[0].n,0);
 await db.query("update kyc_submissions set document_paths=$2 where id=$1",[id,{...paths,ocrNeedsReview:false}]);assert.equal((await call()).rows[0].status,'APPROVED');await call();
 assert.equal((await db.query('select count(*)::int n from qa_kyc_notifications')).rows[0].n,1);
 await db.exec('set role authenticated');await assert.rejects(call(),/permission denied/);await db.exec('reset role');
 }finally{await db.close()}
});
