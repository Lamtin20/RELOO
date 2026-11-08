// Allowlisted checks only. No arbitrary shell command, production endpoint or deploy.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {readdirSync} from 'node:fs';
import {hash,dependencyStatus} from './engine.mjs';
const npm=resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const commands={
 lint:['node_modules/eslint/bin/eslint.js','.'],
 typecheck:['node_modules/typescript/bin/tsc','--noEmit'],
 unit:['--test','tests/compliance-guardian.test.mjs','tests/mini-app-navigation.test.mjs'],
 'privacy-consent':['--test','tests/compliance-guardian.test.mjs'],
 security:['--test','tests/security-hardening.test.mjs'],
 secrets:['scripts/check-source-secrets.mjs'],
 integration:['--test','tests/stays-api.test.mjs','tests/stays-management.test.mjs','tests/neighborhood.test.mjs'],
 regression:['--test',...readdirSync('tests').filter(name=>name.endsWith('.test.mjs')).sort().map(name=>'tests/'+name)],
 dependency:[npm,'audit','--json'],
 'dependency-mobile':[npm,'audit','--prefix','mobile','--json'],
 'dependency-tooling':[npm,'audit','--prefix','tools/verification','--json'],
 build:[npm,'run','build']
};
const id=process.argv.find(a=>a.startsWith('--check='))?.slice(8);
if(!commands[id])throw Error('CHECK_NOT_AUTOMATED: '+Object.keys(commands).join(', ')+'. Browser/manual checks need reviewed artifacts.');
await mkdir('output/compliance',{recursive:true});
function scan(){const s=spawnSync(process.execPath,['compliance/run.mjs'],{encoding:'utf8',timeout:120000,maxBuffer:1000000});if(s.status!==0)throw Error('SOURCE_SCAN_FAILED');return JSON.parse(s.stdout.trim()).sourceHash;}
const before=scan(),at=new Date().toISOString();
const r=spawnSync(process.execPath,commands[id],{encoding:'utf8',timeout:600000,maxBuffer:20000000,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
const artifact='output/compliance/'+id+'.txt';
// Checks must not print credentials; the source secret scanner is separately bounded.
const content=(r.stdout||'')+(r.stderr||'')+(r.error?'\nCHECK_EXECUTION_ERROR\n':'');
await writeFile(artifact,content);
const after=scan(),evidence=JSON.parse(await readFile('output/compliance/evidence.json','utf8').catch(()=> '{}'));
let status=r.status===0?'PASS':'FAIL';
if(id.startsWith('dependency')){try{status=dependencyStatus(JSON.parse(r.stdout),r.status)}catch{status='NOT_TESTED'}}
if(before!==after)status='NOT_TESTED';
evidence[id]={status,at,sourceHash:after,artifact,artifactHash:hash(content),exitCode:r.status,scope:id==='privacy-consent'?'Pure policy + real loader with synthetic browser globals; no runtime network acceptance':id};
await writeFile('output/compliance/evidence.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence[id]));process.exitCode=evidence[id].status==='PASS'?0:1;
