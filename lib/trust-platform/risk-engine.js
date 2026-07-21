/**
 * Risk Engine — composite score 0-100
 */

import { RISK_SCORE_RANGE, IDENTITY_STATUS } from './constants';

/**
 * @param {object} ctx
 */
export function computeRiskScore(ctx) {
  const weights = {
    identity: 0.2,
    behavior: 0.15,
    transaction: 0.15,
    asset: 0.1,
    location: 0.05,
    device: 0.05,
    payment: 0.05,
    community: 0.05,
    insurance: 0.05,
    fraud: 0.1,
    ai: 0.05,
  };

  const identityStatus = ctx.identityProfile?.status ?? IDENTITY_STATUS.UNVERIFIED;
  const identityRisk =
    identityStatus === IDENTITY_STATUS.VERIFIED ? 10 : identityStatus === IDENTITY_STATUS.PENDING ? 45 : 70;

  const behaviorRisk = Math.min(100, (ctx.user?.defaultsScore ?? 0) * 0.8 + (ctx.fraudScore ?? 0) * 0.3);

  const assetValue = ctx.listing?.marketValue ?? 0;
  const transactionRisk = assetValue > 20_000_000 ? 55 : assetValue > 5_000_000 ? 35 : 15;

  const assetRisk = ctx.listing?.isLocked ? 90 : ctx.listing?.disputeStatus === 'active' ? 80 : 20;

  const aiRisk = Math.round((ctx.aiPredictions?.rentalRisk ?? 0.2) * 100);

  const components = {
    identity: identityRisk,
    behavior: behaviorRisk,
    transaction: transactionRisk,
    asset: assetRisk,
    location: 25,
    device: 20,
    payment: ctx.user?.bankAccount ? 15 : 40,
    community: ctx.user?.feedbackScore ? 100 - (ctx.user.feedbackScore ?? 50) : 35,
    insurance: ctx.rentalContext?.relooCarePlan === 'none' ? 50 : 20,
    fraud: ctx.fraudScore ?? 0,
    ai: aiRisk,
  };

  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += (components[key] ?? 0) * weight;
  }

  score = Math.round(Math.max(RISK_SCORE_RANGE.min, Math.min(RISK_SCORE_RANGE.max, score)));

  return { score, components, weights };
}
