import test from 'node:test';
import assert from 'node:assert/strict';
import{vibiRequest,vibiJson}from'../lib/news-autopilot/vibi.js';
test('verified Vibi paths only and no retry after transport failure',async()=>{
 let calls=0;const config={VIBI_BASE_URL:'https://vibi.top/v1',VIBI_API_KEY:'test'};
 await assert.rejects(vibiRequest(config,'/guessed',{}),/NOT_VERIFIED/);
 await assert.rejects(vibiRequest(config,'/chat/completions',{}, {fetcher:async()=>{calls++;throw Error('secret response')}}),/OUTCOME_UNKNOWN_NO_RETRY/);
 assert.equal(calls,1);
});
test('provider errors expose status codes without leaking response bodies or secrets',async()=>{
 for(const status of [401,403,429,500]){let calls=0;await assert.rejects(vibiRequest({VIBI_BASE_URL:'https://vibi.top/v1',VIBI_API_KEY:'secret'},'/chat/completions',{}, {fetcher:async()=>{calls++;return{ok:false,status}}}),e=>!e.message.includes('secret'));assert.equal(calls,1);}
});
test('text models must be separately verified before inference',async()=>{
 await assert.rejects(vibiJson({VIBI_TEXT_MODEL:'gpt-image-2'},[],{}),/TEXT_MODEL_NOT_VERIFIED/);
});
