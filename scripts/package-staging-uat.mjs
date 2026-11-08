// Restricted UAT packaging authorized by the owner, never a production PASS.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const policy=JSON.parse(await readFile('compliance/uat-exception-20261024.json','utf8'));
if(policy.environment!=='staging'||policy.origin!=='https://staging.reloo.vn'||policy.productionReleaseAllowed!==false||policy.legalApproval!==false||Date.parse(policy.expiresAt)<=Date.now())throw Error('UAT_EXCEPTION_INVALID_OR_EXPIRED');
const scan=spawnSync(process.execPath,['compliance/run.mjs','--gate','--evidence=output/compliance/evidence.json'],{encoding:'utf8',timeout:120000});
const report=JSON.parse(scan.stdout.trim());
if(![0,2].includes(scan.status)||report.gate.blocking.length)throw Error('UAT_CONFIRMED_BLOCKER');
if(report.gate.missing.some(id=>policy.requiredTechnicalChecks.includes(id)||!policy.deferredEvidence.includes(id)))throw Error('UAT_TECHNICAL_CHECKS_MISSING: '+report.gate.missing.join(', '));
await mkdir('output/uat',{recursive:true});
const archive='output/uat/reloo-staging-source.tar.gz';
const files=['app','components','lib','public','scripts','compliance','supabase/migrations','package.json','package-lock.json','next.config.mjs','proxy.js','jsconfig.json','tsconfig.json','eslint.config.mjs','server.mjs','Dockerfile','.dockerignore'];
const pack=spawnSync('tar',['-czf',archive,'--exclude=__pycache__','--exclude=*.pyc','--exclude=.env*','--exclude=**/.env*',...files],{stdio:'inherit'});
if(pack.status!==0)throw Error('UAT_PACKAGE_FAILED');
const result={exception:policy.id,environment:'staging',sourceHash:report.sourceHash,archive,archiveSha256:createHash('sha256').update(await readFile(archive)).digest('hex'),guardian:report.gate.status,deferred:report.gate.missing,expiresAt:policy.expiresAt,productionReleaseAllowed:false};
await writeFile('output/uat/package-manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
