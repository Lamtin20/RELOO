import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(fs.readFileSync(path.join(root,'tools/rea-toolchain.json'),'utf8'));
const candidates=[process.env.RELOO_REA_ENTRYPOINT,
 process.env.APPDATA&&path.join(process.env.APPDATA,'npm/node_modules/rea-agents/scripts/rea.mjs'),
 path.resolve(path.dirname(process.execPath),'../lib/node_modules/rea-agents/scripts/rea.mjs'),
 '/usr/local/lib/node_modules/rea-agents/scripts/rea.mjs','/usr/lib/node_modules/rea-agents/scripts/rea.mjs'].filter(Boolean);
const entry=candidates.find(p=>fs.existsSync(p));
if(!entry){console.error(`REA ${config.runtimeVersion} is not installed. See docs/REA_WORKFLOW.md or set RELOO_REA_ENTRYPOINT to its scripts/rea.mjs.`);process.exitCode=1;}
else{
 const installed=JSON.parse(fs.readFileSync(path.resolve(path.dirname(entry),'../package.json'),'utf8'));
 if(installed.name!==config.runtimePackage||installed.version!==config.runtimeVersion){console.error(`REA runtime mismatch: expected ${config.runtimePackage}@${config.runtimeVersion}. Review the toolchain before updating.`);process.exitCode=1;}
 else{const child=spawn(process.execPath,[entry,...(process.argv.length>2?process.argv.slice(2):['--help'])],{cwd:root,stdio:'inherit',windowsHide:true});child.once('error',e=>{console.error(e.message);process.exitCode=1;});child.once('exit',code=>{process.exitCode=code??1;});}
}
