/**
 * Seed dữ liệu demo từ seed-data.js lên Supabase
 * Chạy: npm run db:seed
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createSeedState } from '../lib/seed-data.js';
import {
  mapProfile,
  mapIdentityProfile,
  mapCustomerProfile,
  mapAsset,
  mapTransaction,
  mapCmsPage,
  mapLead,
  mapTicket,
  mapRiskAlert,
  mapNotification,
  mapChatThread,
} from '../lib/db/seed-mappers.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');

function loadEnv() {
  if (!existsSync(envPath)) return;
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

async function upsert(client, table, rows, label = table) {
  if (!rows?.length) return 0;
  const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ✓ ${label}: ${rows.length}`);
  return rows.length;
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !serviceKey) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('🌱 RELOO — seed Supabase\n');

const state = createSeedState();

// ─── Profiles & identity ─────────────────────────────────────────────────────

console.log('👤 Users & identity');
await upsert(
  client,
  'profiles',
  state.users.map(mapProfile),
  'profiles',
);
await upsert(
  client,
  'identity_profiles',
  state.identityProfiles.map(mapIdentityProfile),
  'identity_profiles',
);
await upsert(
  client,
  'customer_profiles',
  state.customers.map(mapCustomerProfile),
  'customer_profiles',
);

// ─── Settings ────────────────────────────────────────────────────────────────

console.log('\n⚙️  Platform settings');
const { error: settingsError } = await client.from('platform_settings').upsert(
  {
    id: 'default',
    schema_version: '2026.07.18-ext',
    settings: state.settings,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'id' },
);
if (settingsError) throw new Error(`platform_settings: ${settingsError.message}`);
console.log('  ✓ platform_settings');

// ─── Assets & passports ──────────────────────────────────────────────────────

console.log('\n📦 Listings');
const assets = [];
const passports = [];
for (const listing of state.listings) {
  const mapped = mapAsset(listing);
  assets.push(mapped.asset);
  if (mapped.passport) passports.push(mapped.passport);
}
await upsert(client, 'assets', assets, 'assets');
await upsert(client, 'asset_passports', passports, 'asset_passports');

// ─── Orders & audit ──────────────────────────────────────────────────────────

console.log('\n🧾 Orders');
const transactions = [];
const auditEvents = [];
for (const order of state.orders) {
  const mapped = mapTransaction(order);
  transactions.push(mapped.transaction);
  auditEvents.push(...mapped.auditEvents);
}
await upsert(client, 'transactions', transactions, 'transactions');
await upsert(client, 'audit_events', auditEvents, 'audit_events');

// ─── CMS & FAQ ───────────────────────────────────────────────────────────────

console.log('\n📄 CMS');
const cmsPages = [];
const faqItems = [];
for (const page of state.cmsPages) {
  const mapped = mapCmsPage(page);
  cmsPages.push(mapped.page);
  faqItems.push(...mapped.faqs);
}
await upsert(client, 'cms_pages', cmsPages, 'cms_pages');
await upsert(client, 'faq_items', faqItems, 'faq_items');

// ─── CRM ─────────────────────────────────────────────────────────────────────

console.log('\n🎫 CRM & support');
await upsert(client, 'crm_leads', state.leads.map(mapLead), 'crm_leads');

const tickets = [];
const ticketMessages = [];
for (const t of state.tickets) {
  const mapped = mapTicket(t);
  tickets.push(mapped.ticket);
  ticketMessages.push(...mapped.messages);
}
await upsert(client, 'support_tickets', tickets, 'support_tickets');
await upsert(client, 'ticket_messages', ticketMessages, 'ticket_messages');

await upsert(
  client,
  'risk_alerts',
  state.riskAlerts.map(mapRiskAlert),
  'risk_alerts',
);

// ─── Notifications & chat ────────────────────────────────────────────────────

console.log('\n💬 Chat & notifications');
await upsert(
  client,
  'notifications',
  state.notifications.map(mapNotification),
  'notifications',
);

const chatThreads = [];
const chatMessages = [];
for (const thread of state.chatThreads) {
  const mapped = mapChatThread(thread);
  chatThreads.push(mapped.thread);
  chatMessages.push(...mapped.messages);
}
await upsert(client, 'chat_threads', chatThreads, 'chat_threads');
await upsert(client, 'chat_messages', chatMessages, 'chat_messages');

// ─── Summary ─────────────────────────────────────────────────────────────────

const { count: profileCount } = await client
  .from('profiles')
  .select('*', { count: 'exact', head: true });
const { count: assetCount } = await client
  .from('assets')
  .select('*', { count: 'exact', head: true });
const { count: orderCount } = await client
  .from('transactions')
  .select('*', { count: 'exact', head: true });

console.log('\n✅ Seed hoàn tất');
console.log(`   ${profileCount ?? 0} users · ${assetCount ?? 0} listings · ${orderCount ?? 0} orders`);
