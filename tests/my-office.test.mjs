import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {officeAgents,officeStatus,filterOfficeJobs,OFFICE_RENDER_LIMIT} from '../lib/agent-office/presentation.js';
import {officePathAllowed} from '../lib/agent-office/host.js';

test('office selects one actual job per agent, preferring running work over newer history',()=>{
 const jobs=[{id:'old',agentId:'a',status:'in_progress',createdAt:'2026-01-01'},
  {id:'new',agentId:'a',status:'completed',createdAt:'2026-02-01'},
  {id:'b1',agentId:'b',status:'failed',createdAt:'2026-01-01'},
  {id:'b2',agentId:'b',status:'waiting_for_input',createdAt:'2026-02-01'},
  {id:'no-agent',status:'running'}];
 assert.deepEqual(officeAgents(jobs).map(j=>j.id),['old','b2']);
 assert.equal(officeAgents([]).length,0);
 assert.equal(officeAgents(Array.from({length:100},(_,i)=>({agentId:String(i)}))).length,80);
 assert.equal(OFFICE_RENDER_LIMIT,12);
});
test('office filters combine project, normalized state and text without inventing states',()=>{
 const jobs=[{title:'Kiểm tra đơn',agent:'QA',project:'RELOO',status:'in_progress'},
  {title:'Build',agent:'Dev',project:'Other',status:'completed'}];
 assert.deepEqual(filterOfficeJobs(jobs,{project:'RELOO',status:'running',query:' qa '}),[jobs[0]]);
 assert.equal(filterOfficeJobs(jobs,{project:'Other',status:'running'}).length,0);
 assert.equal(officeStatus('imagined'), 'unknown');
 assert.equal(officeStatus('succeeded'),'done');
});
test('vendored My Office rig and distributed MIT notice match pinned provenance',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../tools/my-office-toolchain.json',import.meta.url),'utf8'));
 assert.equal(manifest.commit,'1df03ee00ff94fdb7d8f81fe1f55c39bd671e6f3');
 for(const file of manifest.files){
  const bytes=await readFile(new URL('../'+file.local,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.adaptedSha256);
 }
 const license=await readFile(new URL('../lib/vendor/my-office/LICENSE',import.meta.url),'utf8');
 assert.match(license,/MIT License/);assert.match(license,/khanh020905/);
 assert.equal(await readFile(new URL('../public/licenses/my-office-MIT.txt',import.meta.url),'utf8'),license);
 assert.equal(officePathAllowed('/licenses/my-office-MIT.txt'),true);
 assert.equal(officePathAllowed('/licenses/private.txt'),false);
});
