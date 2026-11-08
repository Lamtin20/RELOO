import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVnpt } from '../lib/kyc/vnpt.js';

test('successful uploads followed by a denied OCR request report OCR and never return a verified identity', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(new URL(url).pathname);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    if (url.endsWith('/addFile')) return Response.json({ message: 'IDG-00000000', object: { hash: 'test-upload-hash' } });
    return Response.json({ message: 'IDG-00000401' }, { status: 401 });
  });
  await assert.rejects(analyzeVnpt({ front: Buffer.from('front'), back: Buffer.from('back'), selfie: Buffer.from('portrait') }, { VNPT_TOKEN_ID:'test-id', VNPT_TOKEN_KEY:'test-key', VNPT_ACCESS_TOKEN:'bearer test-token' }), error => {
    assert.equal(error.code, 'VNPT_AUTH_REQUIRED');
    assert.equal(error.stage, 'OCR');
    assert.equal(error.providerCode, 'IDG-00000401');
    return true;
  });
  assert.equal(calls.filter(path => path.endsWith('/addFile')).length, 3);
  assert.equal(calls.at(-1), '/ai/v1/ocr/id');
  assert.ok(!calls.includes('/ai/v1/face/compare'));
});
