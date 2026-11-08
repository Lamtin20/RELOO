import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseServerFetch } from './fetch.js';
import {authCookieOptions} from '../auth/cookie-options.js';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "./env";

/**
 * Supabase client cho Server Components & Route Handlers (anon + cookie session)
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: authCookieOptions(),
    auth: { experimental: { passkey: true } },
    global: {
      fetch: supabaseServerFetch,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component — cookie write có thể bị chặn
        }
      },
    },
  });
}
