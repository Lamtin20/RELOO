import { RELOO_CARE_PLANS } from './constants';

/** Trần bồi thường cố định — Rule Engine / chính sách, không override qua CMS */
export const RELOO_CARE_COMPENSATION_CAPS = Object.freeze({
  basic: 1_000_000,
  premium: 3_000_000,
});

/**
 * Trần bồi thường tối đa theo gói (VND)
 */
export function getRelooCareCompensationCap(planId) {
  if (RELOO_CARE_COMPENSATION_CAPS[planId] != null) {
    return RELOO_CARE_COMPENSATION_CAPS[planId];
  }
  return RELOO_CARE_PLANS[planId]?.maxCompensation ?? 0;
}

/**
 * Tính số tiền bồi thường thực tế — áp dụng % gói rồi chặn trần cứng
 */
export function calculateRelooCareCompensation(planId, damageAmount) {
  const plan = RELOO_CARE_PLANS[planId];
  const amount = Number(damageAmount);
  if (!plan || !Number.isFinite(amount) || amount <= 0) return 0;

  const cap = getRelooCareCompensationCap(planId);
  const byRate = Math.round(amount * plan.compensationRate);
  return Math.min(byRate, cap);
}

/**
 * Gộp plan detail với trần bồi thường đã ràng buộc chính sách
 */
export function applyRelooCarePolicy(plan) {
  if (!plan) return null;
  const cap = getRelooCareCompensationCap(plan.id);
  return {
    ...plan,
    maxCompensation: cap,
    compensationCapLabel: `Trần tối đa ${cap.toLocaleString('vi-VN')}₫ (cố định theo chính sách RELOO)`,
  };
}
