import pg from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

process.loadEnvFile(resolve(".env.local"));
const ref = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
).hostname.split(".")[0];
if (!process.env.SUPABASE_DB_URL && !new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL).hostname.endsWith('.supabase.co')) throw new Error('Self-hosted migrations require an explicit private database connection; use the homelab psql procedure.');
const client = new pg.Client(
  process.env.SUPABASE_DB_URL
    ? {
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      }
    : {
        host:
          process.env.SUPABASE_DB_HOST ||
          "aws-0-ap-northeast-1.pooler.supabase.com",
        port: Number(process.env.SUPABASE_DB_PORT || 5432),
        user: `postgres.${ref}`,
        database: "postgres",
        password: process.env.SUPABASE_DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      },
);
const filenames = [
  "20261008010000_security_commerce.sql",
  "20261009090000_auth_onboarding.sql",
  "20261009120000_market_data.sql",
];
const checkOnly = process.argv.includes("--check");
try {
  await client.connect();
  await client.query("begin");
  await client.query(
    "select pg_advisory_xact_lock(hashtext('reloo-feature-migrations'))",
  );
  await client.query(
    "create table if not exists public.reloo_feature_migrations(name text primary key,applied_at timestamptz not null default now()); alter table public.reloo_feature_migrations enable row level security; revoke all on public.reloo_feature_migrations from anon, authenticated;",
  );
  for (const filename of filenames) {
    const prior = await client.query(
      "select name from public.reloo_feature_migrations where name=$1",
      [filename],
    );
    if (!prior.rowCount) {
      await client.query(
        await readFile(resolve("supabase/migrations", filename), "utf8"),
      );
      await client.query(
        "insert into public.reloo_feature_migrations(name) values($1)",
        [filename],
      );
      console.log(`${checkOnly ? "Validated" : "Applied"} ${filename}.`);
    } else console.log(`${filename} already applied.`);
  }
  await client.query(checkOnly ? "rollback" : "commit");
  if (checkOnly)
    console.log("Migration dry run passed; all changes rolled back.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  const message = String(error.message)
    .replaceAll(process.env.SUPABASE_DB_PASSWORD || "\0", "[redacted]")
    .slice(0, 500);
  console.error(
    `Migration failed: ${error.code || error.name}: ${message}. No transaction committed.`,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
