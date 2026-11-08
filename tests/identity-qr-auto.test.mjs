import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('QR approval requires declared valid expiry, bound consumed camera evidence and backend privilege; admin can supply missing expiry transactionally',async()=>{
 const db=new PGlite();try{
 const source=await readFile('tests/mobile-workflow-schema.test.mjs','utf8'),part=source.slice(source.indexOf("test('QR intake"));await db.exec(part.match(/await db\.exec\(`([\s\S]*?)`\)/)[1]);
 await db.exec(await readFile('deploy/vietnam/manual-kyc.sql','utf8'));await db.exec('alter table kyc_submissions add column extracted_encrypted text;alter table profiles add column deleted_at timestamptz;alter table kyc_photo_sessions add column qr_fields_encrypted text;alter table kyc_photo_sessions add column qr_national_hash text;');
 for(const name of ['identity-live-capture','identity-qr-intake','identity-qr-auto'])await db.exec(await readFile('deploy/vietnam/'+name+'.sql','utf8'));
 const id='30000000-0000-4000-8000-000000000001',hash='a'.repeat(64),holder='b'.repeat(64),encrypted='encrypted-valid-qr-data-long-enough';const session=(await db.query("insert into kyc_photo_sessions(profile_id,capture_version,consumed_at,qr_fields_encrypted,qr_national_hash) values('owner',2,now(),$1,$2) returning id",[encrypted,hash])).rows[0].id;
 const paths={qrPolicy:'V1',consentVersion:'RELOO_KYC_QR_V5',qrAcknowledged:true,...Object.fromEntries(['front','back','selfie','video'].map(k=>[k,id+'-'+k+'.enc']))};
 await db.query("insert into kyc_submissions(id,profile_id,national_id_hash,document_paths,photo_session_id,extracted_encrypted,consent_at,status,provider,review_due_at) values($1,'owner',$2,$3,$4,$5,now(),'REVIEW','MANUAL',now()+interval '3 days')",[id,hash,paths,session,encrypted]);
 const call=()=>db.query('select reloo_resolve_kyc_qr($1,$2,$3,$4) status',[id,encrypted,holder,hash]);
 await db.exec('set role authenticated');await assert.rejects(call(),/permission denied/);await db.exec('reset role');
 assert.equal((await call()).rows[0].status,'REVIEW');assert.equal((await db.query('select count(*)::int n from verified_identities')).rows[0].n,0);
 await db.query("update kyc_submissions set declared_expiry='2020-01-01' where id=$1",[id]);assert.equal((await call()).rows[0].status,'REVIEW');
 await db.query("update kyc_submissions set declared_expiry='2040-01-01',document_paths=$2 where id=$1",[id,{...paths,video:'wrong.enc'}]);await assert.rejects(call(),/CAPTURE_REQUIRED/);
 await db.query('update kyc_submissions set document_paths=$2 where id=$1',[id,paths]);await db.query('update kyc_photo_sessions set qr_national_hash=$2 where id=$1',[session,'c'.repeat(64)]);await assert.rejects(call(),/CAPTURE_REQUIRED/);await db.query('update kyc_photo_sessions set qr_national_hash=$2 where id=$1',[session,hash]);
 assert.equal((await call()).rows[0].status,'APPROVED');const identity=(await db.query("select expires_at from verified_identities where profile_id='owner'")).rows[0];assert.equal(new Date(identity.expires_at).toISOString(),'2040-01-01T17:00:00.000Z');assert.equal((await call()).rows[0].status,'APPROVED');
 await db.query("update kyc_submissions set status='REVIEW',declared_expiry=null where id=$1",[id]);await db.exec('create or replace function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$ select $1=\'staff-reviewer\' $$;');
 const review=(actor,expiry)=>db.query('select reloo_review_kyc_qr($1,$2,$3,$4,$5,$6) status',[actor,id,expiry,encrypted,holder,hash]);await assert.rejects(review('intruder','2040-01-01'),/PERMISSION_REQUIRED/);await assert.rejects(review('staff-reviewer',null),/EXPIRY_REQUIRED/);await assert.rejects(review('staff-reviewer','2020-01-01'),/EXPIRY_REQUIRED/);
 await db.exec("insert into profiles(id,activation_status) values('staff-reviewer','ACTIVE')");assert.equal((await review('staff-reviewer','2040-01-02')).rows[0].status,'APPROVED');assert.equal((await db.query('select reviewed_by from kyc_submissions where id=$1',[id])).rows[0].reviewed_by,'staff-reviewer');
 }finally{await db.close();}
});

