import {marketplaceAsset,isPublicMarketplaceAsset} from '../catalog/public-listing.js';
import { createSupabaseAdminClient } from '../supabase/admin.js';
import { isSupabaseAdminConfigured } from '../supabase/env.js';
import {
  mapAssetRow,
  mapPlatformSettings,
  mapProfileRow,
  mapTransactionRow,
} from './map-from-db.js';

function getClient() {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error('Supabase chưa cấu hình service role');
  }
  return client;
}

/** Lấy toàn bộ dữ liệu marketplace từ Supabase */
export async function fetchMarketplaceBootstrap(viewerId=null,canModerate=false) {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, configured: false };
  }

  return readMarketplaceBootstrap(getClient(),viewerId,canModerate);
}
export async function readMarketplaceBootstrap(client,viewerId=null,canModerate=false){
  const [
    { data: profiles, error: profilesError },
    { data: assets, error: assetsError },
    { data: passports, error: passportsError },
    { data: transactions, error: transactionsError },
    { data: settingsRow, error: settingsError },
  ] = await Promise.all([
    client.from('profiles').select('id,name,avatar_url,role,kyc_level,trust_score,created_at').order('created_at', { ascending: true }),
    client.from('assets').select('*').order('created_at', { ascending: false }),
    client.from('asset_passports').select('*'),
    viewerId ? client.from('transactions').select('*').or(`renter_id.eq.${viewerId},lender_id.eq.${viewerId}`).order('created_at', { ascending: false }) : Promise.resolve({data:[],error:null}),
    client.from('platform_settings').select('settings').eq('id', 'default').maybeSingle(),
  ]);

  const error =
    profilesError || assetsError || passportsError || transactionsError || settingsError;
  if (error) {
    return { ok: false, configured: true, message: error.message };
  }

  const relatedAssets=new Set((transactions||[]).map(order=>order.asset_id));
  const passportByAsset = new Map((passports ?? []).map((p) => [p.asset_id, p]));

  const listings = (assets ?? [])
    .map((row) => marketplaceAsset(row, passportByAsset.get(row.id),{viewerId,canModerate,canViewRelated:relatedAssets.has(row.id)}))
    .filter(Boolean);

  const users = (profiles ?? []).map(mapPublicProfile).filter(Boolean);
  const orders = (transactions ?? []).map(mapTransactionRow).filter(Boolean);
  const settings = mapPlatformSettings(settingsRow);

  return {
    ok: true,
    configured: true,
    viewerId,
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
export async function fetchListingById(listingId,viewerId=null,canModerate=false) {
  if (!isSupabaseAdminConfigured() || !listingId) {
    return null;
  }

  return readMarketplaceListing(getClient(),listingId,viewerId,canModerate);
}
export async function readMarketplaceListing(client,listingId,viewerId=null,canModerate=false){

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

  let canViewRelated=false;
  if(viewerId&&asset.owner_id!==viewerId&&!canModerate&&!isPublicMarketplaceAsset(asset)){const related=await client.from('transactions').select('id',{count:'exact',head:true}).eq('asset_id',asset.id).or(`renter_id.eq.${viewerId},lender_id.eq.${viewerId}`);canViewRelated=!related.error&&related.count>0;}
  return marketplaceAsset(asset, passport,{viewerId,canModerate,canViewRelated});
}

/** Lấy profile theo id */
export async function fetchProfileById(userId) {
  if (!isSupabaseAdminConfigured() || !userId) return null;

  const client = getClient();
  const { data, error } = await client.from('profiles').select('id,name,avatar_url,role,kyc_level,trust_score,created_at').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return mapPublicProfile(data);
}

function mapPublicProfile(row) {
  if(!row)return null;
  return { id:row.id,name:row.name,avatar:row.avatar_url||'/brand/reloo-logo.png',role:row.role==='admin'?'renter':row.role,kycLevel:row.kyc_level,trustScore:row.trust_score,joinedAt:row.created_at };
}
