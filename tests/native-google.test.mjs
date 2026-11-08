import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createGoogleNonce, readGoogleNonce, validGoogleIdToken } from '../lib/auth/native-google.js';
import { mobileVerifierHash } from '../lib/mobile/validation.js';

test('Google nonce is encrypted, bound to its flow, time limited and tamper resistant',()=>{
  const previous=process.env.RELOO_PRIVATE_DATA_KEY;
  process.env.RELOO_PRIVATE_DATA_KEY='ab'.repeat(32);
  try {
    const now=1800000000000,flow='12345678-1234-4234-8234-123456789012';
    const item=createGoogleNonce(flow,now),decoded=readGoogleNonce(item.cookie,now);
    assert.equal(decoded.flow,flow);
    assert.equal(decoded.challenge,item.challenge);
    assert.equal(mobileVerifierHash(decoded.nonce),item.challenge);
    assert.ok(!item.cookie.includes(decoded.nonce));
    assert.throws(()=>readGoogleNonce(item.cookie,now+300000),/GOOGLE_NONCE_INVALID/);
    assert.throws(()=>readGoogleNonce(item.cookie,now-1),/GOOGLE_NONCE_INVALID/);
    const buffer=Buffer.from(item.cookie,'base64');buffer[20]^=1;
    assert.throws(()=>readGoogleNonce(buffer.toString('base64'),now),/GOOGLE_NONCE_INVALID/);
    assert.throws(()=>readGoogleNonce(undefined),/GOOGLE_NONCE_INVALID/);
  }finally{if(previous===undefined)delete process.env.RELOO_PRIVATE_DATA_KEY;else process.env.RELOO_PRIVATE_DATA_KEY=previous;}
});
test('only bounded JWT-shaped Google credentials reach the verifier',()=>{
  assert.ok(validGoogleIdToken('eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl'));
  for(const item of [null,{},'bad-token','a.b.', 'a.'.padEnd(13000,'b')+'.c'])assert.equal(validGoogleIdToken(item),false);
});
test('the native flow consumes a nonce once and excludes completed browser flows and expired flows',async()=>{
  const db=new PGlite();try {
    await db.exec('create role anon;create role authenticated;create role service_role;');
    await db.exec(await readFile(new URL('../deploy/vietnam/mobile-auth.sql',import.meta.url),'utf8'));
    const flow='12345678-1234-4234-8234-123456789012',hash='a'.repeat(64);
    await db.query("insert into mobile_auth_flows(id,challenge,next_path,intent) values($1,$2,'/account','both')",[flow,hash]);
    const consume="update mobile_auth_flows set consumed_at=now() where id=$1 and challenge=$2 and consumed_at is null and session_encrypted is null and expires_at>now() returning next_path";
    assert.equal((await db.query(consume,[flow,'b'.repeat(64)])).rows.length,0);
    assert.equal((await db.query(consume,[flow,hash])).rows.length,1);
    assert.equal((await db.query(consume,[flow,hash])).rows.length,0);
    await db.query("update mobile_auth_flows set consumed_at=null,session_encrypted='encrypted-browser-session' where id=$1",[flow]);
    assert.equal((await db.query(consume,[flow,hash])).rows.length,0);
    await db.query("update mobile_auth_flows set session_encrypted=null,expires_at=now()-interval '1 minute' where id=$1",[flow]);
    assert.equal((await db.query(consume,[flow,hash])).rows.length,0);
    await db.exec('set role authenticated');
    await assert.rejects(db.query(consume,[flow,hash]),/permission denied/);
  }finally{await db.close();}
});
