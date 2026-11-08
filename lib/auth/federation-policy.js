export const FEDERATION_ISSUER='https://crm.reloo.vn';
export const FEDERATION_CLIENTS={staging:'https://staging.reloo.vn',chat:'https://chat.reloo.vn',agent:'https://agent.reloo.vn'};
export const FEDERATION_COOKIE='reloo-identity-session';
export const FEDERATION_STATE='reloo-identity-state';
export const federationToken=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
export function federationClient(origin){return Object.keys(FEDERATION_CLIENTS).find(k=>FEDERATION_CLIENTS[k]===origin)||null;}
export function federationNext(value,origin){try{if(typeof value!=='string'||value.length>1800||!value.startsWith('/')||/[\\\u0000-\u001f]/.test(value))return '/';const u=new URL(value,origin),decoded=decodeURIComponent(u.pathname);if(u.origin!==origin||decoded.startsWith('//')||/[\\\u0000-\u001f]/.test(decoded)||/^\/(?:api|uat)(?:\/|$)/.test(decoded))return '/';return u.pathname+u.search;}catch{return '/'}}
export function federationAuthorizePath(value){try{
 if(typeof value!=='string'||!value.startsWith('/api/auth/federation/authorize?'))return null;
 const u=new URL(value,FEDERATION_ISSUER),q=u.searchParams;
 if(u.hash||u.pathname!=='/api/auth/federation/authorize'||[...q.keys()].some(k=>!['state','challenge','client'].includes(k))||['state','challenge','client'].some(k=>q.getAll(k).length!==1)||!federationToken(q.get('state'))||!federationToken(q.get('challenge'))||!Object.hasOwn(FEDERATION_CLIENTS,q.get('client')))return null;
 return u.pathname+'?'+new URLSearchParams({state:q.get('state'),challenge:q.get('challenge'),client:q.get('client')});
}catch{return null}}
export function validFederationAssertion(value,{client,subject,now=Date.now()}={}){
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 return !!value&&value.issuer===FEDERATION_ISSUER&&value.client===client&&uuid.test(value.subject||'')&&(!subject||value.subject===subject)&&value.mfa===true&&uuid.test(value.receipt||'')&&Number.isInteger(value.expiresAt)&&value.expiresAt>now&&value.expiresAt<=now+8*3600000;
}
export function federationSecret(origin,env=process.env){const client=federationClient(origin);if(!client)return null;const value=env['RELOO_IDENTITY_'+client.toUpperCase()+'_SECRET'];return /^[a-f0-9]{64}$/i.test(value||'')?value:null;}
export function federationClientConfigured(origin,env=process.env){return env.RELOO_IDENTITY_MODE==='federated-client'&&env.RELOO_IDENTITY_ISSUER===FEDERATION_ISSUER&&!!federationSecret(origin,env);}
export function federationConfigurationProblems(env){
 const errors=[];if(!env.RELOO_IDENTITY_MODE)return errors;
 if(env.RELOO_IDENTITY_MODE!=='federated-client')return ['STAGING_IDENTITY_MODE_INVALID'];
 if(env.RELOO_IDENTITY_ISSUER!==FEDERATION_ISSUER)errors.push('IDENTITY_ISSUER_INVALID');
 if(env.RELOO_IDENTITY_TRANSPORT!=='private-bridge')errors.push('IDENTITY_PRIVATE_BRIDGE_REQUIRED');
 for(const client of ['staging',...(env.RELOO_CHAT_CONTROL_HOST?['chat']:[]),...(env.RELOO_AGENT_OFFICE_HOST?['agent']:[])])if(!federationSecret(FEDERATION_CLIENTS[client],env))errors.push('IDENTITY_'+client.toUpperCase()+'_SECRET_REQUIRED');
 return errors;
}
