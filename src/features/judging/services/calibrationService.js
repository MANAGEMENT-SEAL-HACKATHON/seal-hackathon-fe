// src/features/judging/services/calibrationService.js
import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';
import { buildCalibrationQueryParams } from './calibrationQueryParams.js';

export { buildCalibrationQueryParams } from './calibrationQueryParams.js';

export const calibrationService = {
  listByRound: (roundId, trackId) =>
    axiosClient.get(ENDPOINTS.CALIBRATION.BASE, {
      params: buildCalibrationQueryParams(roundId, trackId),
    }),

  /** Judge đã assign: read-only list (optional trackId for GĐ3) */
  listForJudge: (roundId, trackId) =>
    axiosClient.get(ENDPOINTS.JUDGE.CALIBRATION_SESSIONS, {
      params: buildCalibrationQueryParams(roundId, trackId),
    }),

  create: (payload) =>
    axiosClient.post(ENDPOINTS.CALIBRATION.BASE, payload),

  update: (id, payload) =>
    axiosClient.patch(ENDPOINTS.CALIBRATION.DETAIL(id), payload),
};
