import test from 'node:test';
import assert from 'node:assert/strict';
import {readControlCenter,summarizeControlSource,CONTROL_SOURCES} from '../lib/operations/control-center.js';
import {crmViews,effectiveCrmPermissions} from '../lib/operations/access.js';
import {controlText} from '../lib/operations/control-content.js';
const now=Date.parse('2026-10-17T01:00:00Z');
function storage(result){const calls=[];return {calls,from(table){calls.push(table);const q={select(){return q;},limit(n){assert.equal(n,300);return q;},gte(){return q;},order(){return q;},abortSignal(){return q;},then(resolve,reject){return Promise.resolve(typeof result==='function'?result(table):result).then(resolve,reject);}};return q;}};}
test('control permission alone cannot expose source data',async()=>{const db=storage({data:[]});const r=await readControlCenter(db,{permissions:['control.read']},{now});assert.deepEqual(r.nodes,[]);assert.equal(db.calls.length,0);});
test('only permitted sources and links are projected',async()=>{const db=storage({data:[{status:'RUNNING',payload:'SECRET',email:'PRIVATE'}]});const r=await readControlCenter(db,{permissions:['jobs.read']},{now});assert.deepEqual(db.calls.slice().sort(),['automation_jobs','operations_heartbeats'].sort());assert.equal(r.nodes[0].metrics.running,1);assert.deepEqual(r.links,[]);assert(!JSON.stringify(r).includes('SECRET'));assert(!JSON.stringify(r).includes('PRIVATE'));});
test('one broken source does not hide other services or raw errors',async()=>{const db=storage(table=>table==='api_traces'?{error:{message:'password'}}:{data:[]});const r=await readControlCenter(db,{permissions:['*']},{now});assert.equal(r.nodes.length,6);assert.equal(r.nodes[0].status,'unavailable');assert.equal(r.nodes[1].status,'empty');assert(!JSON.stringify(r).includes('password'));});
test('timeouts are bounded and isolated',async()=>{const db=storage(new Promise(()=>{}));const r=await readControlCenter(db,{permissions:['jobs.read']},{now,timeoutMs:10});assert.equal(r.nodes[0].status,'unavailable');});
test('API P95 and failures are calculated from observed rows',()=>{const s=summarizeControlSource(CONTROL_SOURCES[0],[{status:200,duration_ms:10,created_at:new Date(now-1000).toISOString()},{status:503,duration_ms:80,created_at:new Date(now+1000).toISOString()}],now);assert.equal(s.failed,1);assert.equal(s.p95,80);assert.equal(s.lastActivity,new Date(now-1000).toISOString());});
test('read-only permission is grantable and controls navigation',()=>{const staff={enabled:true,role:'staff',permissions:['crm.read','control.read']};assert(crmViews(staff).includes('control'));assert(!effectiveCrmPermissions({...staff,permissions:['control.write']}).includes('control.write'));});
test('both languages cover all registry nodes and labels',()=>{const vi=controlText(),en=controlText('en-US');assert.deepEqual(Object.keys(vi).sort(),Object.keys(en).sort());for(const n of CONTROL_SOURCES){assert(vi[n.id]);assert(en[n.id+'Desc']);}});
test('sample cap is explicit and events expose only status/time',async()=>{
 const db=storage({data:Array.from({length:300},()=>({status:'RUNNING',started_at:new Date(now).toISOString(),payload:{secret:'DO_NOT_EXPOSE'},error_code:'PRIVATE'}))});
 const r=await readControlCenter(db,{permissions:['content.read']},{now});assert.equal(r.nodes[0].capped,true);assert.equal(r.nodes[0].events.length,5);assert.deepEqual(Object.keys(r.nodes[0].events[0]).sort(),['at','status']);assert(!JSON.stringify(r).includes('DO_NOT_EXPOSE'));assert(!JSON.stringify(r).includes('PRIVATE'));
});
test('configuration readiness is separate from provider connectivity',async()=>{
 const settings={enabled:false,provider:'VIBI',paid_api_enabled:false,daily_api_call_limit:0,daily_budget_vnd:50000,metered_budget_enabled:false,VIBI_API_KEY:'NEVER_RETURN'};
 const db={from(table){const q={select(){return q;},eq(){return q;},maybeSingle(){return q;},limit(){return q;},gte(){return q;},order(){return q;},then(resolve){return Promise.resolve({data:table==='news_autopilot_settings'?settings:[],error:null}).then(resolve);}};return q;}};
 const r=await readControlCenter(db,{permissions:['content.read']},{now});assert.equal(r.ai.enabled,false);assert.equal(r.ai.ready,false);assert.equal(r.ai.provider,'VIBI');assert(!JSON.stringify(r).includes('NEVER_RETURN'));assert(!Object.hasOwn(r.ai,'connected'));
});
