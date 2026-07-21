/**
 * AI Engine — suggestions ONLY (R010: never decide)
 */

import { generateId } from '../utils';

/**
 * @param {object} ctx
 * @returns {{ predictions: object, explainableLog: object }}
 */
export function getAiPredictions(ctx) {
  const trust = ctx.trustScore ?? 500;
  const risk = ctx.riskScore ?? 30;
  const assetValue = ctx.listing?.marketValue ?? 0;
  const days = ctx.rentalContext?.days ?? 1;

  const fraudProbability = Math.min(0.95, (risk / 100) * 0.6 + (assetValue > 15_000_000 ? 0.15 : 0));
  const lateReturnProbability = Math.min(0.9, (100 - trust / 10) / 100 + days * 0.02);
  const disputeProbability = Math.min(0.85, (ctx.fraudScore ?? 0) / 120);
  const identityRisk = ctx.identityProfile?.status === 'VERIFIED' ? 0.08 : 0.65;
  const rentalRisk = Math.min(0.9, risk / 100);
  const assetRisk = Math.min(0.9, assetValue / 50_000_000);

  const predictions = {
    fraudProbability: round4(fraudProbability),
    lateReturnProbability: round4(lateReturnProbability),
    disputeProbability: round4(disputeProbability),
    identityRisk: round4(identityRisk),
    rentalRisk: round4(rentalRisk),
    assetRisk: round4(assetRisk),
    recommendation:
      fraudProbability > 0.5
        ? 'MANUAL_REVIEW'
        : lateReturnProbability > 0.4
          ? 'INCREASE_DEPOSIT'
          : trust > 800
            ? 'DECREASE_DEPOSIT'
            : 'APPROVE',
  };

  const explainableLog = {
    aiLogId: generateId('ailog'),
    model: 'reloo-risk-v1-demo',
    modelVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: {
      trustScore: trust,
      riskScore: risk,
      assetValue,
      days,
      identityStatus: ctx.identityProfile?.status,
    },
    outputs: predictions,
    featureRefs: ['trust_score', 'risk_score', 'asset_value', 'rental_duration'],
    humanReadable: [
      `Fraud probability: ${(predictions.fraudProbability * 100).toFixed(1)}%`,
      `Late return probability: ${(predictions.lateReturnProbability * 100).toFixed(1)}%`,
      `AI recommendation (non-binding): ${predictions.recommendation}`,
    ],
  };

  return { predictions, explainableLog };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}
