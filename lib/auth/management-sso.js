import {randomBytes,createHash} from 'node:crypto';
export const SSO_COOKIE='reloo-management-sso';
export const ssoToken=()=>randomBytes(32).toString('base64url');
export const ssoHash=value=>createHash('sha256').update(value).digest('hex');
export const ssoChallenge=value=>createHash('sha256').update(value).digest('base64url');
export {validSsoToken,ssoAuthorizePath,validSsoState} from './management-sso-policy.js';
export function managementOrigins(env=process.env,target='chat'){
 const targetOrigin=target==='agent'&&env.RELOO_AGENT_OFFICE_HOST==='agent.reloo.vn'?'https://agent.reloo.vn':target==='chat'?'https://chat.reloo.vn':null;
 if(!targetOrigin)throw Error('SSO_TARGET_NOT_CONFIGURED');
 if(env.RELOO_CHAT_CONTROL_HOST!=='chat.reloo.vn')throw Error('SSO_NOT_CONFIGURED');
 if(env.RELOO_ENVIRONMENT==='staging'&&env.CRM_ORIGIN==='https://staging.reloo.vn'&&env.APP_ORIGIN==='https://staging.reloo.vn')return {central:env.CRM_ORIGIN,target:targetOrigin};
 if(env.RELOO_MANAGEMENT_SSO==='production'&&env.CRM_ORIGIN==='https://crm.reloo.vn'&&env.APP_ORIGIN==='https://reloo.vn'&&env.RELOO_ENVIRONMENT!=='staging')return {central:env.CRM_ORIGIN,target:targetOrigin};
 throw Error('SSO_NOT_CONFIGURED');
}
