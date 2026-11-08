import test from 'node:test';
import assert from 'node:assert/strict';
import {officeEndpoint,officeSnapshot,readOffice} from '../lib/agent-office/adapter.js';
import {officePathAllowed} from '../lib/agent-office/host.js';
import {managementOrigins,ssoAuthorizePath,ssoToken} from '../lib/auth/management-sso.js';
test('agent host restricts routes and SSO targets cannot become arbitrary redirects',()=>{
 for(const path of ['/api/crm/agent-office','/agent-office/login','/api/auth/sso/start'])assert.equal(officePathAllowed(path),true);
 for(const path of ['/crm','/api/crm/decisions','/api/crm/ai/brain','/api/payments'])assert.equal(officePathAllowed(path),false);
 const env={RELOO_ENVIRONMENT:'staging',RELOO_CHAT_CONTROL_HOST:'chat.reloo.vn',RELOO_AGENT_OFFICE_HOST:'agent.reloo.vn',CRM_ORIGIN:'https://staging.reloo.vn',APP_ORIGIN:'https://staging.reloo.vn'};
 assert.equal(managementOrigins(env,'agent').target,'https://agent.reloo.vn');assert.throws(()=>managementOrigins(env,'evil'));
 const production={...env,RELOO_ENVIRONMENT:'production',RELOO_MANAGEMENT_SSO:'production',APP_ORIGIN:'https://reloo.vn',CRM_ORIGIN:'https://crm.reloo.vn'};
 assert.deepEqual(managementOrigins(production,'agent'),{central:'https://crm.reloo.vn',target:'https://agent.reloo.vn'});
 const path='/api/auth/sso/authorize?'+new URLSearchParams({state:ssoToken(),challenge:ssoToken(),target:'agent'});
 assert.equal(ssoAuthorizePath(path),path);assert.equal(ssoAuthorizePath(path+'&target=agent'),null);assert.equal(ssoAuthorizePath(path.replace('target=agent','target=https://evil.invalid')),null);
});
test('office adapter never fetches arbitrary model-controlled or public addresses',async()=>{
 for(const url of ['http://127.0.0.1:8787','http://169.254.169.254','https://evil.invalid','http://reloo-agent-office:8787@evil.invalid']){
  assert.equal(officeEndpoint({RELOO_AGENT_OFFICE_URL:url}),null);
  assert.equal((await readOffice({RELOO_AGENT_OFFICE_URL:url},()=>{throw Error('must not fetch')})).connected,false);
 }
});
test('snapshot exposes bounded operational metadata, never prompts, outputs or credentials',()=>{
 const result=officeSnapshot({projects:[{id:'p',name:'RELOO',path:'/secret',token:'private'}],providers:[{id:'p1',name:'Local',api_key_hint:'private',base_url:'http://private.internal',status:'ok',preset:'ollama',enabled:true}],jobs:[{id:'j',agent_id:'a',agent_name:'QA',project_name:'RELOO',status:'failed',payload:'private prompt',output:'private response',error:'secret',title:'A'.repeat(1000)}]},0);
 assert.equal(result.observedAt,'1970-01-01T00:00:00.000Z');assert.equal(result.jobs[0].title.length,140);
 for(const key of ['payload','output','error','token','path','api_key_hint','base_url'])assert.equal(JSON.stringify(result).includes('"'+key+'"'),false);
 assert.equal(result.jobs[0].status,'failed');
});
test('private upstream cookie remains server-only; failed authentication never fabricates jobs',async()=>{
 const env={RELOO_AGENT_OFFICE_URL:'http://reloo-agent-office:8787',RELOO_AGENT_OFFICE_EMAIL:'reader@example.invalid',RELOO_AGENT_OFFICE_PASSWORD:'synthetic-fixture-not-a-credential'},calls=[];
 const result=await readOffice(env,async(url,options)=>{calls.push({url,options});if(url.endsWith('/api/auth/login'))return new Response('{}',{headers:{'set-cookie':'office_session='+'x'.repeat(43)+'; HttpOnly; Path=/'}});return new Response(JSON.stringify(url.endsWith('/api/projects')?{projects:[]}:url.endsWith('/api/providers')?{providers:[]}:{jobs:[]}));});
 assert.equal(result.connected,true);assert.equal(calls.length,4);assert.ok(calls.every(c=>c.options.redirect==='error'&&c.options.cache==='no-store'));
 assert.equal(calls[1].options.headers.Cookie,'office_session='+'x'.repeat(43));assert.equal(JSON.stringify(result).includes(env.RELOO_AGENT_OFFICE_PASSWORD),false);
 const failed=await readOffice(env,async()=>new Response('',{status:401}));assert.equal(failed.connected,false);assert.deepEqual(failed.jobs,[]);
});
test('expired REST session is renewed once; oversized responses fail closed',async()=>{
 const env={RELOO_AGENT_OFFICE_URL:'http://reloo-agent-office:8787',RELOO_AGENT_OFFICE_EMAIL:'expired-reader@example.invalid',RELOO_AGENT_OFFICE_PASSWORD:'synthetic-fixture-not-a-credential'};
 let logins=0,gets=0;
 const result=await readOffice(env,async url=>{if(url.endsWith('/api/auth/login')){logins++;return new Response('{}',{headers:{'set-cookie':'office_session='+'y'.repeat(43)+'; HttpOnly'}});}if(++gets===1)return new Response('',{status:401});return new Response(JSON.stringify(url.endsWith('/api/projects')?{projects:[]}:url.endsWith('/api/providers')?{providers:[]}:{jobs:[]}));});
 assert.equal(result.connected,true);assert.equal(logins,2);
 const tooLarge=await readOffice(env,async()=>new Response(new Uint8Array(1048577)));
 assert.equal(tooLarge.connected,false);assert.deepEqual(tooLarge.jobs,[]);
});
