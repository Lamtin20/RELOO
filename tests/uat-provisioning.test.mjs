import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {createUatConfig} from '../scripts/uat-config.mjs';
import {stagingProblems} from '../lib/runtime/staging.js';
test('UAT configuration creates isolated random credentials and correctly signed distinct JWT roles',()=>{
 const now=Date.parse('2026-10-24T00:00:00Z');const a=createUatConfig({now:now/1000}),b=createUatConfig({now:now/1000});assert.deepEqual(stagingProblems(a,{now}),[]);assert.notEqual(a.JWT_SECRET,b.JWT_SECRET);assert.notEqual(a.POSTGRES_PASSWORD,a.RELOO_PRIVATE_DATA_KEY);
 for(const [key,role] of [['NEXT_PUBLIC_SUPABASE_ANON_KEY','anon'],['SUPABASE_SERVICE_ROLE_KEY','service_role']]){const [h,p,s]=a[key].split('.');assert.equal(JSON.parse(Buffer.from(p,'base64url')).role,role);assert.equal(s,createHmac('sha256',a.JWT_SECRET).update(h+'.'+p).digest('base64url'))}
 assert.equal(a.RELOO_STAGING_PAYMENT_MODE,'disabled');assert.equal(a.RELOO_STAGING_OUTBOUND_MODE,'blocked');assert.ok(!Object.keys(a).some(k=>/^SEPAY_|GOOGLE_CLIENT|SMTP_/.test(k)));
});
test('UAT backend and edge retain network/port/data boundaries and separate Basic from auth Bearer',async()=>{
 const backend=await readFile('deploy/staging/backend.yml','utf8'),edge=await readFile('deploy/staging/edge.conf','utf8'),app=await readFile('deploy/staging/compose.yml','utf8');
 assert.match(backend,/internal: true/);assert.ok(!backend.includes('/srv/reloo/data'));assert.ok(!backend.includes('reloo_frontend'));assert.ok(!backend.includes('5432:5432'));assert.match(backend,/GOTRUE_SMTP_HOST: mail/);assert.match(backend,/GOTRUE_EXTERNAL_GOOGLE_ENABLED: 'false'/);assert.match(app,/read_only: true/);assert.ok(!edge.includes('auth_basic_user_file'));assert.match(edge,/location \/ \{ return 403; \}/);
});

