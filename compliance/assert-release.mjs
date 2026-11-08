import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function assertComplianceRelease(){
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./run.mjs',import.meta.url)),'--gate','--evidence=output/compliance/evidence.json'],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit',timeout:120000});
 if(result.status!==0)throw Error('COMPLIANCE_RELEASE_BLOCKED: resolve findings and supply current source-bound evidence. Existing production is unchanged.');
}
