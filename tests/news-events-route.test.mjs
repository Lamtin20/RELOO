import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdir,writeFile,unlink} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const b=await build({entryPoints:['app/api/news-events/route.js'],bundle:true,format:'esm',platform:'node',packages:'external',write:false,alias:{'@':process.cwd()},plugins:[{name:'backend',setup(b){b.onResolve({filter:/security\/service$/},()=>({path:'db',namespace:'mock'}));b.onResolve({filter:/operations\/crypto$/},()=>({path:'hash',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='db'?"export function securityDb(){return {rpc:async(name,payload)=>{globalThis.__newsEvents.push(payload);return {error:null}}}}":"export function privateHash(kind,value){return 'hmac-'+kind+'-test';}"}));}}]});
await mkdir('output/test-cache',{recursive:true});const p=resolve('output/test-cache/news-events-'+process.pid+'.mjs');await writeFile(p,b.outputFiles[0].text);const {POST}=await import(pathToFileURL(p).href);await unlink(p);
const id='11111111-1111-4111-8111-111111111111',cookie='reloo-cookie-consent='+encodeURIComponent(JSON.stringify({version:1,analytics:true,savedAt:Date.now()}));
function request(headers={},data={}){return new Request('https://reloo.vn/api/news-events',{method:'POST',headers:{origin:'https://reloo.vn',cookie,'Content-Type':'application/json',...headers},body:JSON.stringify({id,articleId:id,viewId:id,visitorId:id,sessionId:id,event:'VIEW',...data})});}
test('event API requires actual consent and origin, respects GPC, minimizes data and HMACs IDs',async()=>{
 globalThis.__newsEvents=[];
 assert.equal((await POST(request({cookie:''}))).status,403);assert.equal((await POST(request({origin:'https://evil.invalid'}))).status,403);assert.equal((await POST(request({'sec-gpc':'1'}))).status,204);assert.equal(globalThis.__newsEvents.length,0);
 assert.equal((await POST(request({}, {event:'KEYSTROKE'}))).status,400);
 assert.equal((await POST(request({}, {email:'private@example.test',fullUrl:'https://reloo.vn/?phone=12345678'}))).status,204);
 const captured=globalThis.__newsEvents[0];assert.equal(captured.p_data.visitorId,undefined);assert.equal(captured.p_data.email,undefined);assert.equal(captured.p_data.fullUrl,undefined);assert.notEqual(captured.p_visitor,id);delete globalThis.__newsEvents;
});
