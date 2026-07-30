// src/features/rounds/results/services/roundResults.service.js
import axiosClient from "../../../shared/api/axiosClient";
import { mapOfficialRanking } from "../mappers/roundResults.mapper";

export const roundResultsService = {
  getRanking: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/ranking`);
    return mapOfficialRanking(response);
  },

  // Preview xếp hạng khi CHƯA khóa chấm — phục vụ tab Kiểm tra chấm lúc đang chấm.
  getRankingPreview: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/ranking/preview`);
    return mapOfficialRanking(response);
  },

  getTiebreak: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/tiebreak`);
    // Trả về thẳng data thô chứa candidateTeamIds
    return response?.data !== undefined ? response.data : response;
  },

  publishRound: (roundId) =>
    axiosClient.patch(`/api/v1/rounds/${roundId}/publish`),

  advanceTeams: (roundId, payload) =>
    axiosClient.post(`/api/v1/rounds/${roundId}/advance`, payload),

  resolveTiebreak: (roundId, payload) =>
    axiosClient.post(`/api/v1/rounds/${roundId}/tiebreak/resolve`, payload),

  getAdvanceRoster: async (roundId, { page = 0, size = 50 } = {}) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/advance-roster`, {
      params: { page, size },
    });
    const raw = response?.data !== undefined ? response.data : response;
    return {
      items: Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [],
      page: raw?.page ?? page,
      size: raw?.size ?? size,
      totalElements: raw?.totalElements ?? raw?.total_elements ?? 0,
      totalPages: raw?.totalPages ?? raw?.total_pages ?? 0,
    };
  },

  getScoreBreakdown: async (roundId, submissionId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/score-breakdown`, {
      params: { submissionId },
    });
    return response?.data !== undefined ? response.data : response;
  },

  /** A1 — không trackId = summary; có trackId = ma trận track (CK dùng 0). */
  getScoreBreakdownAll: async (roundId, trackId) => {
    const params = {};
    if (trackId != null && trackId !== "") params.trackId = trackId;
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/score-breakdown-all`, {
      params,
    });
    return response?.data !== undefined ? response.data : response;
  },
};
