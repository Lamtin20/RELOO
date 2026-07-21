import { TRUST_SCORE } from './constants';

/** Khách cao cấp được xét duyệt định kỳ — mới giảm cọc sâu hơn 25% */
export const DEPOSIT_PRIVILEGE_STATUS = {
  STANDARD: 'standard',
  PREMIUM_REVIEW: 'premium_review',
  PREMIUM_APPROVED: 'premium_approved',
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function isPremiumPrivilegeActive(privilege) {
  if (!privilege || privilege.status !== DEPOSIT_PRIVILEGE_STATUS.PREMIUM_APPROVED) {
    return false;
  }
  if (!privilege.approvedUntil) return true;
  return new Date(privilege.approvedUntil).getTime() > Date.now();
}

/**
 * Tỷ lệ cọc bắt buộc (0–1)
 * - Chuẩn: giảm tối đa 25% → cọc tối thiểu 75%
 * - Cao cấp + xét duyệt định kỳ: giảm dần theo tier nội bộ
 */
export function resolveDepositRate(user, trustScore) {
  const score = trustScore ?? user?.trustScore ?? 0;
  const privilege = user?.depositPrivilege;

  if (isPremiumPrivilegeActive(privilege)) {
    const tier =
      TRUST_SCORE.premiumDepositTiers.find((t) => score >= t.minScore) ??
      TRUST_SCORE.premiumDepositTiers[TRUST_SCORE.premiumDepositTiers.length - 1];
    const levelStep = clamp(privilege.level ?? 0, 0, 3) * 0.05;
    return clamp(tier.rate - levelStep, 0, 1);
  }

  if (score >= 700) return TRUST_SCORE.standardMinDepositRate;
  if (score >= 600) return 0.85;
  if (score >= 500) return 0.9;
  return 1;
}

export function calcDepositForUser(user, assetValue, trustScore) {
  if (!assetValue || assetValue <= 0) return 0;
  const rate = resolveDepositRate(user, trustScore);
  return Math.round(assetValue * rate);
}
