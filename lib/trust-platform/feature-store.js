/**
 * Feature Store — ML-ready feature vectors (demo in-memory)
 */

/**
 * @param {object} ctx
 */
export function buildFeatureVector(ctx) {
  const user = ctx.user ?? {};
  const listing = ctx.listing ?? {};

  return Object.freeze({
    featureId: `feat_${user.id}_${listing.id}_${Date.now()}`,
    userId: user.id,
    assetId: listing.id,
    updatedAt: new Date().toISOString(),
    features: Object.freeze({
      trust_score: ctx.trustScore ?? user.trustScore ?? 0,
      risk_score: ctx.riskScore ?? 0,
      fraud_score: ctx.fraudScore ?? 0,
      identity_verified: ctx.identityProfile?.status === 'VERIFIED' ? 1 : 0,
      kyc_level: user.kycLevel === 'L3' ? 3 : user.kycLevel === 'L2' ? 2 : 1,
      total_rentals: user.totalRentals ?? 0,
      defaults_score: user.defaultsScore ?? 0,
      asset_value: listing.marketValue ?? 0,
      asset_category: listing.category ?? 'unknown',
      rental_days: ctx.rentalContext?.days ?? 1,
      has_insurance: ctx.rentalContext?.relooCarePlan !== 'none' ? 1 : 0,
      is_pro_lender: user.isPro ? 1 : 0,
    }),
  });
}

export function upsertFeatureStore(store, vector) {
  const key = `${vector.userId}:${vector.assetId}`;
  return { ...(store ?? {}), [key]: vector };
}
