import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { analyzeVnpt } from '../lib/kyc/vnpt.js';
import { decryptPrivate, encryptPrivate } from '../lib/operations/crypto.js';
const id = process.argv[2];
if (!/^[a-f0-9-]{36}$/i.test(id || '')) throw new Error('SUBMISSION_REQUIRED');
const db = createClient(process.env.SUPABASE_INTERNAL_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession:false } });
const { data:item,error } = await db.from('kyc_submissions').select('id,national_id_encrypted,document_paths,expires_at').eq('id',id).single();
if (error || Date.parse(item.expires_at) <= Date.now()) throw new Error('KYC_UNAVAILABLE');
const images = {};
for (const kind of ['front','back','selfie']) {
  if (item.document_paths[kind] !== `${id}-${kind}.enc`) throw new Error('INVALID_PATH');
  images[kind] = Buffer.from(decryptPrivate(await readFile(join(process.env.RELOO_EVIDENCE_DIR,item.document_paths[kind]),'utf8')),'base64');
}
try {
  const result = await analyzeVnpt({ ...images,claimedId:decryptPrivate(item.national_id_encrypted) });
  await writeFile(join(process.env.RELOO_EVIDENCE_DIR,`${id}-vnpt-check.enc`),encryptPrivate(JSON.stringify(result)),{ mode:0o600,flag:'wx' });
  console.log(JSON.stringify({ ok:true,ocrPresent:!!result.fields.nationalId,similarityPercent:result.face.similarityPercent,checks:result.checks,eligible:result.eligible }));
} catch(cause) { console.log(JSON.stringify({ ok:false,code:cause.code || 'VNPT_FAILED',providerCode:cause.providerCode || null,status:cause.status || null })); process.exitCode=1; }
