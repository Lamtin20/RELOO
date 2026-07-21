/**
 * Kiểm tra tất cả bảng RELOO trên Supabase
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

const CORE_TABLES = [
  'profiles', 'identity_profiles', 'assets', 'asset_passports',
  'transactions', 'transaction_timelines', 'chronicle', 'audit_events',
  'behavior_logs', 'decision_logs', 'cms_pages', 'platform_settings',
];

const EXT_TABLES = [
  'chat_threads', 'chat_messages', 'notifications', 'crm_leads',
  'support_tickets', 'ticket_messages', 'risk_alerts', 'faq_items',
  'listing_reviews', 'wallet_ledger', 'customer_profiles',
  'customer_bank_accounts', 'customer_audit_logs', 'session_replay_events',
];

const TABLES = [...CORE_TABLES, ...EXT_TABLES];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const client = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function tableExists(table) {
  const { error } = await client.from(table).select('*').limit(1);
  if (!error) return true;
  return error.code !== 'PGRST205';
}

const missing = [];
for (const table of TABLES) {
  const ok = await tableExists(table);
  if (ok) {
    console.log(`✅ ${table}`);
  } else {
    console.log(`❌ ${table}`);
    missing.push(table);
  }
}

console.log('\n---');
if (missing.length === 0) {
  console.log(`✅ Đủ ${TABLES.length} bảng.`);
  process.exit(0);
}

console.log(`⚠️  Thiếu ${missing.length}/${TABLES.length} bảng`);
console.log('   Chạy: npm run db:migrate');
process.exit(1);
