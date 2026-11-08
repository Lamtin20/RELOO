import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staysGet,staysPost,stayTestRequest} from '../lib/stays/server.js';
test('API fails closed outside explicit local development; rejects foreign origin and oversized bodies',async()=>{
 const previous={NODE_ENV:process.env.NODE_ENV,RELOO_STAYS_TEST_MODE:process.env.RELOO_STAYS_TEST_MODE};
 try{
  process.env.NODE_ENV='production';process.env.RELOO_STAYS_TEST_MODE='1';
  const request=(origin,body='{"op":"pay-test","input":{}}')=>new Request('http://127.0.0.1:4522/api/stays',{method:'POST',headers:{origin,'Content-Type':'application/json'},body});
  assert.equal(stayTestRequest(request('http://127.0.0.1:4522')),false);
  assert.equal((await staysPost(request('http://127.0.0.1:4522'))).status,503);
  assert.equal((await staysPost(request('https://untrusted.example'))).status,403);
  assert.equal((await staysPost(request('http://127.0.0.1:4522','x'.repeat(64100)))).status,413);
  assert.equal((await staysPost(request('http://127.0.0.1:4522','{'))).status,400);
  const catalog=await (await staysGet(new Request('http://127.0.0.1:4522/api/stays'))).json();
  assert.equal(catalog.testMode,false);assert.equal(catalog.enabled,false);assert.equal(catalog.demo,true);
  process.env.NODE_ENV='development';assert.equal(stayTestRequest(new Request('https://reloo.vn/api/stays')),false);
 }finally{for(const[k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
