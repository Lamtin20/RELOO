/**
 * Chronicle Engine — IMMUTABLE append-only event store
 */

import { generateId } from '../utils';
import { CHRONICLE_TYPE } from './constants';
import { assertImmutableOperation } from './rule-engine';

/**
 * @param {object} params
 * @returns {Readonly<object>}
 */
export function createChronicleEntry({
  type = CHRONICLE_TYPE.TRANSACTION,
  entityId,
  userId = null,
  action,
  module = 'trust-platform',
  payload = {},
  beforeState = null,
  afterState = null,
  ruleId = null,
  decisionId = null,
  aiPrediction = null,
}) {
  const entry = Object.freeze({
    chronicleId: generateId('chr'),
    type,
    entityId,
    userId,
    action,
    module,
    payload: Object.freeze({ ...payload }),
    beforeState: beforeState ? Object.freeze(structuredClone(beforeState)) : null,
    afterState: afterState ? Object.freeze(structuredClone(afterState)) : null,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Ho_Chi_Minh',
    ruleId,
    decisionId,
    aiPrediction,
  });

  return entry;
}

/**
 * Append-only — rejects update/delete (R009)
 * @param {object[]} chronicle
 * @param {object} entry
 */
export function appendChronicle(chronicle, entry) {
  assertImmutableOperation('INSERT_CHRONICLE');
  return [...(chronicle ?? []), entry];
}

/**
 * @param {object[]} chronicle
 * @param {object} filters
 */
export function queryChronicle(chronicle, filters = {}) {
  let result = [...(chronicle ?? [])];
  if (filters.type) result = result.filter((c) => c.type === filters.type);
  if (filters.entityId) result = result.filter((c) => c.entityId === filters.entityId);
  if (filters.userId) result = result.filter((c) => c.userId === filters.userId);
  if (filters.decisionId) result = result.filter((c) => c.decisionId === filters.decisionId);
  return result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/** Guard helpers — throw R008/R009 if misused */
export function updateChronicle() {
  assertImmutableOperation('UPDATE_CHRONICLE');
}

export function deleteChronicle() {
  assertImmutableOperation('DELETE_CHRONICLE');
}

export function updateAuditLog() {
  assertImmutableOperation('UPDATE_AUDIT_LOG');
}
