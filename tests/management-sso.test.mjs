import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {ssoToken,ssoHash,ssoChallenge,managementOrigins,validSsoState,ssoAuthorizePath} from '../lib/auth/management-sso.js';
import {crmNext} from '../lib/operations/access.js';
test('management SSO binds environment, redirect, verifier and short-lived browser state',()=>{
 const state=ssoToken(),verifier=ssoToken();assert.equal(ssoHash(verifier).length,64);assert.equal(ssoChallenge(verifier).length,43);assert.equal(validSsoState({state,verifier,at:1000},state,2000),true);
 for(const value of [{state:'wrong',verifier,at:1000},{state,verifier:'bad',at:1000},{state,verifier,at:3000},{state,verifier,at:-400000}])assert.ok(!validSsoState(value,state,2000));
 const path='/api/auth/sso/authorize?'+new URLSearchParams({state,challenge:ssoChallenge(verifier)});assert.equal(crmNext(path),path);
 for(const invalid of [path+'&state='+state,path+'&redirect=https://evil.invalid',path+'#fragment','https://evil.invalid'+path,'//evil.invalid'+path])assert.equal(ssoAuthorizePath(invalid),null);
 const stage={RELOO_ENVIRONMENT:'staging',RELOO_CHAT_CONTROL_HOST:'chat.reloo.vn',CRM_ORIGIN:'https://staging.reloo.vn',APP_ORIGIN:'https://staging.reloo.vn'};assert.equal(managementOrigins(stage).central,stage.CRM_ORIGIN);assert.throws(()=>managementOrigins({...stage,CRM_ORIGIN:'https://crm.reloo.vn'}));
 assert.throws(()=>managementOrigins({...stage,RELOO_ENVIRONMENT:'production',CRM_ORIGIN:'https://crm.reloo.vn',APP_ORIGIN:'https://reloo.vn'}));
});
test('actual SSO SQL rejects wrong verifier, replay, expiry, revoked MFA and ungranted staff',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role;create table profiles(id text primary key);create table crm_staff(profile_id text,role text,permissions text[],enabled boolean);create table crm_mfa_sessions(id uuid primary key,profile_id text,expires_at timestamptz,revoked_at timestamptz);insert into profiles values('staff');insert into crm_staff values('staff','staff',ARRAY['crm.read','bots.read'],true);insert into crm_mfa_sessions values('60000000-0000-4000-8000-000000000001','staff',now()+interval '1 hour',null);");
 const source=await readFile('supabase/migrations/20261024140000_chat_control.sql','utf8');await db.exec(source.slice(source.indexOf('CREATE OR REPLACE FUNCTION public.reloo_ai_allowed'),source.indexOf('CREATE OR REPLACE FUNCTION public.reloo_ai_control')));
 await db.exec(await readFile('supabase/migrations/20261024160000_management_sso.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261024170000_agent_office_target.sql','utf8'));
 await assert.rejects(db.query("insert into management_sso_tickets(token_hash,challenge,target_origin) values($1,$2,'https://evil.invalid')",['e'.repeat(64),'c'.repeat(43)]));
 const hash='a'.repeat(64),challenge='b'.repeat(43),target='https://chat.reloo.vn';const issue=()=>db.query("insert into management_sso_tickets(token_hash,challenge,target_origin,profile_id,crm_session_id,envelope) values($1,$2,$3,'staff','60000000-0000-4000-8000-000000000001','encrypted-fixture-only')",[hash,challenge,target]);
 const consume=async(c=challenge,t=target)=>(await db.query('select reloo_management_sso_consume($1,$2,$3) envelope',[hash,c,t])).rows[0].envelope;
 await issue();assert.equal(await consume('x'.repeat(43)),null);assert.equal(await consume(challenge,'https://evil.invalid'),null);assert.equal(await consume(),'encrypted-fixture-only');assert.equal(await consume(),null);
 await issue();await db.exec("update management_sso_tickets set expires_at=now()-interval '1 second'");assert.equal(await consume(),null);await db.exec('select reloo_management_sso_purge()');assert.equal((await db.query('select count(*)::int n from management_sso_tickets')).rows[0].n,0);
 await issue();await db.exec('update crm_mfa_sessions set revoked_at=now()');assert.equal(await consume(),null);await db.exec('update crm_mfa_sessions set revoked_at=null');
 await issue();await db.exec('update crm_staff set enabled=false');assert.equal(await consume(),null);
 assert.equal((await db.query("select count(*)::int n from information_schema.routine_privileges where routine_name like 'reloo_management_sso%' and grantee in ('PUBLIC','anon','authenticated')")).rows[0].n,0);
 }finally{await db.close()}
});
