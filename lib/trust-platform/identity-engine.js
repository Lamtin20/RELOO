/**
 * Identity Engine — eKYC gate for rental transactions
 */

import { IDENTITY_CHECKS, IDENTITY_STATUS } from './constants';

/**
 * @param {object} profile — identity_profiles record
 * @returns {import('./constants').IDENTITY_STATUS[keyof import('./constants').IDENTITY_STATUS]}
 */
export function resolveIdentityStatus(profile) {
  if (!profile) return IDENTITY_STATUS.UNVERIFIED;
  if (profile.status === IDENTITY_STATUS.REJECTED) return IDENTITY_STATUS.REJECTED;
  if (profile.status === IDENTITY_STATUS.PENDING) return IDENTITY_STATUS.PENDING;

  const checks = profile.checks ?? {};
  const allPassed = IDENTITY_CHECKS.every((key) => checks[key] === true);

  return allPassed ? IDENTITY_STATUS.VERIFIED : IDENTITY_STATUS.UNVERIFIED;
}

/**
 * @param {object} profile
 * @returns {{ valid: boolean, missing: string[], status: string }}
 */
export function validateIdentityForRental(profile) {
  const status = resolveIdentityStatus(profile);
  const checks = profile?.checks ?? {};
  const missing = IDENTITY_CHECKS.filter((key) => !checks[key]);

  return {
    valid: status === IDENTITY_STATUS.VERIFIED,
    missing,
    status,
  };
}

/**
 * Build profile từ user demo (kycLevel → checks)
 * @param {object} user
 * @returns {object}
 */
export function buildIdentityProfileFromUser(user) {
  if (!user) return null;

  const kycVerified = user.kycLevel === 'L2' || user.kycLevel === 'L3';
  const emailOk = !!user.email;
  const phoneOk = !!user.phone;

  const checks = {
    email: emailOk,
    phone: phoneOk,
    cccd: kycVerified,
    ocrCccd: kycVerified,
    faceMatch: kycVerified,
  };

  const status = resolveIdentityStatus({ checks, status: user.identityStatus });

  return {
    userId: user.id,
    status,
    checks,
    cccdHash: kycVerified ? `cccd_hash_${user.id}` : null,
    cccdNumberMasked: kycVerified ? `***${String(user.phone).slice(-4)}` : null,
    verifiedAt: status === IDENTITY_STATUS.VERIFIED ? user.joinedAt : null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * @param {object[]} profiles
 * @param {string} cccdHash
 * @param {string} excludeUserId
 */
export function findDuplicateCccd(profiles, cccdHash, excludeUserId) {
  if (!cccdHash) return null;
  return (
    profiles.find(
      (p) =>
        p.cccdHash === cccdHash &&
        p.userId !== excludeUserId &&
        p.status !== IDENTITY_STATUS.REJECTED
    ) ?? null
  );
}

/**
 * @param {object} profile
 * @param {object} updates — partial checks (e.g. after eKYC step)
 */
export function mergeIdentityChecks(profile, updates) {
  const base = profile ?? { checks: {} };
  const checks = { ...base.checks, ...updates };
  const status = resolveIdentityStatus({ ...base, checks });
  return {
    ...base,
    checks,
    status,
    updatedAt: new Date().toISOString(),
    verifiedAt: status === IDENTITY_STATUS.VERIFIED ? new Date().toISOString() : base.verifiedAt,
  };
}
