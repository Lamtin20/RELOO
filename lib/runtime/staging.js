import {createHash,timingSafeEqual} from 'node:crypto';
import {federationConfigurationProblems} from '../auth/federation-policy.js';
const forbiddenProviders=/^(?:SEPAY_|GHTK_|GOSHIP_|ACCESSTRADE_|STRIPE_|PAYOS_|SMTP_|SENDGRID_|TWILIO_|FIREBASE_|RELOO_GA_MEASUREMENT_ID|RELOO_GOOGLE_CLIENT_SECRET)/;
export function stagingProblems(env,{now=Date.now()}={}){
 const problems=[];if(env.RELOO_ENVIRONMENT!=='staging')return ['STAGING_ENVIRONMENT_REQUIRED'];
 problems.push(...federationConfigurationProblems(env));
 const expiry=Date.parse(env.RELOO_STAGING_EXPIRES_AT||'2026-10-31T16:59:59Z');
 if(!Number.isFinite(expiry)||!Number.isFinite(now)||now>=expiry)problems.push('STAGING_REVIEW_WINDOW_EXPIRED');
 if(env.APP_ORIGIN!=='https://staging.reloo.vn'||env.CRM_ORIGIN!=='https://staging.reloo.vn')problems.push('STAGING_ORIGIN_REQUIRED');
 if(env.NEXT_PUBLIC_SUPABASE_URL!=='https://staging-auth.reloo.vn')problems.push('STAGING_AUTH_ORIGIN_REQUIRED');
 if(env.SUPABASE_INTERNAL_URL!=='http://staging-gateway:8000')problems.push('STAGING_BACKEND_REQUIRED');
 if(!env.STAGING_RESOURCE_ID?.startsWith('reloo-staging-')||/REPLACE|CHANGEME/.test(env.STAGING_RESOURCE_ID))problems.push('STAGING_RESOURCE_ID_REQUIRED');
 if(env.RELOO_COOKIE_DOMAIN)problems.push('SHARED_COOKIE_DOMAIN_FORBIDDEN');
 if(env.RELOO_CHAT_CONTROL_HOST&&env.RELOO_CHAT_CONTROL_HOST!=='chat.reloo.vn')problems.push('CHAT_CONTROL_HOST_INVALID');
 for(const key of ['SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY','RELOO_PRIVATE_DATA_KEY'])if(!env[key]||env[key].length<32||/REPLACE|CHANGEME|EXAMPLE/.test(env[key]))problems.push(key+'_REQUIRED');
 if(!env.RELOO_STAGING_ACCESS_USER||!env.RELOO_STAGING_ACCESS_PASSWORD||env.RELOO_STAGING_ACCESS_PASSWORD.length<24||/REPLACE|CHANGEME/.test(env.RELOO_STAGING_ACCESS_PASSWORD))problems.push('STAGING_ACCESS_REQUIRED');
 if(env.RELOO_STAGING_OUTBOUND_MODE!=='blocked')problems.push('OUTBOUND_MUST_BE_BLOCKED');
 if(Object.entries(env).some(([key,value])=>forbiddenProviders.test(key)&&value))problems.push('LIVE_PROVIDER_CREDENTIAL_FORBIDDEN');
 for(const key of ['RELOO_MEDIA_DIR','RELOO_EVIDENCE_DIR'])if(!env[key]?.startsWith('/srv/reloo-staging/'))problems.push(key+'_ISOLATION_REQUIRED');
 if(env.RELOO_STAYS_TEST_MODE==='1'||env.RELOO_NEIGHBORHOOD_TEST_MODE==='1'||env.RELOO_CARE_TEST_MODE==='1')problems.push('LOCAL_ACTOR_SIMULATOR_FORBIDDEN');
 if(env.NEXT_PUBLIC_SOCKET_URL&&env.NEXT_PUBLIC_SOCKET_URL!=='https://staging.reloo.vn')problems.push('STAGING_SOCKET_ORIGIN_REQUIRED');
 if(!env.RELOO_STAGING_PAYMENT_MODE||env.RELOO_STAGING_PAYMENT_MODE!=='disabled')problems.push('PAYMENT_MUST_BE_DISABLED_UNTIL_SANDBOX_CONNECTED');
 return problems;
}
export function assertStagingEnvironment(env=process.env,options){if(env.RELOO_ENVIRONMENT!=='staging')return;const failures=stagingProblems(env,options);if(failures.length)throw Error('STAGING_PREFLIGHT_FAILED: '+failures.join(', '))}
function equal(a,b){return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest())}
export function stagingAccess(request,env=process.env,{authenticated=false,now=Date.now()}={}){
 const host=new URL(request.url).hostname,forwardedHost=(request.headers.get('host')||'').toLowerCase().split(':')[0];
 if((forwardedHost||host)==='chat.reloo.vn'&&env.RELOO_ENVIRONMENT!=='staging'&&env.RELOO_MANAGEMENT_SSO==='production'&&env.RELOO_CHAT_CONTROL_HOST==='chat.reloo.vn'&&env.APP_ORIGIN==='https://reloo.vn'&&env.CRM_ORIGIN==='https://crm.reloo.vn')return null;
 if(env.RELOO_ENVIRONMENT!=='staging'&&!['staging.reloo.vn','chat.reloo.vn'].includes(host)&&!['staging.reloo.vn','chat.reloo.vn'].includes(forwardedHost))return null;
 const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'};
 if(env.RELOO_ENVIRONMENT!=='staging'||stagingProblems(env,{now}).length)return {status:503,headers,body:'Staging is not configured.'};
 const path=new URL(request.url).pathname;
 const entry=['/uat/login','/crm/login','/agent-office','/agent-office/login','/chat-control/login','/chat-control','/api/auth/login','/api/auth/logout','/api/auth/session','/api/auth/capabilities','/api/crm/access','/api/brand','/api/profile/language'].includes(path)||/^\/api\/auth\/(?:sso|federation)\/(?:start|authorize|callback)$/.test(path)||/^\/(?:_next|brand|images|fonts)(?:\/|$)/.test(path);
 const management=forwardedHost==='chat.reloo.vn'&&(path.startsWith('/api/crm/ai/')||path==='/api/crm/session'||path==='/api/crm/conversations'||path==='/api/mobile/runtime');
 const office=forwardedHost==='agent.reloo.vn'&&env.RELOO_AGENT_OFFICE_HOST==='agent.reloo.vn'&&['/api/crm/agent-office','/api/crm/session'].includes(path);
 if(authenticated||entry||management||office)return {status:200,headers};
 const supplied=request.headers.get('authorization')||'';
 const expected='Basic '+Buffer.from(env.RELOO_STAGING_ACCESS_USER+':'+env.RELOO_STAGING_ACCESS_PASSWORD).toString('base64');
 if(!equal(supplied,expected))return {status:401,headers,body:'Sign in to your RELOO UAT account.'};
 return {status:200,headers};
}
