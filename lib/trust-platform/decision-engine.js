/**
 * Decision Engine — orchestrates all engines (RULE FIRST, AI SECOND)
 */

import { generateId } from '../utils';
import { DECISION_OUTCOME, CHRONICLE_TYPE, RISK_THRESHOLD_BLOCK } from './constants';
import { evaluateRules } from './rule-engine';
import { findDuplicateCccd } from './identity-engine';
import { computeTrustScore } from './trust-engine';
import { computeFraudScore } from './fraud-engine';
import { computeRiskScore } from './risk-engine';
import { getAiPredictions } from './ai-engine';
import { computeDeposit } from './deposit-engine';
import { createChronicleEntry } from './chronicle';

/**
 * @param {object} ctx — full platform context
 * @returns {object} decision record
 */
export function evaluateRentalDecision(ctx) {
  const decisionId = generateId('dec');
  const timestamp = new Date().toISOString();

  const duplicateCccd = findDuplicateCccd(
    ctx.identityProfiles ?? [],
    ctx.identityProfile?.cccdHash,
    ctx.user?.id
  );

  const trustResult = computeTrustScore(ctx);
  const enrichedCtx = {
    ...ctx,
    trustScore: trustResult.score,
    duplicateCccd,
  };

  const fraudResult = computeFraudScore({ ...enrichedCtx, fraudScore: 0 });
  enrichedCtx.fraudScore = fraudResult.score;

  const { predictions, explainableLog } = getAiPredictions(enrichedCtx);
  enrichedCtx.aiPredictions = predictions;

  const riskResult = computeRiskScore(enrichedCtx);
  enrichedCtx.riskScore = riskResult.score;

  const depositResult = computeDeposit(enrichedCtx);
  const ruleResult = evaluateRules(enrichedCtx);

  let outcome = DECISION_OUTCOME.APPROVE;
  let finalDeposit = depositResult.ruleBasedAmount;
  const reasons = [];

  if (ruleResult.criticalBlocked) {
    outcome = DECISION_OUTCOME.REJECT;
    reasons.push(...ruleResult.violations.map((v) => `[${v.ruleId}] ${v.message}`));
  } else if (enrichedCtx.identityProfile?.status !== 'VERIFIED') {
    outcome = DECISION_OUTCOME.NEED_MORE_VERIFICATION;
    reasons.push('Identity chưa VERIFIED.');
  } else if (riskResult.score >= RISK_THRESHOLD_BLOCK) {
    outcome = DECISION_OUTCOME.MANUAL_REVIEW;
    reasons.push(`Risk Score ${riskResult.score} cần duyệt thủ công.`);
  } else if (predictions.fraudProbability > 0.55) {
    outcome = DECISION_OUTCOME.MANUAL_REVIEW;
    reasons.push('AI fraud probability cao — chuyển Manual Review.');
  } else if (predictions.recommendation === 'INCREASE_DEPOSIT') {
    outcome = DECISION_OUTCOME.INCREASE_DEPOSIT;
    finalDeposit = depositResult.aiSuggestedAmount;
    reasons.push('Tăng cọc theo Risk + AI suggestion.');
  } else if (predictions.recommendation === 'DECREASE_DEPOSIT' && trustResult.score > 800) {
    outcome = DECISION_OUTCOME.DECREASE_DEPOSIT;
    finalDeposit = depositResult.aiSuggestedAmount;
    reasons.push('Giảm cọc theo Trust cao + AI suggestion.');
  } else {
    reasons.push('Rule Engine pass — cho phép thuê.');
  }

  const decision = {
    decisionId,
    timestamp,
    outcome,
    reasons,
    scores: {
      trust: trustResult.score,
      risk: riskResult.score,
      fraud: fraudResult.score,
      identity: enrichedCtx.identityProfile?.status,
    },
    deposit: {
      final: finalDeposit,
      ...depositResult,
    },
    ruleEvaluation: ruleResult,
    trustBreakdown: trustResult,
    riskBreakdown: riskResult,
    fraudSignals: fraudResult.signals,
    aiExplainableLog: explainableLog,
    aiPredictions: predictions,
    entityType: 'rental',
    entityId: ctx.listing?.id,
    userId: ctx.user?.id,
  };

  const chronicleEntry = createChronicleEntry({
    type: CHRONICLE_TYPE.RULE,
    entityId: ctx.listing?.id,
    userId: ctx.user?.id,
    action: `DECISION_${outcome}`,
    module: 'decision-engine',
    payload: { decisionId, outcome, reasons },
    beforeState: { listingStatus: ctx.listing?.status },
    afterState: { outcome, finalDeposit },
    decisionId,
    aiPrediction: predictions,
  });

  const aiChronicle = createChronicleEntry({
    type: CHRONICLE_TYPE.AI,
    entityId: decisionId,
    userId: ctx.user?.id,
    action: 'AI_PREDICTION',
    module: 'ai-engine',
    payload: explainableLog,
    decisionId,
    aiPrediction: predictions,
  });

  return {
    ...decision,
    chronicleEntries: [chronicleEntry, aiChronicle],
  };
}

/**
 * Build context từ RELOO store state
 */
export function buildRentalContext(state, payload) {
  const { listingId, renterId, days, relooCarePlan } = payload;
  const listing = state.listings?.find((l) => l.id === listingId);
  const user = state.users?.find((u) => u.id === renterId);
  const identityProfiles = state.identityProfiles ?? [];
  const identityProfile =
    identityProfiles.find((p) => p.userId === renterId) ??
    (user ? identityProfiles.find((p) => p.userId === user.id) : null);

  return {
    user,
    listing,
    identityProfile,
    identityProfiles,
    orders: state.orders ?? [],
    rentalContext: { days, relooCarePlan },
  };
}
