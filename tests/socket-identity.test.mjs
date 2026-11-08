import test from 'node:test';import assert from 'node:assert/strict';
import {socketIdentity} from '../lib/auth/socket-identity.js';
test('federated sockets use opaque server identity and never fall back to local bearer claims',async()=>{
 const socket={handshake:{headers:{host:'staging.reloo.vn',cookie:'reloo-identity-session=opaque-fixture'},auth:{accessToken:'legacy-fixture',profileId:'forged'}}};
 const db={auth:{getUser:()=>{throw Error('Legacy auth must not run')}}};let active=true,calls=0;
 const resolveFederation=async request=>{calls++;assert.equal(request.headers.get('authorization'),null);if(!active)throw Error('REVOKED');return {id:'local-mapped-user'};};
 assert.equal((await socketIdentity(socket,{db,env:{RELOO_IDENTITY_MODE:'federated-client'},resolveFederation})).id,'local-mapped-user');
 active=false;await assert.rejects(socketIdentity(socket,{db,env:{RELOO_IDENTITY_MODE:'federated-client'},resolveFederation}),/REVOKED/);assert.equal(calls,2);
 await assert.rejects(socketIdentity({...socket,handshake:{...socket.handshake,headers:{host:'evil.invalid'}}},{db,env:{RELOO_IDENTITY_MODE:'federated-client'},resolveFederation}),/AUTH_REQUIRED/);
});
test('existing socket identity still verifies the token with Auth when federation is off',async()=>{
 const socket={handshake:{headers:{},auth:{accessToken:'synthetic-fixture'}}},db={auth:{getUser:async token=>{assert.equal(token,'synthetic-fixture');return {data:{user:{id:'verified'}},error:null}}}};
 assert.equal((await socketIdentity(socket,{db,env:{}})).id,'verified');
 await assert.rejects(socketIdentity(socket,{db:{auth:{getUser:async()=>({data:{user:null},error:Error('invalid')})}},env:{}}),/AUTH_REQUIRED/);
});
