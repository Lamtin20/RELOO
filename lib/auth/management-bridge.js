import {securityDb} from '../security/service.js';
import {requireAccount} from '../security/authorization.js';
import {decryptPrivate} from '../operations/crypto.js';
import {HttpError} from '../server/http.js';
import {ssoHash,validSsoToken} from './management-sso.js';
export const MANAGEMENT_COOKIE='reloo-management-session';
export function managementCookie(request){return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(MANAGEMENT_COOKIE+'='))?.slice(MANAGEMENT_COOKIE.length+1)||'';}
export async function managementBridgeAccount(request){
 const token=managementCookie(request);if(!validSsoToken(token))throw new HttpError(401,'AUTH_REQUIRED','AUTH_REQUIRED');
 const r=await securityDb().from('management_sso_sessions').select('profile_id,envelope,expires_at,crm_mfa_sessions(expires_at,revoked_at)').eq('secret_hash',ssoHash(token)).gt('expires_at',new Date().toISOString()).maybeSingle();if(r.error)throw new HttpError(503,'SSO_UNAVAILABLE');
 const row=r.data;if(!row||row.crm_mfa_sessions?.revoked_at||!row.crm_mfa_sessions||Date.parse(row.crm_mfa_sessions.expires_at)<=Date.now())throw new HttpError(401,'AUTH_REQUIRED','AUTH_REQUIRED');
 const payload=JSON.parse(decryptPrivate(row.envelope)),headers=new Headers(request.headers);headers.set('authorization','Bearer '+payload.access_token);
 const account=await requireAccount(new Request(request.url,{headers}),{active:false});if(account.profile.id!==row.profile_id)throw new HttpError(401,'AUTH_REQUIRED','AUTH_REQUIRED');return {...account,ssoAccessToken:payload.access_token};
}
