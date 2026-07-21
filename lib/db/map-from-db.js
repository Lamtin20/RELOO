/**
 * Map Supabase rows → định dạng app (seed-data compatible)
 */

export function mapProfileRow(row) {
  if (!row) return null;
  const extra = row.profile_data ?? {};
  return {
    ...extra,
    id: row.id,
    email: row.email,
    phone: row.phone,
    name: row.name,
    avatar: row.avatar_url ?? extra.avatar,
    role: row.role,
    kycLevel: row.kyc_level ?? extra.kycLevel ?? 'L0',
    trustScore: row.trust_score ?? extra.trustScore ?? 0,
  };
}

export function mapAssetRow(row, passport) {
  if (!row) return null;
  const extra = row.listing_data ?? {};

  return {
    ...extra,
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    images: row.images ?? [],
    dailyPrice: Number(row.daily_price),
    marketValue: Number(row.market_value),
    location: row.location ?? '',
    locationDetails: row.location_details ?? {},
    ownerId: row.owner_id,
    nftPassport: passport
      ? {
          id: passport.nft_token_id ?? passport.id,
          hash: passport.chain_hash ?? '',
          residualValue: passport.residual_value != null ? Number(passport.residual_value) : null,
          auditCount: passport.audit_count ?? 0,
          mintedAt: passport.minted_at,
        }
      : extra.nftPassport ?? null,
    trustBadges: row.trust_badges ?? [],
    labels: row.labels ?? [],
    rating: row.rating != null ? Number(row.rating) : null,
    reviewCount: row.review_count ?? 0,
    condition: row.condition,
    status: row.status,
    isBoosted: row.is_boosted ?? false,
    createdAt: row.created_at,
    viewCount: row.view_count ?? 0,
    specs: row.specs ?? {},
  };
}

export function mapTransactionRow(row) {
  if (!row) return null;
  const extra = row.order_data ?? {};

  return {
    ...extra,
    id: row.id,
    listingId: row.asset_id,
    renterId: row.renter_id,
    lenderId: row.lender_id,
    status: row.status,
    days: row.days,
    dailyPrice: Number(row.daily_price),
    rentalTotal: Number(row.rental_total),
    platformFee: Number(row.platform_fee),
    relooCareFee: Number(row.reloo_care_fee),
    relooCarePlan: row.reloo_care_plan,
    deposit: Number(row.deposit_amount),
    shippingFee: Number(row.shipping_fee),
    grandTotal: Number(row.grand_total),
    startDate: row.start_date ? `${row.start_date}T00:00:00.000Z` : extra.startDate,
    endDate: row.end_date ? `${row.end_date}T00:00:00.000Z` : extra.endDate,
    createdAt: row.created_at ?? extra.createdAt,
  };
}

export function mapPlatformSettings(row) {
  if (!row?.settings) return null;
  return row.settings;
}
