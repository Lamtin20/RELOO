import {securityDb} from '../security/service.js';
import {decryptPrivate} from '../operations/crypto.js';
import {HttpError} from '../server/http.js';
import {ssoHash} from './management-sso.js';
import {FEDERATION_COOKIE,FEDERATION_ISSUER,federationClient,federationClientConfigured,federationSecret,federationToken,validFederationAssertion} from './federation-policy.js';
const proofs=new WeakMap();
export const federationProof=user=>proofs.get(user)||null;
export function federationCookie(request){return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(FEDERATION_COOKIE+'='))?.slice(FEDERATION_COOKIE.length+1)||'';}
export function federationOrigin(request){return 'https://'+(request.headers.get('host')||new URL(request.url).host).toLowerCase();}
export async function brokerRequest(action,body,origin,env=process.env){
 if(!['exchange','introspect','revoke'].includes(action)||!federationClientConfigured(origin,env))throw new HttpError(503,'Xác thực trung tâm chưa được cấu hình.','IDENTITY_NOT_CONFIGURED');
 if(env.RELOO_IDENTITY_TRANSPORT&&!['private-bridge','direct'].includes(env.RELOO_IDENTITY_TRANSPORT))throw new HttpError(503,'IDENTITY_TRANSPORT_INVALID');
 const base=env.RELOO_IDENTITY_TRANSPORT==='private-bridge'?'http://reloo-identity-bridge:8080':FEDERATION_ISSUER;
 let r;try{r=await fetch(base+'/api/auth/federation/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+federationSecret(origin,env)},body:JSON.stringify({...body,client:federationClient(origin)}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw new HttpError(503,'Chưa kết nối được CRM trung tâm. Vui lòng thử lại.','IDENTITY_UNAVAILABLE');}
 if(!r.ok){const denied=[401,403].includes(r.status);throw new HttpError(denied?401:503,denied?'Phiên CRM đã hết hiệu lực. Vui lòng đăng nhập lại.':'Chưa kết nối được CRM trung tâm. Vui lòng thử lại.',denied?'AUTH_REQUIRED':'IDENTITY_UNAVAILABLE');}
 const reader=r.body?.getReader();if(!reader)throw new HttpError(503,'IDENTITY_RESPONSE_INVALID');let size=0;const chunks=[];
 try{try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000)throw new HttpError(503,'IDENTITY_RESPONSE_INVALID');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(503,'Chưa nhận được xác nhận từ CRM trung tâm.','IDENTITY_UNAVAILABLE');}
}
export async function federatedIdentity(request){
 const opaque=federationCookie(request);if(!federationToken(opaque))throw new HttpError(401,'AUTH_REQUIRED','AUTH_REQUIRED');
 if(!federationClientConfigured(federationOrigin(request)))throw new HttpError(503,'IDENTITY_NOT_CONFIGURED');
 const origin=federationOrigin(request),db=securityDb(),r=await db.from('federation_local_sessions').select('*').eq('secret_hash',ssoHash(opaque)).eq('client',federationClient(origin)).gt('expires_at',new Date().toISOString()).is('revoked_at',null).maybeSingle();
 if(r.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');if(!r.data)throw new HttpError(401,'AUTH_REQUIRED','AUTH_REQUIRED');
 const row=r.data,remote=await brokerRequest('introspect',{reference:decryptPrivate(row.upstream_reference)},origin);
 if(!validFederationAssertion(remote,{client:federationClient(origin),subject:row.issuer_subject}))throw new HttpError(401,'IDENTITY_ASSERTION_INVALID','AUTH_REQUIRED');
 const mapping=await db.from('federation_identities').select('profile_id').eq('issuer',FEDERATION_ISSUER).eq('issuer_subject',remote.subject).eq('profile_id',row.profile_id).eq('enabled',true).maybeSingle();
 if(mapping.error)throw new HttpError(503,'IDENTITY_MAPPING_UNAVAILABLE');if(!mapping.data)throw new HttpError(403,'Tài khoản chưa được cấp quyền tại công cụ này.','IDENTITY_MAPPING_REQUIRED');
 const profile=await db.from('profiles').select('auth_user_id,deleted_at').eq('id',row.profile_id).maybeSingle();
 if(profile.error)throw new HttpError(503,'IDENTITY_PROFILE_UNAVAILABLE');if(!profile.data?.auth_user_id||profile.data.deleted_at)throw new HttpError(401,'AUTH_REQUIRED','AUTH_REQUIRED');
 const user=await db.auth.admin.getUserById(profile.data.auth_user_id);
 if(user.error||!user.data.user||user.data.user.banned_until&&Date.parse(user.data.user.banned_until)>Date.now())throw new HttpError(401,'AUTH_REQUIRED','AUTH_REQUIRED');
 const authUser=user.data.user;proofs.set(authUser,{...remote,expiresAt:Math.min(remote.expiresAt,Date.parse(row.expires_at)),localSession:ssoHash(opaque)});return authUser;
}
export async function revokeFederation(request){
 const opaque=federationCookie(request);if(!federationToken(opaque))return;
 if(!federationClientConfigured(federationOrigin(request)))return;
 const db=securityDb(),r=await db.from('federation_local_sessions').select('upstream_reference').eq('secret_hash',ssoHash(opaque)).maybeSingle();
 if(r.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');
 if(r.data)await brokerRequest('revoke',{reference:decryptPrivate(r.data.upstream_reference)},federationOrigin(request));
 const updated=await db.from('federation_local_sessions').update({revoked_at:new Date().toISOString()}).eq('secret_hash',ssoHash(opaque));if(updated.error)throw new HttpError(503,'IDENTITY_STORAGE_UNAVAILABLE');
}
