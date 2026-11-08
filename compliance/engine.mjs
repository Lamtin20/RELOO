import {createHash} from 'node:crypto';
export const hash=text=>createHash('sha256').update(text).digest('hex');
export const statuses=['PASS','FAIL','NOT_TESTED','NEEDS_REVIEW','NEEDS_LEGAL_REVIEW'];
export const artifactPathAllowed=path=>typeof path==='string'&&/^output\/compliance\/[A-Za-z0-9_][A-Za-z0-9_./-]*$/.test(path)&&path.split('/').every(p=>p!=='.'&&p!=='..');
export const requiredChecks=['lint','typecheck','unit','integration','security','secrets','privacy-consent','accessibility','regression','dependency','dependency-mobile','dependency-tooling','build','staging','runtime-consistency','legal-approval','asset-provenance','risk-triage',...Array.from({length:20},(_,i)=>'RULE-'+String(i+1).padStart(3,'0')),'RELOO-RENTAL','RELOO-JOBS','RELOO-STAYS','RELOO-PAYMENTS','RELOO-TRUST','RELOO-WORLD'];
export function dependencyStatus(audit,exitCode){
 const v=audit?.metadata?.vulnerabilities;
 if(audit?.error||![0,1].includes(exitCode)||!v||!Number.isInteger(v.high)||!Number.isInteger(v.critical))return 'NOT_TESTED';
 return v.high||v.critical?'FAIL':'PASS';
}
export function classifyGate(findings,evidence={},identity,now=Date.now()){
 const blocking=findings.filter(f=>f.confirmed===true&&['CRITICAL','HIGH'].includes(f.severity));
 const missing=requiredChecks.filter(key=>{
  const e=evidence[key];
  return !e||e.status!=='PASS'||e.sourceHash!==identity||!e.artifactHash||!e.artifactVerified||!Number.isFinite(Date.parse(e.at))||Date.parse(e.at)>now||now-Date.parse(e.at)>86400000;
 });
 if(blocking.length)return {status:'BLOCKED',blocking:blocking.map(f=>f.id),missing,exitCode:1};
 if(missing.length||findings.some(f=>['NEEDS_REVIEW','NEEDS_LEGAL_REVIEW','NOT_TESTED'].includes(f.status)&&f.releaseRequired))return {status:'NEEDS_REVIEW',blocking:[],missing,exitCode:2};
 return {status:'PASS',blocking:[],missing:[],exitCode:0};
}
// Heuristics emit candidates. Only mechanically conclusive signatures are confirmed.
export function scanText(path,text){
 const findings=[];
 const add=(rule,severity,confirmed,status,reason,line)=>findings.push({id:hash(path+rule+reason+line).slice(0,16),rule,severity,confirmed,status,path,line,reason,remediation:'Review the referenced source and attach a regression test or accountable evidence; never suppress solely to pass CI.'});
 const source=/\.(?:[cm]?js|jsx|ts|tsx|html|sql|ya?ml|json|ps1)$/.test(path);
 if(!source)return findings;
 const lines=text.split(/\r?\n/);
 if(/^app\/api\/admin\/.*\/route\.[jt]s$/.test(path)&&!(/requireAccount\([\s\S]*?admin\s*:\s*true/.test(text)||/requireAdmin|adminIdentity|adminRoute/.test(text)))add('RULE-020','HIGH',false,'NEEDS_REVIEW','Admin endpoint guard not recognized; trace imported authorization before any conclusion',1);
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)||/\b(?:sk_live_|rk_live_)[a-zA-Z0-9]{20,}\b/.test(line)||/\bAKIA[A-Z0-9]{16}\b/.test(line)||/\bghp_[a-zA-Z0-9]{36}\b/.test(line))add('RULE-020','CRITICAL',true,'FAIL','Credential signature in distributable source; value deliberately omitted',i+1);
  if(/<img\b[^>]*>/.test(line)&&[...line.matchAll(/<img\b[^>]*>/g)].some(m=>! /\balt\s*=/.test(m[0])))add('RULE-014','MEDIUM',false,'NEEDS_REVIEW','Image tag without explicit alt; verify spread props and whether decorative',i+1);
  if(/(?:số\s+1(?![\d/])|tốt nhất|100% an toàn|cam kết tuyệt đối)/i.test(line))add('RULE-012','MEDIUM',false,'NEEDS_REVIEW','Marketing superlative candidate needs substantiation',i+1);
  if(/(?:defaultChecked|checked)\s*=\s*\{?true\}?/.test(line)&&/consent|marketing|đồng ý/i.test(line))add('RULE-006','HIGH',false,'NEEDS_REVIEW','Preselected consent candidate',i+1);
  if(/console\.(?:log|info|error)\([^\n]*(?:password|access_token|refresh_token|cardNumber|cvv)/i.test(line))add('RULE-017','HIGH',false,'NEEDS_REVIEW','Sensitive logging candidate; confirm reachable payload',i+1);
  if(/https?:\/\/(?:www\.)?(?:googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|analytics\.tiktok\.com)/.test(line)&&!/google-browser\.js$/.test(path))add('RULE-009','HIGH',false,'NEEDS_REVIEW','Tracker destination outside registered loader',i+1);
  if(/\bGRANT\b.*\b(?:ALL|SELECT|INSERT|UPDATE|DELETE|EXECUTE)\b.*\bTO\s+(?:PUBLIC|anon|authenticated)\b/i.test(line)&&!/REVOKE|--/.test(line))add('RULE-020','HIGH',false,'NEEDS_REVIEW','Public-schema privilege candidate conflicts with backend-only baseline',i+1);
 }
 return findings;
}
export function contrast(hex1,hex2){
 const lum=h=>{if(!/^#[0-9a-f]{6}$/i.test(h))throw Error('RGB_HEX_REQUIRED');const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
 const a=lum(hex1),b=lum(hex2);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
export function networkFindings(requests,consent){
 const trackers=/https?:\/\/([^/]+\.)?(googletagmanager\.com|google-analytics\.com|facebook\.net|facebook\.com|tiktok\.com)(?=[:/])/i;
 return requests.filter(r=>trackers.test(r.url)&&!(consent.analytics===true&&/google/.test(r.url))&&!(consent.marketing===true&&/facebook|tiktok/.test(r.url))).map((r,i)=>({id:'network-'+i,rule:'RULE-018',severity:'CRITICAL',confirmed:true,status:'FAIL',reason:'Observed nonessential tracker request while category denied',path:new URL(r.url).hostname,remediation:'Prevent script/request before consent and after withdrawal.'}));
}
