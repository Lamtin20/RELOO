import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validDailyLimits} from '../lib/news-autopilot/limits.js';
test('daily limits enforce integer database bounds',()=>{
 for(const pair of [[1,10000],[40,5000000],[20,50000]])assert.equal(validDailyLimits(...pair),true);
 for(const pair of [[0,50000],[41,50000],[1.5,50000],[20,9999],[20,5000001],[20,50000.5],['20',50000],[20,null]])assert.equal(validDailyLimits(...pair),false);
});
const bundle=await build({entryPoints:['app/api/crm/news-automation/route.js'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,alias:{'@':process.cwd()},plugins:[{name:'permissions',setup(b){b.onResolve({filter:/operations\/permissions$/},()=>({path:'permissions',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`import {HttpError} from ${JSON.stringify(resolve('lib/server/http.js').replaceAll('\\','/'))};export async function requirePermission(){const c=globalThis.__limitsTest;if(!c.allowed)throw new HttpError(403,'Denied');return {db:c.db,profile:{id:'editor'}};}`,resolveDir:process.cwd()}));}}]});
await mkdir('output/test-cache',{recursive:true});const file=resolve('output/test-cache/limits-'+process.pid+'.mjs');await writeFile(file,bundle.outputFiles[0].text);const {POST}=await import(pathToFileURL(file).href);await unlink(file);
function context(){const c={allowed:true,writes:[],audits:[],row:{id:true,enabled:true,paid_api_enabled:true,daily_target:40,daily_budget_vnd:50000}};c.db={from(table){let patch;const q={update(p){patch=p;return q;},eq(){return q;},select(){return q;},async single(){c.writes.push(patch);Object.assign(c.row,patch);return {data:c.row,error:null};},async insert(v){c.audits.push(v);return {error:null};}};return q;}};globalThis.__limitsTest=c;return c;}
function request(body,origin='https://crm.reloo.vn'){return new Request('https://crm.reloo.vn/api/crm/news-automation',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action:'SET_LIMITS',daily_target:20,daily_budget_vnd:60000,...body})});}
test('save limits requires permission and origin; preserves running and paid settings',async()=>{
 let c=context();c.allowed=false;assert.equal((await POST(request())).status,403);assert.equal(c.writes.length,0);
 c=context();assert.equal((await POST(request({},'https://evil.invalid'))).status,403);assert.equal(c.writes.length,0);
 for(const body of [{daily_target:41},{daily_budget_vnd:-1},{daily_budget_vnd:'60000'}]){c=context();assert.equal((await POST(request(body))).status,400);assert.equal(c.writes.length,0);}
 c=context();assert.equal((await POST(request())).status,200);assert.equal(c.row.daily_target,20);assert.equal(c.row.daily_budget_vnd,60000);assert.equal(c.row.enabled,true);assert.equal(c.row.paid_api_enabled,true);assert.equal(c.audits[0].action,'NEWS_AUTOPILOT_LIMITS_CHANGED');
 delete globalThis.__limitsTest;
});
