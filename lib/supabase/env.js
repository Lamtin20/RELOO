/**
 * Biến môi trường Supabase — hỗ trợ tên mới (publishable/secret) và tên cũ (anon/service)
 */

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getSupabaseUrl() {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  if (!url) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL (hoặc SUPABASE_URL) trong .env.local');
  }
  return url;
}

export function getSupabaseAnonKey() {
  const key = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
  if (!key) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY (hoặc SUPABASE_PUBLISHABLE_KEY) trong .env.local',
    );
  }
  return key;
}

export function getSupabaseServiceRoleKey() {
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
  if (!key) {
    throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY (hoặc SUPABASE_SECRET_KEY) trong .env.local');
  }
  return key;
}

export function getSupabaseJwksUrl() {
  return readEnv('SUPABASE_JWKS_URL');
}

/** Client-side / API công khai — chỉ cần URL + publishable/anon key */
export function isSupabaseConfigured() {
  try {
    getSupabaseUrl();
    getSupabaseAnonKey();
    return true;
  } catch {
    return false;
  }
}

/** Thao tác server (seed, admin API) — cần secret/service role */
export function isSupabaseAdminConfigured() {
  if (!isSupabaseConfigured()) return false;
  return Boolean(readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'));
}
