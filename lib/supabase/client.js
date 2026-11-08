'use client';


/**
 * Supabase client cho Client Components (anon key, RLS)
 */
export function createSupabaseBrowserClient() {
  // Auth tokens are now server-managed HttpOnly cookies. Browser code uses /api/auth/*.
  return null;
}
