// src/features/judging/services/presentationService.js
import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const SCORING_OPEN_TIMER_PHASES = ['PRESENTING', 'QA', 'PAUSED', 'ENDED'];

const timerParams = (roundId, trackId) => {
  const params = { roundId };
  if (trackId) {
    params.trackId = trackId;
  }
  return { params };
};

export const presentationService = {
  getQueue: (roundId, trackId) =>
    axiosClient.get(ENDPOINTS.PRESENTATION.QUEUE, {
      params: { roundId, ...(trackId ? { trackId } : {}) },
    }),

  startTimer: (roundId, trackId) =>
    axiosClient.post(ENDPOINTS.PRESENTATION.TIMER_START, null, timerParams(roundId, trackId)),

  pauseTimer: (roundId, trackId) =>
    axiosClient.post(ENDPOINTS.PRESENTATION.TIMER_PAUSE, null, timerParams(roundId, trackId)),

  resumeTimer: (roundId, trackId) =>
    axiosClient.post(ENDPOINTS.PRESENTATION.TIMER_RESUME, null, timerParams(roundId, trackId)),

  qaTimer: (roundId, trackId) =>
    axiosClient.post(ENDPOINTS.PRESENTATION.TIMER_QA, null, timerParams(roundId, trackId)),

  resetTimer: (roundId, trackId) =>
    axiosClient.post(ENDPOINTS.PRESENTATION.TIMER_RESET, null, timerParams(roundId, trackId)),

  shuffle: (roundId, trackIds) =>
    axiosClient.post(ENDPOINTS.PRESENTATION.QUEUE_SHUFFLE, { roundId, trackIds }),

  advanceNext: (roundId, trackId, body = {}) =>
    axiosClient.patch(ENDPOINTS.PRESENTATION.QUEUE_NEXT, body, {
      params: { roundId, ...(trackId ? { trackId } : {}) },
    }),

  getTrackController: (trackId) =>
    axiosClient.get(ENDPOINTS.PRESENTATION.TRACK_CONTROLLER(trackId)),

  setTrackController: (trackId, judgeId) =>
    axiosClient.put(ENDPOINTS.PRESENTATION.TRACK_CONTROLLER(trackId), { judgeId }),

  getRoundController: (roundId) =>
    axiosClient.get(ENDPOINTS.PRESENTATION.ROUND_CONTROLLER(roundId)),

  setRoundController: (roundId, judgeId) =>
    axiosClient.put(ENDPOINTS.PRESENTATION.ROUND_CONTROLLER(roundId), { judgeId }),

  listTrackJudges: (trackId) =>
    axiosClient.get(`/api/v1/tracks/${trackId}/judges`),

  listRoundJudges: (roundId) =>
    axiosClient.get(`/api/v1/rounds/${roundId}/judges`),

  getDuration: (roundId, trackId) =>
    axiosClient.get(ENDPOINTS.PRESENTATION.DURATION, {
      params: { roundId, ...(trackId ? { trackId } : {}) },
    }),

  updateDuration: ({ roundId, presentationMinutes, qaMinutes, trackId }) =>
    axiosClient.put(ENDPOINTS.PRESENTATION.DURATION, {
      roundId,
      presentationMinutes,
      qaMinutes,
      ...(trackId ? { trackId } : {}),
    }),

  clearTrackOverride: (roundId, trackId) =>
    axiosClient.delete(ENDPOINTS.PRESENTATION.DURATION, {
      params: { roundId, trackId },
    }),
};

export const findPresentingItem = (queueData, trackId) => {
  const tracks = queueData?.tracks || [];
  const track = trackId
    ? tracks.find((t) => t.trackId === trackId)
    : tracks[0];

  if (!track) {
    return { trackQueue: null, presentingItem: null };
  }

  const presentingItem =
    track.items?.find((item) => item.status === 'PRESENTING') || null;

  return { trackQueue: track, presentingItem };
};
