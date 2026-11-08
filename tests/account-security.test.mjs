import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {validatePin,pinHash,recentSecurityAuth} from '../lib/security/account-credentials.js';
import {sealPasskeyChallenge,openPasskeyChallenge,userVerifiedAssertion} from '../lib/security/passkey-challenge.js';
import {renderOtpEmail} from '../lib/email/otp-template.js';
process.env.RELOO_PRIVATE_DATA_KEY='42'.repeat(32);
test('PIN is salted, profile-bound, hashed, and rejects obvious 6-digit patterns',async()=>{
 assert.equal(validatePin('308527'),true);for(const p of ['123456','111111','121212','543210','12345','abcdef',123456])assert.equal(validatePin(p),false);
 const a=await pinHash('owner','308527','ab'.repeat(16));assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,await pinHash('owner','308527','cd'.repeat(16)));assert.notEqual(a,await pinHash('other','308527','ab'.repeat(16)));
});
test('passkey ceremony cannot cross purpose, account/session, expiration or signature; assertions require signed UV+UP flags',()=>{
 const now=1000000,data={id:'challenge',kind:'ENROLL',profile:'owner',session:'session-a'},value=sealPasskeyChallenge(data,now);
 assert.ok(openPasskeyChallenge(value,data,now+10));for(const expected of [{...data,profile:'other'},{...data,session:'b'},{...data,kind:'LOGIN'}])assert.equal(openPasskeyChallenge(value,expected,now),null);
 assert.equal(openPasskeyChallenge(value,data,now+300001),null);assert.equal(openPasskeyChallenge(value.slice(0,-1)+(value.endsWith('f')?'e':'f'),data,now),null);
 const bytes=Buffer.alloc(37);bytes[32]=1;assert.equal(userVerifiedAssertion({response:{authenticatorData:bytes.toString('base64url')}}),false);bytes[32]=5;assert.equal(userVerifiedAssertion({response:{authenticatorData:bytes.toString('base64url')}}),true);
 assert.equal(recentSecurityAuth({amr:[{method:'oauth',timestamp:now/1000}]},now),true);assert.equal(recentSecurityAuth({amr:[{method:'oauth',timestamp:now/1000-301}]},now),false);
});
test('OTP mail has an unbroken 6-digit code, expiry, escaped content and no marketing payload',()=>{
 const mail=renderOtpEmail({code:'001234',name:'<user>',body:'Confirm <request>'});assert.ok(mail.text.includes('001234'));assert.ok(mail.html.includes('001234'));assert.ok(mail.html.includes('&lt;user&gt;'));assert.ok(mail.html.includes('5 phút'));assert.ok(!mail.html.includes('<user>'));assert.throws(()=>renderOtpEmail({code:'123'}));
});
test('PIN lockout, optimistic revision, OTP cooldown/attempts/session binding and one-time use are enforced in PostgreSQL',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,encrypted_password text);create table profiles(id text primary key,auth_user_id uuid,deleted_at timestamptz);create table security_audit(actor_id text,subject_id text,action text,details jsonb);create table business_settings(id boolean primary key,version integer,entity jsonb);create table mobile_auth_flows(id uuid);create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select actor='admin'$$;create function reloo_save_business(actor text,version integer,entity jsonb,deposit jsonb) returns void language sql as $$select$$;insert into auth.users values('10000000-0000-4000-8000-000000000001','hash');insert into profiles values('owner','10000000-0000-4000-8000-000000000001',null),('other',null,null);insert into business_settings values(true,1,'{}');`);
 await db.exec(await readFile('deploy/vietnam/account-security.sql','utf8'));
 const hash='a'.repeat(64),salt='b'.repeat(32),set=rev=>db.query("select reloo_set_account_pin('owner',$1,$2,$3)",[hash,salt,rev]);await set(0);await assert.rejects(set(0),/SECURITY_CHANGED/);
 for(let i=0;i<5;i++)assert.equal((await db.query("select reloo_verify_account_pin('owner',$1) ok",['c'.repeat(64)])).rows[0].ok,false);
 assert.equal((await db.query("select reloo_verify_account_pin('owner',$1) ok",[hash])).rows[0].ok,false);
 await db.exec("update account_security set pin_locked_until=now()-interval '1 second' where profile_id='owner'");assert.equal((await db.query("select reloo_verify_account_pin('owner',$1) ok",[hash])).rows[0].ok,true);
 const id='20000000-0000-4000-8000-000000000001',session='verified-session-1';await db.query("select reloo_issue_account_otp('owner',$1,$2,'PIN_CHANGE',$3)",[id,session,hash]);await db.query("update account_security_otps set delivery='SENT' where id=$1",[id]);
 await assert.rejects(db.query("select reloo_issue_account_otp('owner',gen_random_uuid(),$1,'PIN_CHANGE',$2)",[session,hash]),/OTP_COOLDOWN/);
 const verify=(profile,s,h)=>db.query('select reloo_verify_account_otp($1,$2,$3,$4) ok',[profile,id,s,h]);assert.equal((await verify('other',session,hash)).rows[0].ok,false);assert.equal((await verify('owner','wrong-session',hash)).rows[0].ok,false);
 assert.equal((await verify('owner',session,hash)).rows[0].ok,true);assert.equal((await verify('owner',session,hash)).rows[0].ok,false);
 const consume=purpose=>db.query("select reloo_consume_account_otp('owner',$1,$2,$3) ok",[id,session,purpose]);assert.equal((await consume('PASSWORD_SET')).rows[0].ok,false);assert.equal((await consume('PIN_CHANGE')).rows[0].ok,true);assert.equal((await consume('PIN_CHANGE')).rows[0].ok,false);
  await db.exec("update account_security_otps set created_at=now()-interval '61 seconds'");const id2='20000000-0000-4000-8000-000000000002';await db.query("select reloo_issue_account_otp('owner',$1,$2,'PIN_CHANGE',$3)",[id2,session,hash]);await db.query("update account_security_otps set delivery='SENT' where id=$1",[id2]);for(let i=0;i<5;i++)assert.equal((await db.query("select reloo_verify_account_otp('owner',$1,$2,$3) ok",[id2,session,'f'.repeat(64)])).rows[0].ok,false);assert.equal((await db.query("select reloo_verify_account_otp('owner',$1,$2,$3) ok",[id2,session,hash])).rows[0].ok,false);
 await db.exec("update business_settings set entity_draft='{\"legalName\":\"SAMPLE\"}'");await assert.rejects(db.query("select reloo_save_business_entity('admin',1,'{}',false)"),/OFFICIAL_CONFIRMATION_REQUIRED/);
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from account_security'),/permission denied/);await assert.rejects(set(1),/permission denied/);await assert.rejects(db.query("select reloo_account_security_state('owner')"),/permission denied/);
 }finally{await db.close();}
});
