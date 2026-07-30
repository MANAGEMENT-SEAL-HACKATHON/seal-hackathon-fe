import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const appealWindowService = {
  getStatus: (roundId) => axiosClient.get(ENDPOINTS.ROUNDS.APPEAL_WINDOW(roundId)),

  publishPreflight: (roundId) => axiosClient.get(ENDPOINTS.ROUNDS.PUBLISH_PREFLIGHT(roundId)),

  closeEarly: (roundId) => axiosClient.post(ENDPOINTS.ROUNDS.APPEAL_WINDOW_CLOSE(roundId)),

  republish: (roundId) => axiosClient.post(ENDPOINTS.ROUNDS.REPUBLISH(roundId)),

  previewDelay: (roundId, minutes) =>
    axiosClient.post(ENDPOINTS.ROUNDS.APPEAL_DELAY_PREVIEW(roundId), { minutes: Number(minutes) }),

  applyDelay: (roundId, minutes) =>
    axiosClient.post(ENDPOINTS.ROUNDS.APPEAL_DELAY(roundId), { minutes: Number(minutes) }),
};
