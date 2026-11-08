import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseIdentityQr} from '../lib/kyc/qr.js';

const sample='099000000001|123456789|Người Thử Nghiệm|01011990|Nam|Địa chỉ thử nghiệm|01012024';
test('issued card QR accepts reserved empty trailing fields without changing identity data',()=>{
 const expected=parseIdentityQr(sample);
 for(const suffix of ['|','||||','| | | | '])assert.deepEqual(parseIdentityQr(sample+suffix),expected);
 assert.equal(expected.verified,false);
 assert.equal(expected.nationalId,'099000000001');
});
test('non-empty extensions and missing required fields are never silently discarded',()=>{
 for(const raw of [sample+'|unexpected||||',sample+'||||unexpected',sample.replace('01011990','31021990'),sample.replace('|Nam|','||'),sample.slice(0,sample.lastIndexOf('|'))])assert.throws(()=>parseIdentityQr(raw));
});
test('self-hosted QR reader matches the pinned package binary',async()=>{
 const paths=['../public/vision/zxing_reader-3.1.6.wasm','../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm'];
 const hashes=await Promise.all(paths.map(async path=>createHash('sha256').update(await readFile(new URL(path,import.meta.url))).digest('hex')));
 assert.equal(hashes[0],hashes[1]);
});
