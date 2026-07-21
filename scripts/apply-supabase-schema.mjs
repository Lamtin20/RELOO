/**
 * Áp dụng migration SQL lên Supabase PostgreSQL
 * Chạy: npm run db:migrate
 *
 * Cần SUPABASE_DB_PASSWORD (hoặc SUPABASE_DB_URL) trong .env.local
 * Lấy tại: Supabase Dashboard → Project Settings → Database → Database password
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
const migrationsDir = resolve(root, 'supabase', 'migrations');

const PROJECT_REF = 'fdskbdcuwuabmtzytopq';
const DEFAULT_POOLER_HOST = 'aws-0-ap-northeast-1.pooler.supabase.com';

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

function getPgClient() {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (dbUrl) {
    return new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  }

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      'Thiếu SUPABASE_DB_PASSWORD hoặc SUPABASE_DB_URL trong .env.local.\n' +
        'Lấy mật khẩu tại: Supabase Dashboard → Settings → Database → Database password',
    );
  }

  const host = process.env.SUPABASE_DB_HOST?.trim() || DEFAULT_POOLER_HOST;
  const port = Number(process.env.SUPABASE_DB_PORT || 5432);

  return new pg.Client({
    host,
    port,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
}

function listMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

loadEnv();

const files = listMigrationFiles();
console.log(`📂 ${files.length} migration file(s)`);

const client = getPgClient();

try {
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL\n');

  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
    console.log(`▶ Applying ${file}...`);
    await client.query(sql);
    console.log(`  ✓ Done\n`);
  }

  const { rows } = await client.query(
    "select schema_version from public.platform_settings where id = 'default'",
  );
  console.log(`📦 Schema version: ${rows[0]?.schema_version ?? 'unknown'}`);
  console.log('\n✅ Tất cả migration đã áp dụng thành công.');
} catch (err) {
  console.error('\n❌ Migration thất bại:', err.message);
  if (err.message.includes('password authentication failed')) {
    console.error('\n💡 Kiểm tra lại SUPABASE_DB_PASSWORD trong .env.local');
    console.error('   Dashboard → Settings → Database → Reset database password nếu quên');
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
