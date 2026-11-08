import {socketCookieToken} from './socket-cookie.js';
import {federatedIdentity} from './federation-identity.js';
import {federationClient} from './federation-policy.js';
export async function socketIdentity(socket,{db,env=process.env,resolveFederation=federatedIdentity}={}){
 if(!db)throw Error('AUTH_NOT_CONFIGURED');
 const headers=socket.handshake.headers||{},host=(headers.host||'').toLowerCase();
 if(env.RELOO_IDENTITY_MODE==='federated-client'){
  if(!federationClient('https://'+host))throw Error('AUTH_REQUIRED');
  return resolveFederation(new Request('https://'+host+'/socket.io',{headers:new Headers({host,cookie:headers.cookie||''})}));
 }
 const token=socket.handshake.auth?.accessToken||socketCookieToken(headers.cookie);
 if(typeof token!=='string'||token.length>10000)throw Error('AUTH_REQUIRED');
 const {data,error}=await db.auth.getUser(token);if(error||!data.user)throw Error('AUTH_REQUIRED');return data.user;
}
