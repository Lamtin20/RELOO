// Deterministic foundation/report contracts only, never a premium score or release approval.
import {readFile} from 'node:fs/promises';
import {RELOO_FOUNDATION as tokens} from '../lib/design/foundation.js';
import {contrastRatio} from '../lib/design/palette.js';
import {searchBoxCopy} from '../lib/i18n/search-box.js';
const reports=['MASTER_AUDIT','EXPERT_REVIEW','DESIGN_SYSTEM','VISUAL_IMAGE_STANDARD','PLATFORM_MATRIX','ARCHITECTURE','IMPLEMENTATION_PLAN','PERFORMANCE_REPORT','SECURITY_REVIEW','QA_REPORT','RELEASE_READINESS'];
const errors=[];
for(const name of reports){try{if((await readFile(`docs/v4/RELOO_V4_${name}.md`,'utf8')).trim().length<300)errors.push('INCOMPLETE_REPORT:'+name)}catch{errors.push('MISSING_REPORT:'+name)}}
const css=await readFile('app/v4-foundation.css','utf8');
for(const [name,value] of Object.entries(tokens.spacing))if(!css.includes(`--reloo-space-${name}:${value}px`))errors.push('SPACING_DRIFT:'+name);
for(const [name,value] of Object.entries(tokens.radii))if(!css.includes(`--reloo-radius-${name}:${value}px`))errors.push('RADIUS_DRIFT:'+name);
for(const name of ['brand','ink','muted','danger'])if(contrastRatio(tokens.colors[name],tokens.colors.surface)<4.5)errors.push('CONTRAST:'+name);
if(JSON.stringify(Object.keys(searchBoxCopy['vi-VN']).sort())!==JSON.stringify(Object.keys(searchBoxCopy['en-US']).sort()))errors.push('LOCALE_DRIFT');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(JSON.stringify({contract:'RELOO_V4_SHARED_FOUNDATION',status:'PASS',reports:reports.length,scope:'Report inventory, primitive parity, defined palette contrast and locale keys only',releaseApproval:false,nativeAcceptance:false,uiScore:null}));
