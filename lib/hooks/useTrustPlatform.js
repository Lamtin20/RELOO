'use client';

import { useCallback, useMemo } from 'react';
import { useReloo, ActionTypes } from '../store';
import {
  evaluateRentalDecision,
  buildRentalContext,
  createBehaviorLog,
  appendBehaviorLog,
  appendChronicle,
  captureReplayEvent,
  appendReplayEvent,
  BEHAVIOR_ACTIONS,
  REPLAY_EVENT_TYPE,
} from '../trust-platform';

/**
 * Hook truy cập Trust Platform từ UI
 */
export function useTrustPlatform() {
  const { state, dispatch } = useReloo();

  const evaluateRental = useCallback(
    (payload) => {
      const ctx = buildRentalContext(state, payload);
      return evaluateRentalDecision(ctx);
    },
    [state]
  );

  const logBehavior = useCallback(
    (params) => {
      const entry = createBehaviorLog({
        userId: state.user?.id ?? params.userId,
        ...params,
      });
      dispatch({ type: ActionTypes.LOG_BEHAVIOR, payload: { entry } });
      return entry;
    },
    [dispatch, state.user?.id]
  );

  const captureReplay = useCallback(
    (params) => {
      dispatch({
        type: ActionTypes.CAPTURE_REPLAY,
        payload: {
          event: captureReplayEvent({
            sessionId: params.sessionId,
            userId: state.user?.id,
            ...params,
          }),
        },
      });
    },
    [dispatch, state.user?.id]
  );

  const identityProfile = useMemo(() => {
    if (!state.user) return null;
    return (state.identityProfiles ?? []).find((p) => p.userId === state.user.id);
  }, [state.identityProfiles, state.user]);

  return {
    chronicle: state.chronicle ?? [],
    behaviorLogs: state.behaviorLogs ?? [],
    decisionLogs: state.decisionLogs ?? [],
    identityProfiles: state.identityProfiles ?? [],
    identityProfile,
    sessionReplays: state.sessionReplays ?? {},
    evaluateRental,
    logBehavior,
    captureReplay,
    BEHAVIOR_ACTIONS,
    REPLAY_EVENT_TYPE,
  };
}

export { evaluateRentalDecision, buildRentalContext };
