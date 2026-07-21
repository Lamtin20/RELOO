/**
 * Behavior Logger — full user action trail
 */

import { generateId } from '../utils';

/**
 * @param {object} params
 */
export function createBehaviorLog({
  userId = null,
  sessionId = null,
  deviceId = null,
  assetId = null,
  transactionId = null,
  action,
  module = 'app',
  screen = null,
  oldValue = null,
  newValue = null,
  beforeState = null,
  afterState = null,
  metadata = {},
  scores = {},
  decisionId = null,
  ruleId = null,
  aiPrediction = null,
}) {
  return Object.freeze({
    logId: generateId('blog'),
    eventId: generateId('evt'),
    userId,
    sessionId: sessionId ?? getSessionId(),
    deviceId: deviceId ?? getDeviceId(),
    assetId,
    transactionId,
    action,
    module,
    screen,
    oldValue,
    newValue,
    beforeState,
    afterState,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Ho_Chi_Minh',
    gps: metadata.gps ?? null,
    latitude: metadata.latitude ?? null,
    longitude: metadata.longitude ?? null,
    ip: metadata.ip ?? null,
    browser: metadata.browser ?? getBrowserInfo(),
    os: metadata.os ?? null,
    device: metadata.device ?? null,
    network: metadata.network ?? null,
    battery: metadata.battery ?? null,
    language: metadata.language ?? (typeof navigator !== 'undefined' ? navigator.language : 'vi'),
    country: metadata.country ?? 'VN',
    trustScore: scores.trust ?? null,
    riskScore: scores.risk ?? null,
    fraudScore: scores.fraud ?? null,
    identityScore: scores.identity ?? null,
    behaviorScore: scores.behavior ?? null,
    decisionId,
    ruleId,
    aiPrediction,
  });
}

export function appendBehaviorLog(logs, entry) {
  return [...(logs ?? []), entry];
}

function getSessionId() {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = sessionStorage.getItem('reloo_session_id');
    if (!id) {
      id = generateId('sess');
      sessionStorage.setItem('reloo_session_id', id);
    }
    return id;
  } catch {
    return generateId('sess');
  }
}

function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem('reloo_device_id');
    if (!id) {
      id = generateId('dev');
      localStorage.setItem('reloo_device_id', id);
    }
    return id;
  } catch {
    return generateId('dev');
  }
}

function getBrowserInfo() {
  if (typeof navigator === 'undefined') return null;
  return navigator.userAgent?.slice(0, 120) ?? null;
}
