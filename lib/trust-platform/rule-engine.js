/**
 * Rule Engine — priority-based evaluation (CRITICAL first)
 */

import { FRAUD_THRESHOLD } from './constants';
import { PLATFORM_RULES } from './rules';
import { validateIdentityForRental, findDuplicateCccd } from './identity-engine';

/**
 * @typedef {object} RuleViolation
 * @property {string} ruleId
 * @property {string} message
 * @property {number} priority
 */

/**
 * @param {object} ctx
 * @param {object} ctx.user
 * @param {object} ctx.listing
 * @param {object} ctx.identityProfile
 * @param {object[]} ctx.identityProfiles
 * @param {object[]} ctx.orders
 * @param {number} ctx.fraudScore
 * @returns {{ passed: boolean, violations: RuleViolation[], criticalBlocked: boolean }}
 */
export function evaluateRules(ctx) {
  const violations = [];

  const identity = validateIdentityForRental(ctx.identityProfile);

  if (!identity.valid) {
    if (!ctx.identityProfile?.checks?.cccd || !ctx.identityProfile?.checks?.faceMatch) {
      violations.push({
        ruleId: 'R001',
        message: 'Chưa hoàn thành CCCD và Face Match.',
        priority: 4,
      });
    }
    violations.push({
      ruleId: 'R003',
      message: 'Identity chưa VERIFIED — không được tạo giao dịch thuê.',
      priority: 4,
    });
  }

  const dup = findDuplicateCccd(
    ctx.identityProfiles ?? [],
    ctx.identityProfile?.cccdHash,
    ctx.user?.id
  );
  if (dup) {
    violations.push({
      ruleId: 'R002',
      message: 'CCCD đã được sử dụng bởi tài khoản khác.',
      priority: 4,
    });
  }

  if (ctx.listing?.isLocked) {
    violations.push({
      ruleId: 'R004',
      message: 'Tài sản đang bị khóa.',
      priority: 4,
    });
  }

  if (ctx.listing?.disputeStatus === 'active' || ctx.listing?.status === 'disputed') {
    violations.push({
      ruleId: 'R005',
      message: 'Tài sản đang trong tranh chấp.',
      priority: 4,
    });
  }

  const userOrders = (ctx.orders ?? []).filter((o) => o.renterId === ctx.user?.id);
  const seriousDispute = userOrders.some(
    (o) => o.status === 'disputed' || o.status === 'overdue' || o.status === 'risk'
  );
  if (seriousDispute) {
    violations.push({
      ruleId: 'R006',
      message: 'Người dùng có giao dịch dispute/overdue nghiêm trọng.',
      priority: 4,
    });
  }

  const fraudScore = ctx.fraudScore ?? 0;
  if (fraudScore >= FRAUD_THRESHOLD) {
    violations.push({
      ruleId: 'R007',
      message: `Fraud Score ${fraudScore} vượt ngưỡng ${FRAUD_THRESHOLD}.`,
      priority: 4,
    });
  }

  violations.sort((a, b) => b.priority - a.priority);

  const criticalBlocked = violations.some((v) =>
    PLATFORM_RULES.find((r) => r.id === v.ruleId && r.priority === 4)
  );

  return {
    passed: violations.length === 0,
    violations,
    criticalBlocked,
  };
}

/**
 * R008/R009 — runtime guard (call before mutating chronicle/audit)
 */
export function assertImmutableOperation(operation) {
  if (operation === 'UPDATE_CHRONICLE' || operation === 'DELETE_CHRONICLE') {
    const err = new Error('R009: Chronicle is immutable — INSERT only.');
    err.ruleId = 'R009';
    throw err;
  }
  if (operation === 'UPDATE_AUDIT_LOG') {
    const err = new Error('R008: Audit Log cannot be modified.');
    err.ruleId = 'R008';
    throw err;
  }
}
