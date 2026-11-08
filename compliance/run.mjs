import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {hash,scanText,classifyGate,requiredChecks,artifactPathAllowed} from './engine.mjs';
import {manualChecks,validReviewArtifact} from './review-evidence.mjs';
const root=process.cwd(),out=resolve(root,'output/compliance');
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',maxBuffer:16000000}).split('\0').filter(Boolean).filter(p=>p!=='docs/compliance/COMPLIANCE_AUDIT_REPORT.md'&&!/(^|\/)(node_modules|output|\.next[^/]*|\.git|\.playwright-cli|build|Pods|\.gradle)(\/|$)/.test(p)&&!/(^|\/)\.env(?:\.|$)|\.(?:keystore|jks|pem|key)$/.test(p));
const registry=JSON.parse(await readFile('compliance/registry.json','utf8'));
const findings=[],inventory=[],digests=[];
for(const path of [...new Set(files)].sort()){
 const full=resolve(root,path);if(relative(root,full).startsWith('..'))continue;
 const stat=await lstat(full).catch(()=>null);if(!stat?.isFile()||stat.isSymbolicLink()||stat.size>2000000)continue;
 const buffer=await readFile(full);digests.push(path+'\0'+hash(buffer));
 if(!/\.(?:[cm]?js|jsx|ts|tsx|sql|json|ya?ml|html|css|ps1|xml|plist)$/.test(path))continue;
 const text=buffer.toString('utf8');
 inventory.push({path,forms:(text.match(/<(?:form|input|select|textarea)\b/g)||[]).length,storage:/localStorage|sessionStorage|indexedDB|document\.cookie/.test(text),permissions:/geolocation|getUserMedia|requestPermission|ACCESS_FINE_LOCATION|READ_CONTACTS/.test(text),network:/fetch\(|https?:\/\//.test(text)});
 // Checker fixtures contain intentional signatures and must never be published as app assets.
 const candidates=scanText(path,text);
 findings.push(...(/^(?:tests|compliance|scripts\/design-)/.test(path)?candidates.filter(f=>f.confirmed):candidates));
}
const sourceHash=hash(digests.join('\n'));
for(const [path,rule] of [['app/cms/privacy/page.js','RULE-001'],['lib/legal/documents.js','RULE-002'],['components/privacy/CookieConsent.jsx','RULE-003']])if(!files.includes(path))findings.push({id:'missing-'+rule,rule,severity:'HIGH',confirmed:true,status:'FAIL',path,reason:'Required internal policy surface missing from source',remediation:'Restore policy access and obtain reviewed publication evidence.'});
for(const [file,rule] of [['compliance/field-purposes.json','RULE-005'],['compliance/asset-provenance.json','RULE-010']]){const data=JSON.parse(await readFile(file,'utf8').catch(()=>'{"status":"INCOMPLETE"}'));if(data.status!=='REVIEWED')findings.push({id:'registry-'+rule,rule,severity:'MEDIUM',confirmed:false,status:'NEEDS_REVIEW',releaseRequired:true,path:file,reason:'Accountable registry is incomplete; no legal breach inferred',remediation:'Populate reviewed purposes/provenance, owners and evidence; do not infer rights or legal basis.'})}
const evidencePath=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const evidence=evidencePath?JSON.parse(await readFile(evidencePath,'utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e})):{};
for(const key of requiredChecks){const e=evidence[key];if(!e)continue;e.artifactVerified=false;
 if(!artifactPathAllowed(e.artifact))continue;
 const canonical=await realpath(resolve(root,e.artifact)).catch(()=>null),canonicalOut=await realpath(out).catch(()=>null);
 if(!canonical||canonicalOut!==out||relative(out,canonical).startsWith('..')||canonical!==resolve(root,e.artifact))continue;
 const stat=await lstat(resolve(root,e.artifact)).catch(()=>null);if(stat?.isFile()&&!stat.isSymbolicLink()&&stat.size<10000000)e.artifactVerified=hash(await readFile(resolve(root,e.artifact)))===e.artifactHash;
 if(e.artifactVerified&&manualChecks.has(key)){try{e.artifactVerified=validReviewArtifact(JSON.parse(await readFile(resolve(root,e.artifact),'utf8')),{id:key,sourceHash})}catch{e.artifactVerified=false}}
}
for(const check of ['dependency','dependency-mobile','dependency-tooling'])if(evidence[check]?.sourceHash===sourceHash&&evidence[check].artifactVerified){
 try{const audit=JSON.parse(await readFile(evidence[check].artifact,'utf8'));
  for(const [name,v] of Object.entries(audit.vulnerabilities||{}))if(['critical','high','moderate','low'].includes(v.severity))findings.push({id:check+'-'+hash(name).slice(0,12),rule:'RULE-020',severity:v.severity==='moderate'?'MEDIUM':v.severity.toUpperCase(),confirmed:true,status:['high','critical'].includes(v.severity)?'FAIL':'NEEDS_REVIEW',path:check==='dependency'?'package-lock.json':check==='dependency-mobile'?'mobile/package-lock.json':'tools/verification/package-lock.json',reason:(check==='dependency'?'Application dependency advisory: ':check==='dependency-mobile'?'Mobile dependency advisory: ':'Isolated EVM test-tool lock advisory: ')+name+'; internal release policy blocks high/critical advisories, not proof of deployed exploitability',remediation:'Review advisory, reachability and smallest compatible patch; attach dependency and regression evidence. Medium/low require tracked remediation; test-tool findings do not imply production inclusion.'});
 }catch{findings.push({id:check+'-format',rule:'RULE-020',severity:'HIGH',confirmed:false,status:'NOT_TESTED',releaseRequired:true,path:check,reason:'Dependency evidence is not valid npm audit JSON',remediation:'Run dependency check again.'})}
}
const gate=classifyGate(findings,evidence,sourceHash);
const rules=registry.rules.map(r=>({...r,status:findings.some(f=>f.rule===r.id&&f.confirmed&&f.status==='FAIL')?'FAIL':findings.some(f=>f.rule===r.id)?'NEEDS_REVIEW':!gate.missing.includes(r.id)?'PASS':'NOT_TESTED',evidence:findings.filter(f=>f.rule===r.id).map(f=>f.id)}));
const report={schemaVersion:1,at:new Date().toISOString(),sourceHash,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8',maxBuffer:16000000}).length>0,scope:'Bounded source scan; no assertion of legal compliance or production runtime coverage',rules,findings,inventory,checks:requiredChecks.map(id=>({id,status:!gate.missing.includes(id)?'PASS':evidence[id]?.artifactVerified&&evidence[id]?.sourceHash===sourceHash&&evidence[id]?.status==='FAIL'?'FAIL':'NOT_TESTED'})),gate};
await mkdir(out,{recursive:true});
const content=JSON.stringify(report,null,2)+'\n';
await writeFile(resolve(out,'latest.json'),content);
await writeFile(resolve(out,'report-'+report.at.replace(/[:.]/g,'-')+'.json'),content);
await writeFile(resolve(out,'latest.md'),'# Guardian technical report\n\n'+report.at+'\n\nSource hash: '+sourceHash+'\n\nRelease: **'+report.gate.status+'**\n\n'+report.scope+'\n\n'+rules.map(r=>'- '+r.id+' '+r.status).join('\n')+'\n\nFindings (values omitted):\n'+findings.map(f=>'- '+f.rule+' '+f.severity+' '+f.status+' '+f.path+':'+f.line+' — '+f.reason).join('\n')+'\n');
console.log(JSON.stringify({sourceHash,files:digests.length,findings:findings.length,gate:report.gate}));
if(process.argv.includes('--gate'))process.exitCode=report.gate.exitCode;
