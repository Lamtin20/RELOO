/**
 * Trust Engine — score 0-1000
 */

import { calcTrustScore } from '../utils';
import { TRUST_SCORE_RANGE } from './constants';

/**
 * @param {object} ctx
 * @param {object} ctx.user
 * @param {object} ctx.identityProfile
 * @returns {{ score: number, factors: object, breakdown: string[] }}
 */
export function computeTrustScore(ctx) {
  const user = ctx.user ?? {};
  const base = calcTrustScore(user);
  let bonus = 0;
  const breakdown = [`KYC + lịch sử cơ bản: ${base}`];

  if (ctx.identityProfile?.checks?.faceMatch) {
    bonus += 20;
    breakdown.push('Face Match: +20');
  }
  if (user.bankAccount) {
    bonus += 15;
    breakdown.push('Liên kết ngân hàng: +15');
  }
  if (user.address) {
    bonus += 10;
    breakdown.push('Địa chỉ xác minh: +10');
  }
  if (user.isPro) {
    bonus += 25;
    breakdown.push('Super Host / Pro: +25');
  }
  if ((user.totalRentals ?? 0) >= 10 && (user.defaultsScore ?? 0) === 0) {
    bonus += 30;
    breakdown.push('Lịch sử thuê tốt: +30');
  }

  const penalty =
    (user.defaultsScore ?? 0) * 3 +
    (user.disputeCount ?? 0) * 15 +
    (user.chargebackCount ?? 0) * 50;

  if (penalty > 0) breakdown.push(`Trừ điểm vi phạm: -${penalty}`);

  const score = Math.max(
    TRUST_SCORE_RANGE.min,
    Math.min(TRUST_SCORE_RANGE.max, Math.round(base + bonus - penalty))
  );

  return {
    score,
    factors: {
      kyc: user.kycLevel,
      history: user.historyScore,
      feedback: user.feedbackScore,
      defaults: user.defaultsScore,
      bonus,
      penalty,
    },
    breakdown,
  };
}
