import { createClient } from "@supabase/supabase-js";
import { supabaseServerFetch } from './fetch.js';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from "./env.js";

let adminClient;
let adminUrl;
let adminKey;

/**
 * Service role — chỉ dùng server-side (API route, script seed).
 * Bỏ qua RLS; không expose ra client.
 */
export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const url = getSupabaseUrl(),
    key = getSupabaseServiceRoleKey();
  if (!adminClient || adminUrl !== url || adminKey !== key) {
    adminUrl = url;
    adminKey = key;
    adminClient = createClient(url, key, {
      global: {
        fetch: supabaseServerFetch,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
