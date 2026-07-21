/**
 * Kiểm tra kết nối Supabase — đọc .env.local
 * Chạy: npm run db:check
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anonKey) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong .env.local');
  console.error('   Xem hướng dẫn: docs/SUPABASE_SETUP.md');
  process.exit(1);
}

const key = serviceKey || anonKey;
const client = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function tableExists(table) {
  const { error } = await client.from(table).select('*').limit(1);
  if (!error) return { ok: true };
  if (error.code === 'PGRST205') return { ok: false, error: 'Bảng chưa tồn tại' };
  return { ok: false, error: error.message };
}

console.log(`🔗 Supabase URL: ${url}`);
console.log(`🔑 Key: ${serviceKey ? 'service role' : 'anon'}`);

const tables = ['profiles', 'assets', 'transactions', 'chronicle', 'platform_settings'];
let allOk = true;

for (const table of tables) {
  const result = await tableExists(table);
  if (result.ok) {
    console.log(`✅ ${table}`);
  } else {
    allOk = false;
    console.error(`❌ ${table}: ${result.error}`);
  }
}

if (allOk) {
  const { data: settings } = await client
    .from('platform_settings')
    .select('schema_version')
    .eq('id', 'default')
    .maybeSingle();
  if (settings?.schema_version) {
    console.log(`📦 Schema version: ${settings.schema_version}`);
  }
  console.log('\n✅ Supabase kết nối thành công — schema sẵn sàng.');
  process.exit(0);
}

console.error('\n⚠️  Chưa có bảng — chạy: npm run db:migrate');
console.error('   (cần SUPABASE_DB_PASSWORD trong .env.local)');
console.error('   Hoặc dán SQL: supabase/full_schema.sql vào Supabase SQL Editor');
process.exit(1);
