import {cookies} from 'next/headers';
import {requireCrmAccess} from '@/lib/operations/crm-auth';
import {crmCookieValue,CRM_COOKIE} from '@/lib/operations/crm-session';
import {securityDb} from '@/lib/security/service';
import {encryptPrivate,decryptPrivate} from '@/lib/operations/crypto';
import {HttpError,errorResponse,rateLimit,readJson,secretMatches} from '@/lib/server/http';
import {ssoToken,ssoHash,ssoChallenge,validSsoState} from '@/lib/auth/management-sso';
import {brokerRequest,federationOrigin} from '@/lib/auth/federation-identity';
import {MANAGEMENT_COOKIE} from '@/lib/auth/management-bridge';
import {FEDERATION_ISSUER,FEDERATION_CLIENTS,FEDERATION_COOKIE,FEDERATION_STATE,federationClient,federationClientConfigured,federationToken,federationNext,federationAuthorizePath,validFederationAssertion} from '@/lib/auth/federation-policy';
const stateOptions={httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/federation',maxAge:300};
const redirect=url=>new Response(null,{status:303,headers:{Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
const json=value=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
const landing=client=>client==='agent'?'/agent-office':client==='chat'?'/chat-control':'/';
function brokerConfigured(origin){return process.env.RELOO_IDENTITY_MODE==='broker'&&origin===FEDERATION_ISSUER&&process.env.CRM_ORIGIN===FEDERATION_ISSUER&&process.env.APP_ORIGIN==='https://reloo.vn'&&process.env.RELOO_ENVIRONMENT!=='staging';}
function clientSecret(client){if(!Object.hasOwn(FEDERATION_CLIENTS,client))return null;const value=process.env['RELOO_IDENTITY_'+client.toUpperCase()+'_SECRET'];return /^[a-f0-9]{64}$/i.test(value||'')?value:null;}
async function verifyCentral(payload){
 if(!payload||typeof payload.access_token!=='string'||typeof payload.receipt!=='string')throw new HttpError(401,'IDENTITY_SESSION_INVALID');
 const headers=new Headers({Authorization:'Bearer '+payload.access_token,Cookie:CRM_COOKIE+'='+payload.receipt});
 const account=await requireCrmAccess(new Request(FEDERATION_ISSUER+'/api/auth/federation/introspect',{headers}));
 if(account.profile.id!==payload.profileId)throw new HttpError(401,'IDENTITY_SESSION_INVALID');return account;
}
export async function GET(request,{params}){const origin=federationOrigin(request),client=federationClient(origin);try{
 const {action}=await params,url=new URL(request.url),jar=await cookies();rateLimit(request,'federation-entry',30);
 if(action==='start'){
  if(!federationClientConfigured(origin))throw new HttpError(503,'IDENTITY_NOT_CONFIGURED');
  const state=ssoToken(),verifier=ssoToken(),next=federationNext(url.searchParams.get('next')||landing(client),origin);
  jar.set(FEDERATION_STATE,encryptPrivate(JSON.stringify({state,verifier,at:Date.now(),next,client})),stateOptions);
  return redirect(FEDERATION_ISSUER+'/api/auth/federation/authorize?'+new URLSearchParams({state,challenge:ssoChallenge(verifier),client}));
 }
 if(action==='authorize'){
  const path=federationAuthorizePath(url.pathname+url.search),target=url.searchParams.get('client');
  if(!brokerConfigured(origin)||!path||!clientSecret(target))throw new HttpError(400,'IDENTITY_REQUEST_INVALID');
  let account;try{account=await requireCrmAccess(request);}catch(e){if(e.status===401||e.code==='CRM_MFA_REQUIRED')return redirect(FEDERATION_ISSUER+'/crm/login?next='+encodeURIComponent(path));throw e;}
  const session=(await account.client.auth.getSession()).data.session;if(!session)throw new HttpError(401,'AUTH_REQUIRED');
  const code=ssoToken(),r=await account.db.from('federation_codes').insert({secret_hash:ssoHash(code),challenge:url.searchParams.get('challenge'),client:target,profile_id:account.profile.id,crm_session_id:account.crmReceipt.id,envelope:encryptPrivate(JSON.stringify({access_token:session.access_token,receipt:crmCookieValue(request),profileId:account.profile.id}))});
  if(r.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');
  return redirect(FEDERATION_CLIENTS[target]+'/api/auth/federation/callback?'+new URLSearchParams({state:url.searchParams.get('state'),code}));
 }
 if(action==='callback'){
  if(!federationClientConfigured(origin))throw new HttpError(503,'IDENTITY_NOT_CONFIGURED');
  let state;try{state=JSON.parse(decryptPrivate(jar.get(FEDERATION_STATE)?.value||''));}catch{throw new HttpError(400,'IDENTITY_STATE_INVALID');}
  if(!validSsoState(state,url.searchParams.get('state'))||state.client!==client||!federationToken(url.searchParams.get('code')))throw new HttpError(400,'IDENTITY_STATE_INVALID');
  jar.set(FEDERATION_STATE,'',{...stateOptions,maxAge:0});
  const remote=await brokerRequest('exchange',{code:url.searchParams.get('code'),verifier:state.verifier},origin);
  if(!validFederationAssertion(remote,{client})||!federationToken(remote.reference))throw new HttpError(401,'IDENTITY_ASSERTION_INVALID');
  const db=securityDb(),map=await db.from('federation_identities').select('profile_id').eq('issuer',FEDERATION_ISSUER).eq('issuer_subject',remote.subject).eq('enabled',true).maybeSingle();
  if(map.error)throw new HttpError(503,'IDENTITY_MAPPING_UNAVAILABLE');if(!map.data)throw new HttpError(403,'IDENTITY_MAPPING_REQUIRED');
  const opaque=ssoToken(),created=await db.from('federation_local_sessions').insert({secret_hash:ssoHash(opaque),client,issuer_subject:remote.subject,profile_id:map.data.profile_id,upstream_reference:encryptPrivate(remote.reference),expires_at:new Date(remote.expiresAt).toISOString()});
  if(created.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');
  jar.set(FEDERATION_COOKIE,opaque,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:Math.max(0,Math.floor((remote.expiresAt-Date.now())/1000))});
  for(const name of [MANAGEMENT_COOKIE,CRM_COOKIE])jar.set(name,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
  return redirect(origin+federationNext(state.next,origin));
 }
 throw new HttpError(404,'NOT_FOUND');
}catch(e){if(client){const {action}=await params;if(action==='callback')return redirect(origin+(client==='staging'?'/uat':landing(client))+'/login?reason='+(e.code==='IDENTITY_MAPPING_REQUIRED'?'permission':'expired'));}return errorResponse(e)}}
export async function POST(request,{params}){try{
 const {action}=await params,origin=federationOrigin(request);if(!brokerConfigured(origin)||!['exchange','introspect','revoke'].includes(action))throw new HttpError(404,'NOT_FOUND');
 rateLimit(request,'federation-backchannel',120);const input=await readJson(request,2000),secret=clientSecret(input.client);
 const authorization=request.headers.get('authorization')||'';
 if(!secret||!authorization.startsWith('Bearer ')||!secretMatches(authorization.slice(7),secret))throw new HttpError(401,'IDENTITY_CLIENT_DENIED');
 const db=securityDb();
 if(action==='exchange'){
  if(!federationToken(input.code)||!federationToken(input.verifier))throw new HttpError(400,'IDENTITY_PROOF_INVALID');
  const consumed=await db.rpc('reloo_federation_consume',{p_hash:ssoHash(input.code),p_challenge:ssoChallenge(input.verifier),p_client:input.client});
  if(consumed.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');if(!consumed.data)throw new HttpError(401,'IDENTITY_CODE_EXPIRED');
  const payload=JSON.parse(decryptPrivate(consumed.data)),account=await verifyCentral(payload),reference=ssoToken();
  const claims=await account.client.auth.getClaims(payload.access_token),expiresAt=Math.min(claims.data?.claims?.exp*1000,account.crmReceipt.expiresAt*1000);
  if(!Number.isSafeInteger(expiresAt)||expiresAt<=Date.now())throw new HttpError(401,'IDENTITY_SESSION_EXPIRED');
  const saved=await db.from('federation_upstream_sessions').insert({secret_hash:ssoHash(reference),client:input.client,profile_id:account.profile.id,crm_session_id:account.crmReceipt.id,envelope:encryptPrivate(JSON.stringify(payload)),expires_at:new Date(expiresAt).toISOString()});
  if(saved.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');
  return json({issuer:FEDERATION_ISSUER,client:input.client,subject:account.authUser.id,mfa:true,receipt:account.crmReceipt.id,expiresAt,reference});
 }
 if(!federationToken(input.reference))throw new HttpError(400,'IDENTITY_REFERENCE_INVALID');
 const r=await db.from('federation_upstream_sessions').select('*').eq('secret_hash',ssoHash(input.reference)).eq('client',input.client).gt('expires_at',new Date().toISOString()).is('revoked_at',null).maybeSingle();
 if(r.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');
 if(action==='revoke'){
  if(r.data){const receipt=await db.from('crm_mfa_sessions').update({revoked_at:new Date().toISOString()}).eq('id',r.data.crm_session_id).eq('profile_id',r.data.profile_id);if(receipt.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');}
  return json({ok:true});
 }
 if(!r.data)throw new HttpError(401,'IDENTITY_SESSION_EXPIRED');
 const account=await verifyCentral(JSON.parse(decryptPrivate(r.data.envelope)));
 return json({issuer:FEDERATION_ISSUER,client:input.client,subject:account.authUser.id,mfa:true,receipt:account.crmReceipt.id,expiresAt:Date.parse(r.data.expires_at)});
}catch(e){return errorResponse(e)}}
