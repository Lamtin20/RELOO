import {readFile,access} from 'node:fs/promises';
const rules=JSON.parse(await readFile(new URL('../lib/product/rules.json',import.meta.url),'utf8'));
const required=['id','version','status','scope','description','preconditions','input','result','exceptions','roles','source','verifiedAt','owner','tests'];
const seen=new Set(),errors=[];
const index=await readFile('docs/RELOO_BUSINESS_RULES.md','utf8');
const workflow=await readFile('.github/workflows/product-foundation.yml','utf8');
for(const r of rules){
 for(const k of required)if(r[k]===undefined||r[k]===''||Array.isArray(r[k])&&!r[k].length)errors.push(r.id+': missing '+k);
 if(seen.has(r.id))errors.push('duplicate '+r.id);seen.add(r.id);
 if(!['IMPLEMENTED','PARTIAL','PROPOSED','BLOCKED'].includes(r.status))errors.push('invalid status '+r.id);
 if(!/^\d+\.\d+\.\d+$/.test(r.version||'')||!/^\d{4}-\d{2}-\d{2}$/.test(r.verifiedAt||''))errors.push('invalid version/date '+r.id);
 if(!index.includes('| '+r.id+' |'))errors.push('missing rule index '+r.id);
 for(const path of r.tests||[]){if(!/^tests\/[a-z0-9.-]+\.mjs$/.test(path))errors.push('unsafe test path '+r.id);else try{await access(path);if(!workflow.includes(path))errors.push('rule test absent from mandatory CI '+path)}catch{errors.push('missing test '+path)}}
}
for(const name of ['PRODUCT_SPEC','DESIGN_SYSTEM','BUSINESS_RULES','STATE_MACHINES','DATA_API','COMPLIANCE_REGISTER','TEST_MATRIX','STAGING_RUNBOOK','CHANGELOG','PROGRESS'])try{await access('docs/RELOO_'+name+'.md')}catch{errors.push('missing doc '+name)}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log('Product rule contract valid: '+rules.length+' versioned rules; referenced tests/docs exist. This does not certify legal approval or test execution.');
