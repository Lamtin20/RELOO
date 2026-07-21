import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '@/lib/supabase/env';

function getCheckClient() {
  const admin = createSupabaseAdminClient();
  if (admin) return admin;

  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Kiểm tra kết nối Supabase + schema đã migrate chưa
 */
export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      configured: false,
      message: 'Chưa cấu hình NEXT_PUBLIC_SUPABASE_URL / ANON_KEY',
      tables: {},
    };
  }

  let client;
  try {
    client = getCheckClient();
  } catch (err) {
    return {
      ok: false,
      configured: true,
      message: err instanceof Error ? err.message : 'Không tạo được Supabase client',
      tables: {},
    };
  }

  const tableNames = ['profiles', 'assets', 'transactions', 'chronicle'];
  const tables = {};
  let schemaReady = true;

  for (const table of tableNames) {
    const { error } = await client.from(table).select('*', { head: true, count: 'exact' });

    if (error) {
      schemaReady = false;
      tables[table] = {
        ok: false,
        error: error.message,
        hint: error.hint ?? null,
      };
    } else {
      tables[table] = { ok: true };
    }
  }

  const { data: versionRow, error: versionError } = await client
    .from('platform_settings')
    .select('schema_version')
    .eq('id', 'default')
    .maybeSingle();

  return {
    ok: schemaReady && !versionError,
    configured: true,
    admin: isSupabaseAdminConfigured(),
    schemaReady,
    schemaVersion: versionRow?.schema_version ?? null,
    message: schemaReady
      ? 'Kết nối Supabase OK'
      : 'Đã kết nối nhưng chưa chạy migration — xem docs/SUPABASE_SETUP.md',
    tables,
    versionError: versionError?.message ?? null,
  };
}
