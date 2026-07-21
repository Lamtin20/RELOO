/**
 * Session Replay — capture & timeline playback
 */

import { generateId } from '../utils';
import { REPLAY_EVENT_TYPE } from './constants';

/**
 * @param {object} params
 */
export function captureReplayEvent({
  sessionId,
  userId = null,
  type,
  screen = null,
  target = null,
  value = null,
  coordinates = null,
  metadata = {},
}) {
  return Object.freeze({
    replayEventId: generateId('rpl'),
    sessionId,
    userId,
    type,
    screen,
    target,
    value,
    coordinates,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

export function appendReplayEvent(replays, sessionId, event) {
  const sessions = { ...(replays ?? {}) };
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      sessionId,
      userId: event.userId,
      startedAt: event.timestamp,
      events: [],
    };
  }
  sessions[sessionId] = {
    ...sessions[sessionId],
    events: [...sessions[sessionId].events, event],
    lastEventAt: event.timestamp,
  };
  return sessions;
}

/**
 * @param {object} replays
 * @param {string} sessionId
 */
export function getReplayTimeline(replays, sessionId) {
  const session = replays?.[sessionId];
  if (!session) return { sessionId, events: [], durationMs: 0 };
  const events = [...session.events].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const durationMs =
    events.length >= 2
      ? new Date(events[events.length - 1].timestamp) - new Date(events[0].timestamp)
      : 0;
  return { ...session, events, durationMs };
}

export { REPLAY_EVENT_TYPE };
