import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {FEDERATION_ISSUER,FEDERATION_CLIENTS,federationNext,federationAuthorizePath,federationClientConfigured,federationConfigurationProblems,validFederationAssertion} from '../lib/auth/federation-policy.js';
import {brokerRequest,federationProof} from '../lib/auth/federation-identity.js';
import {crmNext} from '../lib/operations/access.js';
test('central login return paths and audiences reject external, encoded and duplicate redirects',()=>{
 const origin=FEDERATION_CLIENTS.staging;
 assert.equal(federationNext('/crm?view=staff',origin),'/crm?view=staff');
 for(const value of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/%5cevil.invalid','/%2f%2fevil.invalid','/api/auth/logout','/%61pi/auth/logout','/uat/login','/%00bad'])assert.equal(federationNext(value,origin),'/');
 const path='/api/auth/federation/authorize?'+new URLSearchParams({state:'a'.repeat(43),challenge:'b'.repeat(43),client:'agent'});
 assert.equal(federationAuthorizePath(path),path);assert.equal(crmNext(path),path);
 for(const invalid of [path+'&client=chat',path+'&redirect=https://evil.invalid',path+'#x',path.replace('client=agent','client=__proto__'),'https://evil.invalid'+path])assert.equal(federationAuthorizePath(invalid),null);
});
test('federation requires a dedicated per-host secret and pinned first-party issuer',()=>{
 const env={RELOO_IDENTITY_MODE:'federated-client',RELOO_IDENTITY_ISSUER:FEDERATION_ISSUER,RELOO_IDENTITY_TRANSPORT:'private-bridge',RELOO_IDENTITY_STAGING_SECRET:'a'.repeat(64)};
 assert.equal(federationClientConfigured(FEDERATION_CLIENTS.staging,env),true);assert.equal(federationClientConfigured(FEDERATION_CLIENTS.chat,env),false);
 assert.equal(federationClientConfigured('https://evil.invalid',env),false);assert.equal(federationClientConfigured(FEDERATION_CLIENTS.staging,{...env,RELOO_IDENTITY_ISSUER:'https://evil.invalid'}),false);
 assert.deepEqual(federationConfigurationProblems({...env,RELOO_CHAT_CONTROL_HOST:'chat.reloo.vn'}),['IDENTITY_CHAT_SECRET_REQUIRED']);
 assert.ok(federationConfigurationProblems({...env,RELOO_IDENTITY_MODE:'broker'}).includes('STAGING_IDENTITY_MODE_INVALID'));
});
test('claims cannot grant roles, omit MFA, change subject, extend expiry or forge a verified identity object',()=>{
 const now=1000000,subject='60000000-0000-4000-8000-000000000001',claim={issuer:FEDERATION_ISSUER,client:'agent',subject,mfa:true,receipt:'60000000-0000-4000-8000-000000000002',expiresAt:now+60000};
 assert.equal(validFederationAssertion(claim,{client:'agent',subject,now}),true);
 for(const change of [{issuer:'https://evil.invalid'},{client:'chat'},{subject:'-'.repeat(36)},{mfa:false},{mfa:'true'},{expiresAt:now},{expiresAt:now+9*3600000},{receipt:'not-a-receipt'}])assert.equal(validFederationAssertion({...claim,...change},{client:'agent',subject,now}),false);
 assert.equal(federationProof({id:subject,mfa:true,federation:claim}),null);
});
test('backchannel only calls fixed first-party endpoints and never forwards browser cookies or credentials in URLs',async()=>{
 const previous=globalThis.fetch,calls=[],env={RELOO_IDENTITY_MODE:'federated-client',RELOO_IDENTITY_ISSUER:FEDERATION_ISSUER,RELOO_IDENTITY_AGENT_SECRET:'a'.repeat(64)};
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({ok:true});};
 try{
  await brokerRequest('introspect',{reference:'a'.repeat(43)},FEDERATION_CLIENTS.agent,env);
  assert.equal(calls[0].url,FEDERATION_ISSUER+'/api/auth/federation/introspect');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.headers.Cookie,undefined);assert.equal(JSON.parse(calls[0].options.body).client,'agent');
  await assert.rejects(brokerRequest('https://evil.invalid',{},FEDERATION_CLIENTS.agent,env));await assert.rejects(brokerRequest('introspect',{},'https://evil.invalid',env));assert.equal(calls.length,1);
  globalThis.fetch=async()=>new Response(new Uint8Array(16001));await assert.rejects(brokerRequest('introspect',{},FEDERATION_CLIENTS.agent,env));
  globalThis.fetch=async()=>{throw Error('network unavailable')};await assert.rejects(brokerRequest('introspect',{},FEDERATION_CLIENTS.agent,env),e=>e.status===503);
  globalThis.fetch=async()=>new Response('',{status:429});await assert.rejects(brokerRequest('introspect',{},FEDERATION_CLIENTS.agent,env),e=>e.status===503);
 }finally{globalThis.fetch=previous;}
});
test('real central SQL enforces proof-key/client/replay/expiry/MFA and never provisions accounts or public privileges',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role;create table profiles(id text primary key,deleted_at timestamptz);create table crm_staff(profile_id text,role text,permissions text[],enabled boolean);create table crm_mfa_sessions(id uuid primary key,profile_id text,expires_at timestamptz,revoked_at timestamptz);insert into profiles(id) values('central');insert into crm_staff values('central','admin',ARRAY['*'],true);insert into crm_mfa_sessions values('60000000-0000-4000-8000-000000000001','central',now()+interval '1 hour',null);");
 await db.exec(await readFile('supabase/migrations/20261024180000_central_identity.sql','utf8'));
 const hash='a'.repeat(64),challenge='b'.repeat(43),issue=()=>db.query("insert into federation_codes(secret_hash,challenge,client,profile_id,crm_session_id,envelope) values($1,$2,'agent','central','60000000-0000-4000-8000-000000000001','encrypted-test-only')",[hash,challenge]);
 const consume=async(c=challenge,client='agent')=>(await db.query('select reloo_federation_consume($1,$2,$3) result',[hash,c,client])).rows[0].result;
 await issue();assert.equal(await consume('x'.repeat(43)),null);assert.equal(await consume(challenge,'chat'),null);assert.equal(await consume(),'encrypted-test-only');assert.equal(await consume(),null);
 await issue();await db.exec("update federation_codes set expires_at=now()-interval '1 second'");assert.equal(await consume(),null);await db.exec('select reloo_federation_purge()');
 await issue();await db.exec('update crm_mfa_sessions set revoked_at=now()');assert.equal(await consume(),null);await db.exec('update crm_mfa_sessions set revoked_at=null');
 await issue();await db.exec('update crm_staff set enabled=false');assert.equal(await consume(),null);
 assert.equal((await db.query('select count(*)::int n from federation_identities')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,1);
 await db.exec("insert into federation_identities(issuer,issuer_subject,profile_id,reason) values('https://crm.reloo.vn','60000000-0000-4000-8000-000000000002','central','Explicit mapping for a controlled test')");assert.equal((await db.query('select enabled from federation_identities')).rows[0].enabled,false);
 await assert.rejects(db.exec('update federation_identities set enabled=true'));
 await db.exec("update federation_identities set enabled=true,reviewed_by='central';insert into federation_local_sessions(secret_hash,client,issuer_subject,profile_id,upstream_reference,expires_at) values(repeat('d',64),'agent','60000000-0000-4000-8000-000000000002','central','encrypted-test-reference',now()+interval '1 hour');update profiles set deleted_at=now();select reloo_federation_purge();");
 assert.equal((await db.query('select count(*)::int n from federation_identities')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from federation_local_sessions')).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from information_schema.routine_privileges where routine_name like 'reloo_federation_%' and grantee in ('PUBLIC','anon','authenticated')")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from information_schema.table_privileges where table_name like 'federation_%' and grantee in ('PUBLIC','anon','authenticated')")).rows[0].n,0);
 }finally{await db.close();}
});
