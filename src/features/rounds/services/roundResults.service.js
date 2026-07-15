// src/features/rounds/results/services/roundResults.service.js
import axiosClient from "../../../shared/api/axiosClient";
import {
  mapOfficialRanking,
  mapWildcardCandidates,
} from "../mappers/roundResults.mapper";

export const roundResultsService = {
  getRanking: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/ranking`);
    return mapOfficialRanking(response);
  },

  getTiebreak: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/tiebreak`);
    // Trả về thẳng data thô chứa candidateTeamIds
    return response?.data !== undefined ? response.data : response;
  },

  getWildcardCandidates: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/wildcard-candidates`);
    return mapWildcardCandidates(response);
  },

  decideWildcardReview: (reviewId, { approved, note }) =>
    axiosClient.patch(`/api/v1/wildcard-reviews/${reviewId}`, {
      approved,
      coordinatorNote: note,
    }),

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
};