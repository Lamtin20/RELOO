import {cookies} from 'next/headers';
import {requireCrmAccess} from '@/lib/operations/crm-auth';
import {crmAllowed,isFullCrmRole} from '@/lib/operations/access';
import {CRM_COOKIE,crmCookieValue,validCrmReceipt} from '@/lib/operations/crm-session';
import {securityDb} from '@/lib/security/service';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {encryptPrivate,decryptPrivate} from '@/lib/operations/crypto';
import {HttpError,errorResponse,rateLimit} from '@/lib/server/http';
import {SSO_COOKIE,ssoToken,ssoHash,ssoChallenge,validSsoToken,managementOrigins,ssoAuthorizePath,validSsoState} from '@/lib/auth/management-sso';
import {MANAGEMENT_COOKIE} from '@/lib/auth/management-bridge';
import {federationClientConfigured,FEDERATION_COOKIE,FEDERATION_STATE} from '@/lib/auth/federation-policy';
const opts={httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/sso',maxAge:300};
function redirect(url){return new Response(null,{status:303,headers:{Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}})}
function requestOrigin(request){return 'https://'+(request.headers.get('host')||new URL(request.url).host).toLowerCase();}
export async function GET(request,{params}){try{
 rateLimit(request,'management-sso',30);const url=new URL(request.url),{action}=await params,origin=requestOrigin(request);
 if(action==='start'&&federationClientConfigured(origin))return redirect(origin+'/api/auth/federation/start');
 const target=origin==='https://agent.reloo.vn'||url.searchParams.get('target')==='agent'?'agent':'chat',origins=managementOrigins(process.env,target),landing=target==='agent'?'/agent-office':'/chat-control',jar=await cookies();
 if(action==='start'){
  if(origin!==origins.target)throw new HttpError(403,'SSO_ORIGIN_DENIED');const state=ssoToken(),verifier=ssoToken();jar.set(SSO_COOKIE,encryptPrivate(JSON.stringify({state,verifier,at:Date.now()})),opts);
  const query=new URLSearchParams({state,challenge:ssoChallenge(verifier)});if(target==='agent')query.set('target','agent');
  return redirect(origins.central+'/api/auth/sso/authorize?'+query);
 }
 if(action==='authorize'){
  if(origin!==origins.central||!ssoAuthorizePath(url.pathname+url.search))throw new HttpError(400,'SSO_REQUEST_INVALID');let account;
  try{account=await requireCrmAccess(request)}catch(e){if(e.status===401||e.code==='CRM_MFA_REQUIRED')return redirect(origins.central+'/crm/login?next='+encodeURIComponent(url.pathname+url.search));if(e.code==='CRM_ACCESS_DENIED')return redirect(origins.target+landing+'/login?reason=permission');throw e}
  if(target==='agent'?!isFullCrmRole(account.staff.role):!crmAllowed(account.staff,'bots.read')&&!crmAllowed(account.staff,'support.read'))return redirect(origins.target+landing+'/login?reason=permission');
  const session=(await account.client.auth.getSession()).data.session;if(!session)throw new HttpError(401,'AUTH_REQUIRED');
  const code=ssoToken(),r=await account.db.from('management_sso_tickets').insert({token_hash:ssoHash(code),challenge:url.searchParams.get('challenge'),target_origin:origins.target,profile_id:account.profile.id,crm_session_id:account.crmReceipt.id,envelope:encryptPrivate(JSON.stringify({access_token:session.access_token,receipt:crmCookieValue(request),profileId:account.profile.id,central:origins.central}))});if(r.error)throw new HttpError(503,'SSO_UNAVAILABLE');
  return redirect(origins.target+'/api/auth/sso/callback?'+new URLSearchParams({code,state:url.searchParams.get('state')}));
 }
 if(action==='callback'){
  if(origin!==origins.target)throw new HttpError(403,'SSO_ORIGIN_DENIED');let state;try{state=JSON.parse(decryptPrivate(jar.get(SSO_COOKIE)?.value||''))}catch{throw new HttpError(400,'SSO_STATE_INVALID')}
  if(!validSsoState(state,url.searchParams.get('state'))||!validSsoToken(url.searchParams.get('code')))throw new HttpError(400,'SSO_STATE_INVALID');
  jar.set(SSO_COOKIE,'',{...opts,maxAge:0});const r=await securityDb().rpc('reloo_management_sso_consume',{p_hash:ssoHash(url.searchParams.get('code')),p_challenge:ssoChallenge(state.verifier),p_target:origins.target});if(r.error||!r.data)throw new HttpError(403,'SSO_EXPIRED');
  const data=JSON.parse(decryptPrivate(r.data));if(data.central!==origins.central)throw new HttpError(403,'SSO_ENVIRONMENT_DENIED');const client=await createSupabaseServerClient();if(!client)throw new HttpError(503,'SSO_UNAVAILABLE');
  const claims=await client.auth.getClaims(data.access_token),user=await client.auth.getUser(data.access_token);const receipt=validCrmReceipt(data.receipt,{claims:claims.data?.claims,profileId:data.profileId,factors:user.data.user?.factors});if(user.error||claims.error||!receipt)throw new HttpError(403,'SSO_SESSION_INVALID');
  const opaque=ssoToken(),expires=Math.min(claims.data.claims.exp*1000,receipt.expiresAt*1000),session=await securityDb().from('management_sso_sessions').insert({secret_hash:ssoHash(opaque),profile_id:data.profileId,crm_session_id:receipt.id,envelope:encryptPrivate(JSON.stringify({access_token:data.access_token})),expires_at:new Date(expires).toISOString()});if(session.error)throw new HttpError(503,'SSO_UNAVAILABLE');
  jar.set(MANAGEMENT_COOKIE,opaque,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:Math.max(0,Math.floor((expires-Date.now())/1000))});
  jar.set(CRM_COOKIE,data.receipt,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:Math.max(0,receipt.expiresAt-Math.floor(Date.now()/1000))});
  // Chat may previously have been hosted on UAT. Its old opaque identity is
  // unrelated to this production realm and must not shadow the valid bridge.
  jar.set(FEDERATION_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
  jar.set(FEDERATION_STATE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/federation',maxAge:0});
  return redirect(origins.target+landing);
 }
 throw new HttpError(404,'NOT_FOUND');
}catch(e){try{const {action}=await params,target=requestOrigin(request)==='https://agent.reloo.vn'?'agent':'chat',origins=managementOrigins(process.env,target);if(action==='callback'&&requestOrigin(request)===origins.target)return redirect(origins.target+(target==='agent'?'/agent-office':'/chat-control')+'/login?reason=expired');}catch{}return errorResponse(e)}}
