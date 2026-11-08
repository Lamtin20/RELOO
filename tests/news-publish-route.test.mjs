import test from'node:test';import assert from'node:assert/strict';import{build}from'esbuild';import{resolve}from'node:path';
import{mkdir,writeFile,unlink}from'node:fs/promises';import{pathToFileURL}from'node:url';
const bundle=await build({entryPoints:['app/api/crm/news/route.js'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,alias:{'@':process.cwd()},plugins:[{name:'isolated-news-permissions',setup(b){b.onResolve({filter:/operations\/permissions$/},()=>({path:'news-permissions-test',namespace:'news-test'}));b.onLoad({filter:/.*/,namespace:'news-test'},()=>({contents:`import{HttpError}from ${JSON.stringify(resolve('lib/server/http.js').replaceAll('\\','/'))};export async function requirePermission(){const c=globalThis.__newsPublishTest;if(!c.allowed)throw new HttpError(403,'Permission denied');return{db:c.db,profile:{id:'test-profile'}};}`,resolveDir:process.cwd()}));}}]});
await mkdir('output/test-cache',{recursive:true});const path=resolve('output/test-cache/news-route-'+process.pid+'.mjs');await writeFile(path,bundle.outputFiles[0].text);const{POST}=await import(pathToFileURL(path).href);await unlink(path);
const id='11111111-1111-4111-8111-111111111111';
function context(overrides={}){
 const c={allowed:true,writes:0,queries:0,audits:[],mime:'image/webp',row:{id,version:1,status:'DRAFT',title:'Bài hướng dẫn thuê máy ảnh',slug:'huong-dan-thue',excerpt:'Kiểm tra thiết bị và điều kiện trước khi thuê.',body:'## Kiểm tra thiết bị\nNội dung hướng dẫn.',cover_id:'22222222-2222-4222-8222-222222222222',cover_alt:'Ảnh minh họa',tags:[],...overrides}};
 c.db={from(table){c.queries++;let updates=null,conditions=[];const q={select(){return q;},eq(k,v){conditions.push([k,v]);return q;},in(k,v){conditions.push([k,v]);return q;},update(v){updates=v;return q;},insert(v){c.audits.push(v);return Promise.resolve({error:null});},async maybeSingle(){if(table==='media_assets')return{data:{id:c.row.cover_id,mime:c.mime},error:null};const match=conditions.every(([k,v])=>Array.isArray(v)?v.includes(c.row[k]):c.row[k]===v);if(!match)return{data:null,error:null};if(updates){c.row={...c.row,...updates};c.writes++;return{data:{id},error:null};}return{data:{...c.row},error:null};}};return q;}};globalThis.__newsPublishTest=c;return c;
}
const request=(body={},origin='https://crm.reloo.vn')=>new Request('https://crm.reloo.vn/api/crm/news',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify({action:'PUBLISH_NOW',id,version:1,...body})});
test('publish route enforces access/origin, validates saved content and cannot double-publish',async()=>{
 let c=context();c.allowed=false;assert.equal((await POST(request())).status,403);assert.equal(c.queries,0);
 c=context();assert.equal((await POST(request({},'https://evil.invalid'))).status,403);assert.equal(c.queries,0);
 for(const row of[{version:2},{status:'ARCHIVED'},{status:'PUBLISHED'}]){c=context(row);assert.equal((await POST(request())).status,409);assert.equal(c.writes,0);}
 for(const row of[{body:''},{excerpt:''},{cover_id:null}]){c=context(row);assert.equal((await POST(request())).status,400);assert.equal(c.writes,0);}
 c=context();c.mime='image/png';assert.equal((await POST(request())).status,400);assert.equal(c.writes,0);
 c=context({status:'SCHEDULED',publish_at:'2099-01-01T00:00:00Z'});assert.equal((await POST(request())).status,200);assert.equal(c.row.status,'PUBLISHED');assert.equal(c.row.version,2);assert.ok(Date.parse(c.row.publish_at)<Date.parse('2099-01-01'));assert.equal(c.audits[0].action,'NEWS_PUBLISHED_NOW');
 assert.equal((await POST(request())).status,409);assert.equal(c.writes,1);
 delete globalThis.__newsPublishTest;
});
