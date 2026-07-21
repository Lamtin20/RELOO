/**
 * Deposit Engine — dynamic deposit (no hard rules)
 * AI suggests; Decision Engine finalizes
 */

import { calcDeposit } from '../utils';
import { TRUST_SCORE } from '../constants';
import { isPremiumPrivilegeActive } from '../deposit-policy';

/**
 * @param {object} ctx
 */
export function computeDeposit(ctx) {
  const trust = ctx.trustScore ?? 0;
  const risk = ctx.riskScore ?? 0;
  const assetValue = ctx.listing?.marketValue ?? 0;
  const days = ctx.rentalContext?.days ?? 1;
  const category = ctx.listing?.category ?? 'default';
  const hasInsurance = ctx.rentalContext?.relooCarePlan !== 'none';

  const renter = ctx.renter ?? ctx.user ?? null;
  const isPremium = isPremiumPrivilegeActive(renter?.depositPrivilege);
  const floorRate = isPremium ? 0 : TRUST_SCORE.standardMinDepositRate;

  const baseDeposit = calcDeposit(trust, assetValue, { user: renter });
  let dynamicRate = assetValue > 0 ? baseDeposit / assetValue : 0;

  if (risk > 60) dynamicRate = Math.min(1, dynamicRate + 0.15);
  if (risk > 80) dynamicRate = Math.min(1, dynamicRate + 0.1);
  if (days > 14) dynamicRate = Math.max(floorRate, dynamicRate - 0.05);
  if (hasInsurance) dynamicRate = Math.max(floorRate, dynamicRate - 0.08);

  dynamicRate = Math.max(floorRate, Math.min(1, dynamicRate));

  const highValueCategories = ['may-anh', 'may-quay', 'laptop-pc'];
  if (highValueCategories.includes(category)) {
    dynamicRate = Math.min(1, dynamicRate + 0.05);
  }

  const aiSuggestion = ctx.aiPredictions?.recommendation;
  let aiSuggestedRate = dynamicRate;
  if (aiSuggestion === 'INCREASE_DEPOSIT') aiSuggestedRate = Math.min(1, dynamicRate + 0.1);
  if (aiSuggestion === 'DECREASE_DEPOSIT' && trust > 700) {
    aiSuggestedRate = Math.max(floorRate, dynamicRate - 0.15);
  }

  const ruleBasedAmount = Math.round(assetValue * dynamicRate);
  const aiSuggestedAmount = Math.round(assetValue * aiSuggestedRate);

  return {
    baseDeposit,
    dynamicRate: round4(dynamicRate),
    aiSuggestedRate: round4(aiSuggestedRate),
    ruleBasedAmount,
    aiSuggestedAmount,
    factors: {
      trustScore: trust,
      riskScore: risk,
      assetValue,
      category,
      days,
      hasInsurance,
      escrow: true,
    },
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}
