import test from 'node:test';import assert from 'node:assert/strict';
import {authCookieOptions,legacyAuthCookieHeaders} from '../lib/auth/cookie-options.js';
import {createSmartReceipt,validSmartReceipt} from '../lib/security/smart-key-session.js';
import {passkeySetFactor} from '../lib/security/device-factor.js';
process.env.RELOO_PRIVATE_DATA_KEY='61'.repeat(32);
test('persistent cookies are HttpOnly and host-only; legacy parent-domain copies are expired without discarding the replacement',()=>{
 const options=authCookieOptions({NODE_ENV:'production',RELOO_COOKIE_DOMAIN:'.reloo.vn'});assert.equal(options.domain,undefined);assert.equal(options.httpOnly,true);assert.equal(options.maxAge,31536000);
 const headers=legacyAuthCookieHeaders([{name:'sb-auth-auth-token.0'},{name:'sb-auth-auth-token.1'},{name:'reloo-preference'},{name:'bad; Path=/'}],'reloo.vn');assert.equal(headers.length,2);assert.ok(headers.every(h=>h.includes('Domain=reloo.vn; Max-Age=0')));assert.deepEqual(legacyAuthCookieHeaders([{name:'sb-auth-auth-token'}],'evil.invalid'),[]);
});
test('PIN and device confirmations remain bound to account/session, factor revision, signature, expiry and existing TOTP assurance',()=>{
 const now=Date.now(),claims={sub:'user-a',session_id:'session-a',aal:'aal1',exp:Math.floor(now/1000)+3600},context={claims,profileId:'profile-a',factors:[]};
 for(const [method,factorId]of [['PIN','PIN:4'],['PASSKEY',passkeySetFactor([{id:'key-one'}])]]){
 const receipt=createSmartReceipt({subject:'user-a',profileId:'profile-a',sessionId:'session-a',factorId,method},now),ctx={...context,deviceFactor:factorId};assert.ok(validSmartReceipt(receipt.value,ctx,now));
 for(const changed of [{...ctx,deviceFactor:factorId+'new'},{...ctx,profileId:'other'},{...ctx,claims:{...claims,session_id:'session-other'}},{...ctx,claims:{...claims,sub:'other'}},{...ctx,factors:[{id:'totp',factor_type:'totp',status:'verified'}]}])assert.equal(validSmartReceipt(receipt.value,changed,now),null);
 assert.equal(validSmartReceipt(receipt.value,ctx,now+900001),null);assert.equal(validSmartReceipt(receipt.value+'x',ctx,now),null);
 }
 assert.equal(passkeySetFactor([{id:'a'},{id:'b'}]),passkeySetFactor([{id:'b'},{id:'a'}]));assert.notEqual(passkeySetFactor([{id:'a'}]),passkeySetFactor([{id:'b'}]));
 const receipt=createSmartReceipt({subject:'user-a',profileId:'profile-a',sessionId:'session-a',factorId:'totp'});assert.equal(validSmartReceipt(receipt.value,{...context,factors:[{id:'totp',factor_type:'totp',status:'verified'}]}),null);assert.ok(validSmartReceipt(receipt.value,{...context,claims:{...claims,aal:'aal2'},factors:[{id:'totp',factor_type:'totp',status:'verified'}]}));
});
