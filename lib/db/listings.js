import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';
import {
  mapAssetRow,
  mapPlatformSettings,
  mapProfileRow,
  mapTransactionRow,
} from '@/lib/db/map-from-db';

function getClient() {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error('Supabase chưa cấu hình service role');
  }
  return client;
}

/** Lấy toàn bộ dữ liệu marketplace từ Supabase */
export async function fetchMarketplaceBootstrap() {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, configured: false };
  }

  const client = getClient();

  const [
    { data: profiles, error: profilesError },
    { data: assets, error: assetsError },
    { data: passports, error: passportsError },
    { data: transactions, error: transactionsError },
    { data: settingsRow, error: settingsError },
  ] = await Promise.all([
    client.from('profiles').select('*').order('created_at', { ascending: true }),
    client.from('assets').select('*').order('created_at', { ascending: false }),
    client.from('asset_passports').select('*'),
    client.from('transactions').select('*').order('created_at', { ascending: false }),
    client.from('platform_settings').select('settings').eq('id', 'default').maybeSingle(),
  ]);

  const error =
    profilesError || assetsError || passportsError || transactionsError || settingsError;
  if (error) {
    return { ok: false, configured: true, message: error.message };
  }

  const passportByAsset = new Map((passports ?? []).map((p) => [p.asset_id, p]));

  const listings = (assets ?? [])
    .map((row) => mapAssetRow(row, passportByAsset.get(row.id)))
    .filter(Boolean);

  const users = (profiles ?? []).map(mapProfileRow).filter(Boolean);
  const orders = (transactions ?? []).map(mapTransactionRow).filter(Boolean);
  const settings = mapPlatformSettings(settingsRow);

  return {
    ok: true,
    configured: true,
    listings,
    users,
    orders,
    settings,
    counts: {
      listings: listings.length,
      users: users.length,
      orders: orders.length,
    },
  };
}

/** Lấy một listing kèm passport */
export async function fetchListingById(listingId) {
  if (!isSupabaseAdminConfigured() || !listingId) {
    return null;
  }

  const client = getClient();

  const { data: asset, error } = await client
    .from('assets')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (error || !asset) return null;

  const { data: passport } = await client
    .from('asset_passports')
    .select('*')
    .eq('asset_id', listingId)
    .maybeSingle();

  return mapAssetRow(asset, passport);
}

/** Lấy profile theo id */
export async function fetchProfileById(userId) {
  if (!isSupabaseAdminConfigured() || !userId) return null;

  const client = getClient();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return mapProfileRow(data);
}
