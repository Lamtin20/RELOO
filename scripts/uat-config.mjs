import {randomBytes,createHmac} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {resolve} from 'node:path';
import {stagingProblems} from '../lib/runtime/staging.js';
export function createUatConfig({now=Math.floor(Date.now()/1000),random=()=>randomBytes(32).toString('hex')}={}){
 const jwtSecret=random(),password=random(),dbPassword=random();
 const jwt=role=>{const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role,iss:'supabase',iat:now,exp:now+90*86400});return body+'.'+createHmac('sha256',jwtSecret).update(body).digest('base64url')};
 const env={RELOO_ENVIRONMENT:'staging',STAGING_ENV_FILE:'/srv/reloo-staging/secrets/staging.env',UAT_SECRETS_DIR:'/srv/reloo-staging/secrets',STAGING_RESOURCE_ID:'reloo-staging-'+randomBytes(8).toString('hex'),APP_ORIGIN:'https://staging.reloo.vn',CRM_ORIGIN:'https://staging.reloo.vn',NEXT_PUBLIC_SUPABASE_URL:'https://staging-auth.reloo.vn',SUPABASE_INTERNAL_URL:'http://staging-gateway:8000',POSTGRES_PASSWORD:dbPassword,JWT_SECRET:jwtSecret,NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('anon'),SUPABASE_SERVICE_ROLE_KEY:jwt('service_role'),RELOO_PRIVATE_DATA_KEY:random(),RELOO_STAGING_ACCESS_USER:'uat-reviewer',RELOO_STAGING_ACCESS_PASSWORD:password,RELOO_STAGING_OUTBOUND_MODE:'blocked',RELOO_STAGING_PAYMENT_MODE:'disabled',RELOO_MEDIA_DIR:'/srv/reloo-staging/media',RELOO_EVIDENCE_DIR:'/srv/reloo-staging/evidence',NEXT_PUBLIC_SOCKET_URL:'https://staging.reloo.vn',TRUST_PROXY:'false',RELOO_NEIGHBORHOOD_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'};
 if(stagingProblems(env,{now:now*1000}).length)throw Error('GENERATED_UAT_CONFIG_INVALID');
 return env;
}
export async function writeUatConfig(directory){
 const dir=resolve(directory);await mkdir(dir,{recursive:true,mode:0o700});
 const env=createUatConfig(),content=Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n';
 await writeFile(resolve(dir,'staging.env'),content,{flag:'wx',mode:0o600});await chmod(resolve(dir,'staging.env'),0o600);
 const crypt=spawnSync('openssl',['passwd','-6','-stdin'],{input:env.RELOO_STAGING_ACCESS_PASSWORD+'\n',encoding:'utf8',timeout:5000,windowsHide:true});
 if(crypt.status!==0||!crypt.stdout.startsWith('$6$'))throw Error('UAT_HTPASSWD_NOT_CREATED: openssl required on target; staging.env is retained securely, do not overwrite it');
 await writeFile(resolve(dir,'htpasswd'),env.RELOO_STAGING_ACCESS_USER+':'+crypt.stdout.trim()+'\n',{flag:'wx',mode:0o644});
 return {resource:env.STAGING_RESOURCE_ID,path:resolve(dir,'staging.env'),note:'Secrets generated locally, values omitted. Windows requires directory ACLs; Linux chmod applies on target.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const dir=process.argv.find(v=>v.startsWith('--out='))?.slice(6);if(!dir)throw Error('Use --out=<private dedicated directory>; existing files are never overwritten');console.log(JSON.stringify(await writeUatConfig(dir)))}
