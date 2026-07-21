/**
 * Fraud Engine — score 0-100
 */

/**
 * @param {object} ctx
 */
export function computeFraudScore(ctx) {
  let score = 0;
  const signals = [];

  const user = ctx.user ?? {};
  const profile = ctx.identityProfile;

  if (!profile?.checks?.faceMatch) {
    score += 25;
    signals.push('Chưa Face Match');
  }
  if (!profile?.checks?.ocrCccd) {
    score += 20;
    signals.push('Chưa OCR CCCD');
  }
  if ((user.defaultsScore ?? 0) > 20) {
    score += 15;
    signals.push('Lịch sử vi phạm');
  }
  if (ctx.duplicateCccd) {
    score += 40;
    signals.push('CCCD trùng tài khoản khác');
  }

  const assetValue = ctx.listing?.marketValue ?? 0;
  const trust = ctx.trustScore ?? 0;
  if (assetValue > 10_000_000 && trust < 500) {
    score += 20;
    signals.push('Thuê tài sản cao cấp với Trust thấp');
  }

  if (ctx.aiPredictions?.fraudProbability) {
    score += Math.round(ctx.aiPredictions.fraudProbability * 30);
    signals.push('AI fraud signal');
  }

  score = Math.min(100, score);

  return { score, signals };
}
