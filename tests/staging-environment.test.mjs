import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stagingProblems,stagingAccess,assertStagingEnvironment} from '../lib/runtime/staging.js';
const reviewTime={now:Date.parse('2026-10-24T00:00:00Z')};
const env={RELOO_ENVIRONMENT:'staging',APP_ORIGIN:'https://staging.reloo.vn',CRM_ORIGIN:'https://staging.reloo.vn',NEXT_PUBLIC_SUPABASE_URL:'https://staging-auth.reloo.vn',SUPABASE_INTERNAL_URL:'http://staging-gateway:8000',STAGING_RESOURCE_ID:'reloo-staging-synthetic',SUPABASE_SERVICE_ROLE_KEY:'s'.repeat(40),NEXT_PUBLIC_SUPABASE_ANON_KEY:'a'.repeat(40),RELOO_PRIVATE_DATA_KEY:'p'.repeat(40),RELOO_STAGING_ACCESS_USER:'synthetic',RELOO_STAGING_ACCESS_PASSWORD:'x'.repeat(32),RELOO_STAGING_OUTBOUND_MODE:'blocked',RELOO_MEDIA_DIR:'/srv/reloo-staging/media',RELOO_EVIDENCE_DIR:'/srv/reloo-staging/evidence',RELOO_STAGING_PAYMENT_MODE:'disabled'};
test('staging rejects production resources, shared cookies, live provider credentials and actor simulators',()=>{
 assert.deepEqual(stagingProblems(env,reviewTime),[]);assert.doesNotThrow(()=>assertStagingEnvironment(env,reviewTime));
 for(const patch of [{APP_ORIGIN:'https://reloo.vn'},{CRM_ORIGIN:'https://crm.reloo.vn'},{NEXT_PUBLIC_SUPABASE_URL:'https://auth.reloo.vn'},{SUPABASE_INTERNAL_URL:'http://production:8000'},{RELOO_COOKIE_DOMAIN:'.reloo.vn'},{SEPAY_API_TOKEN:'live'},{RELOO_STAYS_TEST_MODE:'1'},{RELOO_STAGING_PAYMENT_MODE:'live'},{RELOO_MEDIA_DIR:'/srv/reloo/media'},{SUPABASE_SERVICE_ROLE_KEY:'REPLACE'}])assert.throws(()=>assertStagingEnvironment({...env,...patch},reviewTime),/STAGING_PREFLIGHT_FAILED/);
});
test('staging dynamic gate fails closed without config; constant-time checked credentials and noindex',()=>{
 const req=new Request('https://staging.reloo.vn/');assert.equal(stagingAccess(req,{}).status,503);
 assert.equal(stagingAccess(new Request('http://127.0.0.1:4522/',{headers:{host:'staging.reloo.vn'}}),{}).status,503);
 assert.equal(stagingAccess(req,env,reviewTime).status,401);
 assert.equal(stagingAccess(req,env,reviewTime).headers['WWW-Authenticate'],undefined);
 assert.equal(stagingAccess(req,env,{...reviewTime,authenticated:true}).status,200);
 assert.equal(stagingAccess(new Request('https://staging.reloo.vn/uat/login'),env,reviewTime).status,200);
 assert.equal(stagingAccess(new Request('https://staging.reloo.vn/api/auth/register'),env,reviewTime).status,401);
 const good=new Request(req,{headers:{authorization:'Basic '+Buffer.from(env.RELOO_STAGING_ACCESS_USER+':'+env.RELOO_STAGING_ACCESS_PASSWORD).toString('base64')}});
 const result=stagingAccess(good,env,reviewTime);assert.equal(result.status,200);assert.match(result.headers['X-Robots-Tag'],/noindex/);
 assert.equal(stagingAccess(new Request('https://reloo.vn/'),{}),null);
 assert.equal(stagingAccess(new Request('http://127.0.0.1:3000/'),{}),null);
});
test('expired and malformed review windows stay blocked independently of fixture time',()=>{
 assert.ok(stagingProblems(env,{now:Date.parse('2026-11-07T00:00:00Z')}).includes('STAGING_REVIEW_WINDOW_EXPIRED'));
 assert.ok(stagingProblems({...env,RELOO_STAGING_EXPIRES_AT:'invalid'},reviewTime).includes('STAGING_REVIEW_WINDOW_EXPIRED'));
});

