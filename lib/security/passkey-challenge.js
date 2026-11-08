import {timingSafeEqual} from 'node:crypto';
import {privateHash} from '../operations/crypto.js';
export function sealPasskeyChallenge(data,now=Date.now()){const payload=Buffer.from(JSON.stringify({...data,expires:now+300000})).toString('base64url');return payload+'.'+privateHash('PASSKEY_CHALLENGE',payload);}
export function openPasskeyChallenge(value,expected,now=Date.now()){
 try{if(typeof value!=='string'||value.length>3000)return null;const [payload,signature]=value.split('.');const digest=privateHash('PASSKEY_CHALLENGE',payload);if(!/^[a-f0-9]{64}$/.test(signature||'')||!timingSafeEqual(Buffer.from(signature),Buffer.from(digest)))return null;const data=JSON.parse(Buffer.from(payload,'base64url').toString());if(data.expires<=now||data.expires>now+300000)return null;return Object.entries(expected).every(([key,value])=>data[key]===value)?data:null;}catch{return null;}
}
export function userVerifiedAssertion(credential){try{const bytes=Buffer.from(credential?.response?.authenticatorData||'','base64url');return bytes.length>=37&&(bytes[32]&5)===5;}catch{return false;}}
