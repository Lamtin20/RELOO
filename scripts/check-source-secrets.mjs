// Bounded source scan. Does not read env/output/device files or print matched values.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/(?:sk_live_|rk_live_)[a-zA-Z0-9]{20,}/,/\bAKIA[A-Z0-9]{16}\b/,/\bghp_[a-zA-Z0-9]{36}\b/];
const findings=[];let examined=0;
for(const file of files){
 if(!/\.(?:[cm]?js|jsx|ts|tsx|json|ya?ml|sql|md|html|css|ps1)$/.test(file)||/^(?:output|node_modules|\.next[^/]*|mobile\/node_modules|\.playwright-cli)\//.test(file))continue;
 const content=await readFile(file,'utf8').catch(()=>null);if(!content||content.length>2000000)continue;examined++;
 if(patterns.some(p=>p.test(content)))findings.push(file);
}
if(findings.length){console.error('Potential private key/live credential signature in source files:\n'+findings.join('\n'));process.exitCode=1}else console.log('Bounded secret signature scan passed for '+examined+' source files. This is not a comprehensive secret audit.');
