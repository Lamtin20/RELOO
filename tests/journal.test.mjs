import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {sealEntry,verifyHistory} from '../lib/assurance/journal.js';
import {validateEvmConfig} from '../lib/assurance/evm.js';
test('signed history detects changed price, signatures, deleted entries and another stream',()=>{
  const key=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64'),streamId='00000000-0000-4000-8000-000000000001';
  const first=sealEntry({streamId,sequence:1,event:'PROPOSED',previousHash:'0'.repeat(64),payload:{rent:'600000'},recordedAt:new Date().toISOString()},key);
  const second=sealEntry({streamId,sequence:2,event:'ACCEPTED',previousHash:first.hash,payload:{accepted:true},recordedAt:new Date().toISOString()},key);
  const keys={[first.keyId]:first.publicKey};assert.equal(verifyHistory([first,second],keys).ok,true);
  const changed=structuredClone(first);changed.privatePayload.payload.rent='1';assert.equal(verifyHistory([changed,second],keys).code,'PAYLOAD_CHANGED');
  const forged=structuredClone(first);forged.signature=Buffer.alloc(64).toString('base64');assert.equal(verifyHistory([forged],keys).code,'SIGNATURE_INVALID');
  assert.equal(verifyHistory([second],keys).ok,false);
  assert.equal(verifyHistory([first],keys,{count:2,head:second.hash}).code,'CHECKPOINT_MISMATCH');
  const reordered=sealEntry({streamId:'00000000-0000-4000-8000-000000000002',sequence:2,event:'ACCEPTED',previousHash:first.hash,payload:{accepted:true},recordedAt:new Date().toISOString()},key);assert.equal(verifyHistory([first,reordered],keys).ok,false);
});
test('EVM cannot anchor without credentials or to a wrong/unsafe network configuration',()=>{
  assert.throws(()=>validateEvmConfig({}),/EVM_NOT_CONFIGURED/);
  const fixture={EVM_RPC_URL:'https://rpc.example.org/',EVM_PRIVATE_KEY:'0x'+'1'.repeat(64),chainId:1,contractAddress:'0x'+'1'.repeat(40),confirmations:3};
  assert.equal(validateEvmConfig(fixture).confirmations,3);assert.throws(()=>validateEvmConfig({...fixture,EVM_RPC_URL:'http://127.0.0.1/'}));assert.throws(()=>validateEvmConfig({...fixture,chainId:0}));assert.throws(()=>validateEvmConfig({...fixture,confirmations:0}));
});
