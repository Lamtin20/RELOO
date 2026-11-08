import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mkdir,mkdtemp,writeFile,copyFile,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {scanText,classifyGate,requiredChecks,contrast,networkFindings,artifactPathAllowed,dependencyStatus} from '../compliance/engine.mjs';
import {mayTrack,validConsent} from '../lib/privacy/consent-policy.mjs';
import {validReviewArtifact} from '../compliance/review-evidence.mjs';
test('registry covers all 20 rules and six domain controls without claiming approval',async()=>{
 const r=JSON.parse(await readFile(new URL('../compliance/registry.json',import.meta.url)));
 assert.equal(new Set(r.rules.map(v=>v.id)).size,26);
 for(const row of r.rules)for(const key of ['id','description','scope','references','severity','method','evidenceRequired','remediation','status','owner'])assert.ok(row[key],key);
 assert.equal(r.references['VN-DATA'].verification,'NOT_VERIFIED');
 for(const finding of [...scanText('app/api/admin/fixture/route.js','export function GET(){}'),...scanText('supabase/migrations/fixture.sql','grant update(name) on public.profiles to authenticated;')])assert.ok(r.rules.some(rule=>rule.id===finding.rule),'finding must map to a registered owner/rule');
});
test('manual approval rejects empty logs, pending review, wrong source and expired or unaccountable evidence',()=>{
 const now=Date.now(),options={id:'legal-approval',sourceHash:'fixture',now},review={schemaVersion:1,checkId:'legal-approval',sourceHash:'fixture',decision:'APPROVED',reviewer:{name:'Synthetic reviewer',role:'Fixture role'},scope:'Synthetic review scope for validation only',evidence:['fixture-reference'],reviewedAt:new Date(now).toISOString(),expiresAt:new Date(now+1000).toISOString()};
 assert.ok(validReviewArtifact(review,options));assert.equal(validReviewArtifact('PASS',options),false);
 for(const patch of [{decision:'PENDING'},{sourceHash:'other'},{reviewer:{name:'',role:''}},{evidence:[]},{expiresAt:new Date(now-1).toISOString()},{reviewedAt:new Date(now+1).toISOString()}])assert.equal(validReviewArtifact({...review,...patch},options),false);
});
test('dependency policy blocks high/critical, tracks medium/low and never accepts audit execution failure',()=>{
 assert.equal(dependencyStatus({metadata:{vulnerabilities:{high:0,critical:0,moderate:3,low:1}}},1),'PASS');
 assert.equal(dependencyStatus({metadata:{vulnerabilities:{high:1,critical:0}}},1),'FAIL');
 assert.equal(dependencyStatus({metadata:{vulnerabilities:{high:0,critical:1}}},1),'FAIL');
 assert.equal(dependencyStatus({error:{code:'NETWORK_ERROR'}},1),'NOT_TESTED');assert.equal(dependencyStatus({},0),'NOT_TESTED');
});
test('evidence artifact paths reject absolute paths, traversal and other directories',()=>{
 assert.ok(artifactPathAllowed('output/compliance/build.txt'));
 for(const p of ['C:/Windows/file','/etc/passwd','output/compliance/../secret','output/compliance/./file','output\\compliance\\file','docs/approval.json'])assert.equal(artifactPathAllowed(p),false,p);
});
test('intentional credential fixture blocks release and output omits credential value',()=>{
 const secret=['sk','live','a'.repeat(24)].join('_');
 const f=scanText('app/bad.js','const key="'+secret+'"');
 assert.equal(f[0].severity,'CRITICAL');assert.equal(classifyGate(f,{},'source').status,'BLOCKED');
 assert.ok(!JSON.stringify(f).includes(secret));assert.equal(classifyGate(scanText('app/clean.js','const x=1'),{},'source').status,'NEEDS_REVIEW');
});
test('missing, stale, future, different-source and unverified evidence cannot pass gate',()=>{
 const now=Date.now(),e=Object.fromEntries(requiredChecks.map(k=>[k,{status:'PASS',sourceHash:'s',artifactHash:'h',artifactVerified:true,at:new Date(now).toISOString()}]));
 assert.equal(classifyGate([],e,'s',now).status,'PASS');
 for(const change of [{status:'NOT_TESTED'},{sourceHash:'other'},{artifactVerified:false},{at:new Date(now-86400001).toISOString()},{at:new Date(now+1).toISOString()}])assert.equal(classifyGate([],{...e,build:{...e.build,...change}},'s',now).status,'NEEDS_REVIEW');
 assert.equal(classifyGate([{id:'high',confirmed:true,severity:'HIGH'}],e,'s').status,'BLOCKED');
 assert.equal(classifyGate([{id:'maybe',confirmed:false,severity:'HIGH',status:'NEEDS_LEGAL_REVIEW',releaseRequired:true}],e,'s').status,'NEEDS_REVIEW');
});
test('candidate heuristics do not claim legal violations',()=>{
 for(const f of scanText('app/example.jsx','<img src="x"/> 100% an toàn\n<input defaultChecked={true} name="marketing"/>'))assert.equal(f.confirmed,false);
 assert.ok(scanText('app/example.jsx','<img src="x" alt=""/>').length===0);
 assert.equal(scanText('docs/reference.json','Luật số 122/2025/QH15; Luật số 19/2023/QH15; Nghị định số 1/2020').filter(f=>f.rule==='RULE-012').length,0);
 assert.equal(scanText('app/example.jsx','Nền tảng số 1 Việt Nam').filter(f=>f.rule==='RULE-012').length,1);
});
test('deny, stale consent, DNT, GPC and unknown categories never permit tracking',()=>{
 const c={version:2,analytics:true,marketing:false,savedAt:Date.now()};
 assert.ok(validConsent(c));assert.ok(mayTrack(c));assert.equal(mayTrack({...c,analytics:false}),false);
 for(const options of [{dnt:true},{gpc:true},{category:'essential'},{category:'marketing'},{now:c.savedAt+180*86400000}])assert.equal(mayTrack(c,options),false);
 assert.equal(mayTrack(null),false);assert.equal(mayTrack({...c,savedAt:Date.now()+10000}),false);
});
test('observed tracker with denied consent is CRITICAL and blocks; essential requests do not',()=>{
 const requests=[{url:'https://www.googletagmanager.com/gtag/js?id=fixture'},{url:'https://reloo.vn/api/auth/session'}];
 assert.equal(networkFindings(requests,{analytics:false,marketing:false}).length,1);
 assert.equal(classifyGate(networkFindings(requests,{})).status,'BLOCKED');
 assert.equal(networkFindings(requests,{analytics:true}).length,0);
});
test('WCAG luminance math recognizes failure and valid contrast',()=>{
 assert.equal(contrast('#ffffff','#ffffff'),1);assert.equal(contrast('#000000','#ffffff'),21);assert.ok(contrast('#087f5b','#ffffff')>=4.5);
 assert.throws(()=>contrast('transparent','#ffffff'));
});
test('real GA loader denies without consent, permits explicit consent and stops after withdrawal',async()=>{
 const original={};for(const k of ['window','document','location','navigator','localStorage'])original[k]=Object.getOwnPropertyDescriptor(globalThis,k);
 let choice=null,inserted=0;const events=[];
 try{
 Object.defineProperties(globalThis,{window:{configurable:true,value:{gtag:(...a)=>events.push(a)}},document:{configurable:true,value:{cookie:'',querySelector:()=>null,createElement:()=>({dataset:{}}),head:{appendChild:()=>inserted++}}},location:{configurable:true,value:{hostname:'reloo.vn'}},navigator:{configurable:true,value:{}},localStorage:{configurable:true,value:{getItem:()=>JSON.stringify(choice)}}});
 const {googlePageView}=await import('../lib/analytics/google-browser.js');
 googlePageView('G-ABCDEF12','/explore');assert.equal(inserted,0);
 choice={version:2,analytics:false,marketing:false,savedAt:Date.now()};googlePageView('G-ABCDEF12','/explore');assert.equal(inserted,0);
 choice.analytics=true;googlePageView('G-ABCDEF12','/explore');assert.equal(inserted,1);
 const count=events.length;choice.analytics=false;googlePageView('G-ABCDEF12','/');assert.equal(events.length,count);assert.equal(window['ga-disable-G-ABCDEF12'],true);
 }finally{for(const [k,v] of Object.entries(original)){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k]}}
});
test('actual CLI blocks injected credential in disposable git fixture; removal restores review state',async()=>{
 const base=resolve('output/compliance-fixtures');await mkdir(base,{recursive:true});const dir=await mkdtemp(join(base,'guardian-'));
 try{
  await mkdir(join(dir,'compliance'));await mkdir(join(dir,'app'));
  for(const name of ['run.mjs','engine.mjs','registry.json','review-evidence.mjs'])await copyFile(new URL('../compliance/'+name,import.meta.url),join(dir,'compliance',name));
  for(const path of ['app/cms/privacy/page.js','lib/legal/documents.js','components/privacy/CookieConsent.jsx']){await mkdir(resolve(dir,path,'..'),{recursive:true});await writeFile(join(dir,path),'// fixture existence only; not an approved policy\n');}
  const git=args=>{const r=spawnSync('git',args,{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr)};
  git(['init','--quiet']);await writeFile(join(dir,'.gitignore'),'output/\n');git(['add','.']);git(['-c','user.name=Guardian Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture']);
  const secret=['sk','live','z'.repeat(24)].join('_');await writeFile(join(dir,'app/fixture.js'),'const key="'+secret+'";');
  const run=()=>spawnSync(process.execPath,['compliance/run.mjs','--gate'],{cwd:dir,encoding:'utf8',timeout:30000});
  let r=run();assert.equal(r.status,1,r.stderr);assert.equal(JSON.parse(r.stdout).gate.status,'BLOCKED');assert.ok(!(await readFile(join(dir,'output/compliance/latest.json'),'utf8')).includes(secret));
  await writeFile(join(dir,'app/fixture.js'),'export const safe=true;');r=run();assert.equal(r.status,2,r.stderr);assert.equal(JSON.parse(r.stdout).gate.status,'NEEDS_REVIEW');
 }finally{assert.ok(dir.startsWith(base+sep));await rm(dir,{recursive:true,force:true})}
});
