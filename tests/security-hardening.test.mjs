import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {contentSecurityPolicy,SECURITY_HEADERS} from '../lib/security/web-policy.js';
import {authCookieOptions} from '../lib/auth/cookie-options.js';
import {socketCookieToken} from '../lib/auth/socket-cookie.js';
test('production cookie is server-readable only, secure and bounded',()=>{
 const options=authCookieOptions({NODE_ENV:'production',RELOO_COOKIE_DOMAIN:'.reloo.vn'});
 assert.equal(options.httpOnly,true);assert.equal(options.secure,true);assert.equal(options.sameSite,'lax');assert.equal(options.maxAge,365*86400);assert.equal(options.domain,undefined);
});
test('strict script CSP has nonce, rejects frames/plugins and keeps required device features',()=>{
 const csp=contentSecurityPolicy('unique-test-nonce');
 assert.ok(csp.includes("'nonce-unique-test-nonce' 'strict-dynamic'"));assert.ok(!csp.includes("'unsafe-eval'"));
 assert.ok(csp.includes("object-src 'none'")&&csp.includes("frame-ancestors 'none'"));
 assert.ok(SECURITY_HEADERS.some(h=>h.key==='Permissions-Policy'&&h.value.includes('camera=(self)')));
});
test('socket auth reads only bounded auth-token cookies; never trusts the token without upstream verification',()=>{
 const value='base64-'+Buffer.from(JSON.stringify({access_token:'signed.jwt.value'})).toString('base64url');
 assert.equal(socketCookieToken('other=ignored; sb-auth-auth-token='+value),'signed.jwt.value');
 assert.equal(socketCookieToken('sb-auth-auth-token.1='+value.slice(15)+'; sb-auth-auth-token.0='+value.slice(0,15)),'signed.jwt.value');
 assert.equal(socketCookieToken('sb-auth-auth-token-code-verifier='+value),null);
 assert.equal(socketCookieToken('sb-auth-auth-token=invalid'),null);
});
test('database lockdown removes table/column/RPC access while preserving backend and storage schemas',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema storage;
   create table public.profiles(role text,activation_status text,kyc_level text);create table public.assets(id text);create table public.security_audit(id text);
   create table storage.objects(id text);grant select on storage.objects to authenticated;
   create function public.reloo_create_inquiry(text,text,jsonb) returns text language sql security definer as $$select 'ok'::text$$;
   create function public.reloo_record_screening(text,text,jsonb,text) returns text language sql security definer as $$select 'ok'::text$$;
   grant all on all tables in schema public to anon,authenticated;grant update(role) on profiles to authenticated;
  `);
  await db.exec(await readFile('deploy/vietnam/security-lockdown.sql','utf8'));
  const check=(await db.query(`select has_column_privilege('authenticated','profiles','role','UPDATE') role_write,has_table_privilege('anon','security_audit','TRUNCATE') truncate,has_function_privilege('anon','reloo_create_inquiry(text,text,jsonb)','EXECUTE') rpc,has_table_privilege('service_role','assets','SELECT') backend,has_table_privilege('authenticated','storage.objects','SELECT') storage`)).rows[0];
  assert.deepEqual(check,{role_write:false,truncate:false,rpc:false,backend:true,storage:true});
  await db.exec(`create function public.future_admin_operation() returns void language sql as $$select$$;`);
  assert.equal((await db.query(`select has_function_privilege('anon','future_admin_operation()','EXECUTE') v`)).rows[0].v,false);
 }finally{await db.close();}
});
